import { TemplateSlider } from './TemplatesSlider';

export const TemplateSelect = () => {
  return (
    <div
      className="md:h-[380px] md:w-[720px] bg-[#13192B] border border-indigo-500/25 rounded-2xl flex flex-col px-3 md:px-10 py-[23px] shadow-2xl text-slate-100"
    >
      <TemplateSlider />
    </div>
  );
};
