import Image from '@/helpers/common/components/Image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { useState } from 'react';

const animation = {
  initial: { y: 25, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { height: 0, padding: 0, opacity: 0, transition: { duration: 0.15 } },
};

const animationEditIcon = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { delay: 0.1 },
};

const SkillPill = ({
  index,
  name,
  level,
  onDelete,
  showLevel,
  onEdit,
}: {
  index: number;
  name: string;
  level: number;
  onDelete: (index: number) => void;
  showLevel: boolean;
  onEdit: ({ name, level, index }: { name: string; level: number; index: number }) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: name,
  });

  const [showEdit, setShowEdit] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      initial={animation.initial}
      animate={animation.animate}
      exit={animation.exit}
      key={name}
    >
      <div
        className="bg-[#1a2236] border border-indigo-500/20 hover:border-indigo-500/40 flex items-center pl-3.5 pr-2 py-1.5 rounded-full text-xs text-slate-100 cursor-default transition-all shadow-xs"
        data-testid="skill-pill"
        style={style}
        onMouseEnter={() => {
          setShowEdit(true);
        }}
        onMouseLeave={() => {
          setShowEdit(false);
        }}
        ref={setNodeRef}
        {...attributes}
      >
        <div className="flex items-center min-w-max text-slate-400 hover:text-slate-200 cursor-grab" {...listeners}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>
        <span className="flex-1 ml-2 cursor-grab font-medium" data-testid="skill-title" {...listeners}>
          {name}
        </span>
        {showLevel && !showEdit && (
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
            {level}
          </span>
        )}
        {showEdit && (
          <motion.button
            initial={animationEditIcon.initial}
            animate={animationEditIcon.animate}
            transition={animationEditIcon.transition}
            onClick={() => onEdit({ name, level, index })}
            className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors cursor-pointer"
            title="Edit skill"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </motion.button>
        )}
        <button
          className="ml-1 p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          onClick={() => onDelete(index)}
          title="Delete skill"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default SkillPill;
