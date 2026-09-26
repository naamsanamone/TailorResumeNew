import {
  useDatabases,
  useFrameworks,
  useLanguages,
  useLibraries,
  usePractices,
  useTechnologies,
  useTools,
} from '../../../stores/skills';

import { IItem } from '@/stores/index.interface';
import { SectionHeading } from '../atoms/SectionHeading';
import { scrollToElement } from '../../../helpers/utils/index';
import { useEffect, useRef } from 'react';

export const SkillsSection = ({ title, list }: { title: string; list: IItem[] }) => {
  const skillRef = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    const unsubs = [
      useLanguages,
      useFrameworks,
      useLibraries,
      usePractices,
      useDatabases,
      useTechnologies,
      useTools,
    ].map((store) => store.subscribe(() => scrollToElement(skillRef)));
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  return (
    <div style={{ margin: '8px 0' }} ref={skillRef}>
      <SectionHeading title={title} />
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '4px 0' }}>
        {list.map((item: IItem, index) => (
          <div
            key={index}
            style={{
              padding: '3px 8px',
              fontSize: 13,
              fontWeight: 500,
              borderBottom: '2px solid #e5e7eb',
              wordBreak: 'break-word',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
};
