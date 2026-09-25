import { AnimatePresence, motion } from 'framer-motion';

import Image from '@/helpers/common/components/Image';
import { ReactNode } from 'react';

const animation = {
  exit: {
    height: '0',
    paddingTop: 0,
    paddingBottom: 0,
    opacity: 0,
  },
};

const nonEditableStyle =
  "opacity-60 after:content-[''] after:absolute after:h-full after:w-full after:top-0 after:left-0 after:cursor-not-allowed";

const EditSectionContainer = ({
  title,
  expanded,
  clickHandler,
  isEnabled,
  setIsEnabled,
  children,
}: {
  title: string;
  expanded: boolean;
  clickHandler: () => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  children: ReactNode;
}) => {
  const toggleVisibility = (e: React.MouseEvent) => {
    setIsEnabled(!isEnabled);
    e.stopPropagation();
  };

  return (
    <div className="shadow-sm rounded-xl border border-indigo-500/20 overflow-hidden">
      <div
        className={`bg-[#161c30] hover:bg-[#1a2139] h-12 w-full ${
          expanded ? `rounded-t-xl border-b border-indigo-500/20` : `rounded-xl`
        } relative flex items-center justify-between px-4 text-slate-100 font-semibold text-sm select-none cursor-pointer z-10 transition-colors`}
        onClick={clickHandler}
      >
        <span>{title}</span>
        <button
          type="button"
          onClick={toggleVisibility}
          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors cursor-pointer"
          title={isEnabled ? 'Hide section' : 'Show section'}
        >
          {isEnabled ? (
            <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className={`bg-[#121727]/90 relative rounded-b-xl px-4 py-5 overflow-hidden border-t border-indigo-500/10 ${
              !isEnabled && nonEditableStyle
            }`}
            exit={animation.exit}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditSectionContainer;
