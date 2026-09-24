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
    <div className="p-4 space-y-4">
      {/* Section Title Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-200">
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
              className="px-2.5 py-1.5 border border-blue-400 rounded-md text-base font-semibold text-gray-800 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTitleSave}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setTitleInput(section.title);
                setIsEditingTitle(false);
              }}
              className="px-2 py-1.5 text-gray-500 hover:text-gray-700 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-800">{section.title}</span>
            <button
              onClick={() => {
                setTitleInput(section.title);
                setIsEditingTitle(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
              title="Rename Section"
            >
              Rename
            </button>
          </div>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors shrink-0"
        >
          Delete Section
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
          <p className="font-medium">Delete &ldquo;{section.title}&rdquo; section?</p>
          <p className="text-xs text-red-600">This will remove this section from the resume and template.</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rich Text Editor */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Add bullet points or details for this section.
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
