import Image from '@/helpers/common/components/Image';
import { ReactNode } from 'react';
import Tooltip from '@mui/material/Tooltip';

const ResumeController = ({
  zoomIn,
  zoomOut,
  resetZoom,
  isReorderMode,
  onToggleReorder,
  onResetLayout,
}: {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  isReorderMode: boolean;
  onToggleReorder: () => void;
  onResetLayout: () => void;
}) => {
  return (
    <div className="hidden lg:flex">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-indigo-500/25 bg-[#161c30] px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-500/60 hover:bg-[#1d2542] hover:text-white cursor-pointer shadow-xs"
          onClick={onToggleReorder}
        >
          {isReorderMode ? 'Done reordering' : 'Enable section reorder'}
        </button>
        <button
          type="button"
          className="rounded-lg border border-indigo-500/25 bg-[#161c30] px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-indigo-500/60 hover:bg-[#1d2542] hover:text-white cursor-pointer shadow-xs"
          onClick={onResetLayout}
        >
          Reset section layout
        </button>
        <TooltipRenderer title="Zoom out">
          <button
            type="button"
            onClick={zoomOut}
            className="w-8 h-8 rounded-lg bg-[#161c30] border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-[#1d2542] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            aria-label="Zoom out"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </TooltipRenderer>
        <TooltipRenderer title="Zoom in">
          <button
            type="button"
            onClick={zoomIn}
            className="w-8 h-8 rounded-lg bg-[#161c30] border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-[#1d2542] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            aria-label="Zoom in"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </TooltipRenderer>
        <TooltipRenderer title="Reset zoom">
          <button
            type="button"
            onClick={resetZoom}
            className="w-8 h-8 rounded-lg bg-[#161c30] border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-[#1d2542] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            aria-label="Reset zoom"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </TooltipRenderer>
      </div>
    </div>
  );
};

export default ResumeController;

function TooltipRenderer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tooltip title={title}>
      <div className="w-auto h-auto flex">{children}</div>
    </Tooltip>
  );
}
