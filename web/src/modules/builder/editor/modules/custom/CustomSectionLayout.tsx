import React, { useState } from 'react';
import { RichtextEditor } from '@/helpers/common/components/richtext';
import { useCustomSectionsStore, CustomSection } from '@/stores/customSections';

interface CustomSectionLayoutProps {
  sectionId: string;
  onDelete?: () => void;
}

const CustomSectionLayout: React.FC<CustomSectionLayoutProps> = ({ sectionId, onDelete }) => {
  const section = useCustomSectionsStore((state) =>
    state.customSections.find((s) => s.id === sectionId)
  );
  const updateCustomSection = useCustomSectionsStore((state) => state.updateCustomSection);
  const deleteCustomSection = useCustomSectionsStore((state) => state.deleteCustomSection);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section?.title || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!section) {
    return (
      <div className="p-4 text-gray-500">
        <p>Section not found.</p>
      </div>
    );
  }

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      updateCustomSection(sectionId, { title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDelete = () => {
    deleteCustomSection(sectionId);
    if (onDelete) onDelete();
  };

  return (
    <div className="space-y-4">
      {/* Section Title Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-indigo-500/15">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleInput(section.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="px-2.5 py-1.5 rounded-md text-sm font-semibold text-white bg-[#161c30] border border-indigo-500/40 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleTitleSave}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold rounded-md shadow-sm transition-all cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={() => {
                setTitleInput(section.title);
                setIsEditingTitle(false);
              }}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-100">{section.title}</span>
            <button
              onClick={() => {
                setTitleInput(section.title);
                setIsEditingTitle(true);
              }}
              className="text-xs text-indigo-400 hover:text-cyan-300 font-medium px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
              title="Rename Section"
            >
              Rename
            </button>
          </div>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-red-400 hover:text-red-300 font-medium px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors shrink-0 cursor-pointer"
        >
          Delete Section
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-sm text-red-200 space-y-2">
          <p className="font-semibold text-white">Delete &ldquo;{section.title}&rdquo; section?</p>
          <p className="text-xs text-red-300">This will remove this section from the resume and template.</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-medium rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rich Text Editor */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Section Content
        </h4>
        <RichtextEditor
          label={section.title}
          value={section.content}
          onChange={(htmlOutput) => {
            updateCustomSection(sectionId, { content: htmlOutput });
          }}
          name={`custom-section-${sectionId}`}
        />
      </div>
    </div>
  );
};

export default CustomSectionLayout;
