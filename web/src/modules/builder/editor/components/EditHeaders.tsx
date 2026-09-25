import React, { useState } from 'react';
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
    <motion.div initial={animation.initial} animate={animation.animate} className="space-y-2">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-500/15">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Resume Sections
        </span>
        <span className="text-[11px] font-semibold text-indigo-400/90 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/25">
          {Object.keys(headers).length + customSections.length} sections
        </span>
      </div>

      {/* Standard Sections */}
      {Object.entries(headers).map(([link, { title }]) => {
        const displayTitle = sectionTitles[link] || title;
        return (
          <div
            onClick={() => onLinkClick(link)}
            key={link}
            className="bg-[#161c30] hover:bg-[#1d2542] border border-indigo-500/15 hover:border-indigo-400/40 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 flex items-center justify-between group shadow-sm hover:shadow-md hover:shadow-indigo-500/10"
          >
            <HeaderTitle title={displayTitle} />
          </div>
        );
      })}

      {/* User-Defined Custom Sections */}
      {customSections.map((cs) => (
        <div
          onClick={() => onLinkClick(cs.id)}
          key={cs.id}
          className="bg-[#161c30] hover:bg-[#1d2542] border border-indigo-500/15 hover:border-indigo-400/40 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 flex items-center justify-between group shadow-sm hover:shadow-md hover:shadow-indigo-500/10"
        >
          <HeaderTitle title={cs.title} />
        </div>
      ))}

      {/* Add Custom Section Button */}
      <div className="pt-2">
        {!showAddModal ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-3 px-4 border-2 border-dashed border-indigo-500/30 hover:border-cyan-400/60 text-indigo-400 hover:text-cyan-300 hover:bg-indigo-950/30 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-lg leading-none font-bold">+</span>
            <span>Add Custom Section</span>
          </button>
        ) : (
          <div className="p-4 bg-[#161c30] border border-indigo-500/30 rounded-xl shadow-lg space-y-3 animate-[fadeIn_.2s]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                New Section Name
              </span>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSectionTitle('');
                }}
                className="text-slate-400 hover:text-white text-base font-bold"
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
              className="w-full px-3 py-2 bg-[#0f1424] border border-indigo-500/30 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />

            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SECTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleCreateSection(suggestion)}
                    className="px-2.5 py-1 bg-[#1c2440] hover:bg-indigo-600/30 hover:text-cyan-300 text-slate-300 border border-indigo-500/20 rounded-md text-xs transition-colors"
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
                className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
              >
                Create Section
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSectionTitle('');
                }}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium"
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
