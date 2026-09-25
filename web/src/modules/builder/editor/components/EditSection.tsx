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
      <div className="mb-6 mt-2">
        <div className="flex items-center justify-between pb-3 border-b border-indigo-500/15">
          <a
            className="flex items-center cursor-pointer group gap-2"
            onClick={() => onLinkClick('')}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 group-hover:border-cyan-400/50 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all">
              <svg
                className="w-4 h-4 text-indigo-400 group-hover:text-cyan-300 transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
            {!isEditing && (
              <span className="text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors tracking-tight">
                {currentTitle}
              </span>
            )}
          </a>

          {isRenameable && !isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-indigo-400 hover:text-cyan-300 font-medium px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
                title="Rename section"
              >
                Rename
              </button>
              {isCustomTitle && (
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
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
          <div className="flex items-center gap-2 mt-3 p-2 bg-[#161c30] rounded-lg border border-indigo-500/30">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              className="px-2.5 py-1.5 rounded-md text-sm font-semibold text-white bg-[#0f1424] border border-indigo-500/40 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold rounded-md shadow-sm transition-all cursor-pointer"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditedTitle(currentTitle);
                setIsEditing(false);
              }}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
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
