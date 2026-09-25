import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, ReactNode } from 'react';

import Image from '@/helpers/common/components/Image';

const animation = {
  exit: {
    height: '0',
    paddingTop: 0,
    paddingBottom: 0,
    opacity: 0,
  },
};

const MoveEditSection = ({
  title,
  expanded,
  clickHandler,
  children,
  length,
  index,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  title: string;
  expanded: boolean;
  clickHandler: () => void;
  children: ReactNode;
  length: number;
  index: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (index: number) => void;
}) => {
  return (
    <div className="shadow-sm rounded-xl border border-indigo-500/20 overflow-hidden">
      <div
        className={`bg-[#161c30] hover:bg-[#1a2139] h-12 w-full ${
          expanded ? `rounded-t-xl border-b border-indigo-500/20` : `rounded-xl`
        } relative flex items-center justify-between pl-4 pr-3 text-slate-100 font-semibold text-sm select-none cursor-pointer z-10 transition-colors`}
        onClick={clickHandler}
      >
        <span className="w-56 overflow-hidden text-ellipsis whitespace-nowrap" title={title}>
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {length > 1 && (
            <Fragment>
              <button
                type="button"
                className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors cursor-pointer"
                title="Move up"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onMoveUp(index);
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors cursor-pointer"
                title="Move down"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onMoveDown(index);
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </Fragment>
          )}
          <button
            type="button"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onDelete(index);
            }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="bg-[#121727]/90 relative rounded-b-xl px-4 pt-5 pb-3 overflow-hidden border-t border-indigo-500/10"
            exit={animation.exit}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MoveEditSection;
