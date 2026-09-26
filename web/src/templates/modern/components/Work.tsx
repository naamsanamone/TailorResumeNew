import { dateParser } from '@/helpers/utils';
import { HTMLRenderer } from '@/helpers/common/components/HTMLRenderer';
import { IWorkIntrf } from '@/stores/index.interface';
import { SectionHeading } from '../atoms/SectionHeading';
import { SectionList } from '../atoms/SectionList';
import { SectionSubtitle } from '../atoms/SectionSubtitle';
import { SectionTitle } from '../atoms/SectionTitle';
import { useEffect, useRef } from 'react';
import { useExperiences } from '../../../stores/experience';
import { scrollToElement } from '../../../helpers/utils/index';

export const WorkSection = ({ experience }: { experience: IWorkIntrf[] }) => {
  const experienceRef = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    return useExperiences.subscribe(() => {
      scrollToElement(experienceRef);
    });
  }, []);

  return (
    <div className="mb-3" ref={experienceRef}>
      <SectionHeading title="Experience" />

      {experience.map((item: IWorkIntrf, index: number) => {
        return (
          <div key={index} className="py-1.5">
            <SectionTitle label={item.name} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionSubtitle label={item.position} />
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p className="text-xs" style={{ whiteSpace: 'nowrap' }}>
                  {dateParser(item.startDate)} -{' '}
                  {item.isWorkingHere ? 'present' : dateParser(item.endDate)}
                </p>
              </div>
            </div>

            <SectionList>
              <HTMLRenderer htmlString={item.summary} />
            </SectionList>
          </div>
        );
      })}
    </div>
  );
};
