import { IVolunteer } from '@/stores/index.interface';
import { SectionHeading } from '../atoms/SectionHeading';
import { SectionSubtitle } from '../atoms/SectionSubtitle';
import { SectionTitle } from '../atoms/SectionTitle';
import { dateParser } from '@/helpers/utils';
import { SectionList } from '../atoms/SectionList';
import { HTMLRenderer } from '@/helpers/common/components/HTMLRenderer';
import { useEffect, useRef } from 'react';
import { useVoluteeringStore } from '../../../stores/volunteering';
import { scrollToElement } from '../../../helpers/utils/index';

export const VolunteerSection = ({ volunteer }: { volunteer: IVolunteer[] }) => {
  const volunteerRef = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    return useVoluteeringStore.subscribe(() => {
      scrollToElement(volunteerRef);
    });
  }, []);

  return (
    <div className="mb-3" ref={volunteerRef}>
      <SectionHeading title="Volunteering" />

      {volunteer.map((item: IVolunteer, index: number) => {
        return (
          <div key={index} className="py-2">
            <div>
              <SectionTitle label={`${item.organization}`} />
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
                    {item.isVolunteeringNow ? 'present' : dateParser(item.endDate)}
                  </p>
                </div>
              </div>
              <SectionList>
                <HTMLRenderer htmlString={item.summary} />
              </SectionList>
            </div>
          </div>
        );
      })}
    </div>
  );
};
