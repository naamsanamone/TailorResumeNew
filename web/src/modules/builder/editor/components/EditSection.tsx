import Image from '@/helpers/common/components/Image';
import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCustomSectionsStore } from '@/stores/customSections';

const animation = {
  initial: { x: 25, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};

interface IEditSection {
  section: {
    title: string;
    component: () => ReactNode;
  };
  sectionKey: string;
  onLinkClick: (link: string) => void;
}

const EditSection = ({ section, sectionKey, onLinkClick }: IEditSection) => {
  const customTitles = useCustomSectionsStore((state) => state.sectionTitles);
  const setSectionTitle = useCustomSectionsStore((state) => state.setSectionTitle);
  const resetSectionTitle = useCustomSectionsStore((state) => state.resetSectionTitle);

  const isCustomTitle = !!customTitles[sectionKey];
  const currentTitle = customTitles[sectionKey] || section.title;

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(currentTitle);

  useEffect(() => {
    setEditedTitle(currentTitle);
  }, [currentTitle]);

  const handleSave = () => {
    if (editedTitle.trim()) {
      setSectionTitle(sectionKey, editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleReset = () => {
    resetSectionTitle(sectionKey);
    setEditedTitle(section.title);
    setIsEditing(false);
  };

  const isRenameable = sectionKey !== 'tailor';

  return (
    <motion.div initial={animation.initial} animate={animation.animate}>
      <div className="mb-6 mt-4">
        <div className="flex items-center justify-between">
          <a
            className="flex items-center cursor-pointer group"
            onClick={() => onLinkClick('')}
          >
            <Image src="/icons/left-arrow.svg" alt="back" width={12} height={16} />
            {!isEditing && (
              <span className="pl-2 ml-2 text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {currentTitle}
              </span>
            )}
          </a>

          {isRenameable && !isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                title="Rename section"
              >
                Rename
              </button>
              {isCustomTitle && (
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  title="Reset to default title"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inline Title Editor */}
        {isEditing && (
          <div className="flex items-center gap-2 mt-2 pl-5">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              className="px-2.5 py-1 border border-blue-400 rounded-md text-base font-semibold text-gray-900 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditedTitle(currentTitle);
                setIsEditing(false);
              }}
              className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <section.component />
    </motion.div>
  );
};

export default EditSection;
