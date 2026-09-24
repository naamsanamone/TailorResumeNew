import React, { useState } from 'react';
import { Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { headers } from '@/helpers/constants/editor-data';
import HeaderTitle from '../atoms/HeaderTitle';
import { useCustomSectionsStore } from '@/stores/customSections';

const animation = {
  initial: { x: -25, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};

const SUGGESTED_SECTIONS = [
  'Publications',
  'Languages',
  'Interests',
  'Patents',
  'References',
  'Open Source',
];

const EditHeaders = ({ onLinkClick }: { onLinkClick: (link: string) => void }) => {
  const sectionTitles = useCustomSectionsStore((state) => state.sectionTitles);
  const customSections = useCustomSectionsStore((state) => state.customSections);
  const addCustomSection = useCustomSectionsStore((state) => state.addCustomSection);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const handleCreateSection = (titleToUse?: string) => {
    const title = (titleToUse || newSectionTitle).trim();
    if (!title) return;
    const newId = addCustomSection(title);
    setNewSectionTitle('');
    setShowAddModal(false);
    onLinkClick(newId);
  };

  return (
    <motion.div initial={animation.initial} animate={animation.animate}>
      {/* Standard Sections */}
      {Object.entries(headers).map(([link, { title }]) => {
        const displayTitle = sectionTitles[link] || title;
        return (
          <a onClick={() => onLinkClick(link)} key={link} className="block group">
            <HeaderTitle title={displayTitle} />
            <Divider />
          </a>
        );
      })}

      {/* User-Defined Custom Sections */}
      {customSections.map((cs) => (
        <a onClick={() => onLinkClick(cs.id)} key={cs.id} className="block group">
          <HeaderTitle title={cs.title} />
          <Divider />
        </a>
      ))}

      {/* Add Custom Section Button */}
      <div className="mt-4">
        {!showAddModal ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-2.5 px-3 border-2 border-dashed border-blue-400 hover:border-blue-600 text-blue-600 hover:text-blue-700 hover:bg-blue-50/60 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="text-lg leading-none font-bold">+</span>
            <span>Add Custom Section</span>
          </button>
        ) : (
          <div className="p-3 bg-white border border-blue-200 rounded-lg shadow-sm space-y-3 animate-[fadeIn_.2s]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                New Section Name
              </span>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSectionTitle('');
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <input
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSection();
                if (e.key === 'Escape') setShowAddModal(false);
              }}
              placeholder="e.g. Publications, Languages"
              autoFocus
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Quick Suggestions */}
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">Suggestions:</span>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_SECTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleCreateSection(suggestion)}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded text-xs transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleCreateSection()}
                disabled={!newSectionTitle.trim()}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-md transition-colors"
              >
                Create Section
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSectionTitle('');
                }}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EditHeaders;
