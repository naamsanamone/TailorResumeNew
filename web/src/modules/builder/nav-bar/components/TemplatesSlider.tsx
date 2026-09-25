import '@splidejs/splide/css';

import Splide, { Splide as SplideCore } from '@splidejs/splide';
import { useEffect, useRef } from 'react';

import { AVAILABLE_TEMPLATES } from '@/helpers/constants';
import { Global } from '@emotion/react';
import Image from '@/helpers/common/components/Image';
import { useTemplates } from '@/stores/useTemplate';

const TILE_W = 170;
const TILE_H = 240;

export const TemplateSlider = () => {
  const templateIndex = useTemplates((state) => state.activeTemplate.id);

  const targetElementRef = useRef<HTMLElement | null>(null);
  const splideInstanceRef = useRef<Splide | null>(null);

  useEffect(() => {
    const targetElement = targetElementRef.current;
    if (targetElement) {
      splideInstanceRef.current = new SplideCore(targetElement, {
        perPage: 3,
        pagination: false,
        gap: '8px',
        width: '100%',
        autoHeight: true,
        perMove: 1,
        breakpoints: {
          900: { perPage: 3 },
          640: { perPage: 2 },
          480: { perPage: 1 },
        },
      });

      splideInstanceRef.current.mount();
    }

    return () => {
      splideInstanceRef.current?.destroy();
    };
  }, []);

  const onChangeTemplate = (templateId: string) => {
    useTemplates.getState().setTemplate(AVAILABLE_TEMPLATES[templateId]);
  };

  return (
    <div>
      <Global
        styles={{
          '.splide__arrow svg': {
            fill: '#ffffff',
          },
          '.splide__arrow--prev': {
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
          },
          '.splide__arrow--next': {
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
          },
          '.splide__arrow--prev:disabled': {
            cursor: 'not-allowed',
            opacity: 0.3,
          },
          '.splide__arrow--next:disabled': {
            cursor: 'not-allowed',
            opacity: 0.3,
          },
        }}
      />
      <section className="splide mt-[26px] mb-[32px] md:px-[40px]" ref={targetElementRef}>
        <div className="splide__track">
          <ul className="splide__list">
            {Object.keys(AVAILABLE_TEMPLATES).map((templateKey) => {
              const template = AVAILABLE_TEMPLATES[templateKey];
              const isActive = template.id === templateIndex;
              return (
                <TemplateSlide
                  key={template.id}
                  isActive={isActive}
                  {...template}
                  onChangeTemplate={onChangeTemplate}
                />
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};

const TemplateSlide = ({
  isActive,
  id,
  name,
  thumbnail,
  onChangeTemplate,
}: {
  isActive: boolean;
  id: string;
  name: string;
  thumbnail: string;
  onChangeTemplate: (id: string) => void;
}) => {
  return (
    <li className="splide__slide flex justify-center">
      <div
        className={`h-[255px] w-[180px] rounded-xl border hover:cursor-pointer overflow-hidden relative transition-all ${
          isActive
            ? 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/40 ring-2 ring-indigo-500/30'
            : 'border-slate-700/80 hover:border-indigo-400/50'
        }`}
        style={{ width: TILE_W, height: TILE_H }}
        onClick={() => {
          onChangeTemplate(id);
        }}
      >
        <Image src={thumbnail} alt={name} fill className="object-cover" sizes={`${TILE_W}px`} />

        {isActive && (
          <div className="absolute top-1 right-1 bg-white rounded-full">
            <Image src={'/icons/selected-tick.svg'} alt="logo" width="24" height="24" />
          </div>
        )}
      </div>
    </li>
  );
};
