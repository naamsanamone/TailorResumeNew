import { useCallback, useRef, useState } from 'react';
import { AVAILABLE_TEMPLATES } from '@/helpers/constants';
import { useTemplates } from '@/stores/useTemplate';
import { parseResumeFile } from '@/services/api';
import { applyParsedSections } from '../applyParsedSections';
import Image from '@/helpers/common/components/Image';

type UploadStep = 'idle' | 'select-template' | 'uploading' | 'extracting' | 'structuring' | 'done' | 'error';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: 'Drop your resume here',
  'select-template': 'Select a template',
  uploading: 'Uploading resume...',
  extracting: 'Extracting text...',
  structuring: 'Structuring with AI...',
  done: 'Resume loaded!',
  error: 'Upload failed',
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

interface ResumeUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResumeUploadModal({ open, onClose, onSuccess }: ResumeUploadModalProps) {
  const [step, setStep] = useState<UploadStep>('idle');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('idle');
    setError('');
    setSelectedFile(null);
    setSelectedTemplate('');
    setIsDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return 'Only PDF and DOCX files are supported.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Maximum size is 10MB.';
    }
    return null;
  };

  const handleFileSelected = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      setStep('error');
      return;
    }
    setSelectedFile(file);
    setError('');
    setStep('select-template');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
      e.target.value = '';
    },
    [handleFileSelected]
  );

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
  }, []);

  const handleProceed = useCallback(async () => {
    if (!selectedFile || !selectedTemplate) return;

    // Set the template
    useTemplates.getState().setTemplate(AVAILABLE_TEMPLATES[selectedTemplate]);

    try {
      setStep('uploading');
      // Small delay so the user sees the step
      await new Promise((r) => setTimeout(r, 300));

      setStep('extracting');
      await new Promise((r) => setTimeout(r, 300));

      setStep('structuring');
      const sections = await parseResumeFile(selectedFile);

      // Apply parsed sections to stores
      applyParsedSections(sections);

      setStep('done');
      await new Promise((r) => setTimeout(r, 600));
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume');
      setStep('error');
    }
  }, [selectedFile, selectedTemplate, onSuccess, handleClose]);

  if (!open) return null;

  const templateKeys = Object.keys(AVAILABLE_TEMPLATES);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#161c30] border border-indigo-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/15">
          <h2 className="text-xl font-bold text-white">Upload Resume</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: File Upload (Drag & Drop) */}
          {(step === 'idle' || step === 'error') && (
            <div>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-cyan-400 bg-indigo-950/50 shadow-inner'
                    : 'border-indigo-500/30 hover:border-indigo-500/60 bg-[#121727]/80'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-100">
                      Drag & drop your resume here
                    </p>
                    <p className="text-sm text-indigo-400 font-medium mt-1">or click to browse from device</p>
                  </div>
                  <p className="text-xs text-slate-400">PDF or DOCX, max 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              {step === 'error' && error && (
                <div className="mt-3 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 'select-template' && (
            <div>
              <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-emerald-200 font-medium truncate">
                  {selectedFile?.name}
                </span>
                <span className="text-xs text-emerald-400">
                  ({(selectedFile!.size / 1024).toFixed(0)} KB)
                </span>
              </div>

              <p className="text-sm text-slate-300 mb-4">
                Choose a template for your resume. Your uploaded content will be loaded into it.
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[350px] overflow-auto p-1">
                {templateKeys.map((key) => {
                  const t = AVAILABLE_TEMPLATES[key];
                  const isSelected = selectedTemplate === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleTemplateSelect(key)}
                      className={`relative rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/30'
                          : 'border-slate-700/70 hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="aspect-[3/4] relative bg-[#0f1424]">
                        <Image
                          src={t.thumbnail}
                          alt={t.name}
                          fill
                          className="object-cover"
                          sizes="150px"
                        />
                      </div>
                      <div className="p-1.5 bg-[#121727]">
                        <p className="text-xs font-semibold text-slate-200 truncate">{t.name}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full p-0.5 shadow-md">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-5 pt-3 border-t border-indigo-500/15">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedTemplate('');
                    setStep('idle');
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleProceed}
                  disabled={!selectedTemplate}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer ${
                    selectedTemplate
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-md shadow-indigo-500/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Load Resume
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {['uploading', 'extracting', 'structuring', 'done'].includes(step) && (
            <div className="flex flex-col items-center py-8">
              {step !== 'done' ? (
                <div className="w-12 h-12 border-3 border-indigo-500 border-t-cyan-400 rounded-full animate-spin mb-4" />
              ) : (
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <p className="text-lg font-bold text-white">{STEP_LABELS[step]}</p>

              {/* Progress steps */}
              <div className="flex items-center gap-2 mt-6">
                {(['uploading', 'extracting', 'structuring', 'done'] as UploadStep[]).map((s, i) => {
                  const stepOrder = ['uploading', 'extracting', 'structuring', 'done'];
                  const currentIdx = stepOrder.indexOf(step);
                  const thisIdx = i;
                  const isComplete = thisIdx < currentIdx;
                  const isCurrent = thisIdx === currentIdx;

                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full transition-colors ${
                          isComplete
                            ? 'bg-emerald-500'
                            : isCurrent
                              ? 'bg-cyan-400 animate-pulse'
                              : 'bg-slate-700'
                        }`}
                      />
                      {i < 3 && (
                        <div
                          className={`w-8 h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
