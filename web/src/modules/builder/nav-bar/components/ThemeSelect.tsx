import { ColorBox, ColorBoxWrapper } from '../atoms';

import { IThemeColor } from '@/helpers/constants/index.interface';
import Image from '@/helpers/common/components/Image';
import { SYSTEM_COLORS } from '@/helpers/constants/index';
import { useThemes } from '@/stores/themes';

export const ThemeSelect = () => {
  const activeTheme = useThemes((state) => state.selectedTheme);

  const handleActiveTheme = (themeObject: IThemeColor) => {
    useThemes.getState().chooseTheme(themeObject);
  };

  return (
    <div className="h-auto md:w-[475px] bg-[#13192B] border border-indigo-500/25 rounded-2xl flex flex-col px-8 py-6 shadow-2xl text-slate-100">
      <span className="text-white font-bold text-sm md:text-base mb-3">
        Choose a resume colour scheme
      </span>
      <div className="w-full">
        {SYSTEM_COLORS.map((themeObject) => {
          const isActive = themeObject.id === activeTheme.id;
          return (
            <div
              key={themeObject.id}
              className={`flex border rounded-xl mb-[12px] justify-between items-center py-3 px-4 transition-colors ${
                isActive
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-xs'
                  : 'bg-[#161c30] border-slate-700/60 hover:border-indigo-500/40'
              } hover:cursor-pointer`}
              onClick={() => handleActiveTheme(themeObject)}
            >
              <ColorBoxWrapper>
                <ColorBox bgColor={themeObject.backgroundColor} />
                <ColorBox bgColor={themeObject.fontColor} />
                <ColorBox bgColor={themeObject.titleColor} />
                <ColorBox bgColor={themeObject.highlighterColor} />
              </ColorBoxWrapper>
              {isActive && (
                <Image src={'/icons/selected-tick.svg'} alt="logo" width="28" height="20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
