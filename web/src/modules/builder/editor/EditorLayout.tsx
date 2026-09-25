import React, { useState } from 'react';

import DataHeaders from './components/EditHeaders';
import EditSection from './components/EditSection';
import ErrorBoundary from '@/helpers/common/components/ErrorBoundary';
import { OutlinedButton } from '@/helpers/common/atoms/Buttons';
import { headers } from '@/helpers/constants/editor-data';
import { resetResumeStore } from '@/stores/useResumeStore';
import CustomSectionLayout from './modules/custom/CustomSectionLayout';
import { useCustomSectionsStore } from '@/stores/customSections';

import TailorLayout from './modules/tailor/TailorLayout';
import { useActiveSectionStore } from '@/stores/useActiveSectionStore';

const ConfirmationBox = ({
  handleModalCloseAction,
  handleModalConfirmation,
}: {
  handleModalConfirmation: () => void;
  handleModalCloseAction: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-[#161c30] border border-indigo-500/30 w-84 p-6 rounded-xl shadow-2xl relative animate-[fadeIn_.2s]">
        <h2 className="text-lg font-bold text-white mb-2">Reset All Changes</h2>
        <p className="text-slate-300 text-sm mb-5">
          Are you sure you want to reset all resume data? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleModalCloseAction}
            className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleModalConfirmation}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
};

const EditorLayout = () => {
  const link = useActiveSectionStore((state) => state.activeSection);
  const setLink = useActiveSectionStore((state) => state.setActiveSection);
  const [shouldOpenModal, setShouldOpenModal] = useState(false);

  const customSections = useCustomSectionsStore((state) => state.customSections);
  const sectionTitles = useCustomSectionsStore((state) => state.sectionTitles);

  const customSec = customSections.find((cs) => cs.id === link);

  const section =
    link === 'tailor'
      ? {
          title: 'Tailor Resume',
          component: TailorLayout,
        }
      : headers[link]
      ? {
          title: sectionTitles[link] || headers[link].title,
          component: headers[link].component,
        }
      : customSec
      ? {
          title: customSec.title,
          component: () => (
            <CustomSectionLayout sectionId={link} onDelete={() => setLink('')} />
          ),
        }
      : null;

  const linkClickHandler = (link: string) => {
    setLink(link);
  };

  const confirmationModalHandler = () => {
    setShouldOpenModal((prev) => !prev);
  };

  const handleConfirmationAction = () => {
    resetResumeStore();
    useCustomSectionsStore.getState().resetAll();
    confirmationModalHandler();
  };

  const displayElement = link && section ? (
    <EditSection section={section} sectionKey={link} onLinkClick={linkClickHandler} />
  ) : (
    <DataHeaders onLinkClick={linkClickHandler} />
  );

  return (
    <ErrorBoundary>
      <div className="bg-[#0f1424] h-full text-slate-100 p-5 overflow-auto relative no-scrollbar border-l border-indigo-500/15">
        {displayElement}

        <div className="mt-8 pt-4 border-t border-indigo-500/15">
          <button
            onClick={confirmationModalHandler}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/40 bg-slate-900/40 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset all edits
          </button>
        </div>
      </div>
      {shouldOpenModal && (
        <ConfirmationBox
          handleModalCloseAction={confirmationModalHandler}
          handleModalConfirmation={handleConfirmationAction}
        />
      )}
    </ErrorBoundary>
  );
};

export default EditorLayout;
