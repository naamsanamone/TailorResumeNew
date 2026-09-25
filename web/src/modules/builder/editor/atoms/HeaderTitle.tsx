import React from 'react';

const HeaderTitle = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between w-full py-1">
    <p className="text-[15px] font-semibold text-slate-100 group-hover:text-white tracking-wide transition-colors">
      {title}
    </p>

    <div className="ml-auto pl-3 flex items-center text-indigo-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all">
      <svg width="7" height="12" viewBox="0 0 8 12" fill="currentColor">
        <path d="M1.5 0L0 1.5L4.5 6L0 10.5L1.5 12L7.5 6L1.5 0Z" />
      </svg>
    </div>
  </div>
);

export default HeaderTitle;
