import { HTMLRenderer } from '@/helpers/common/components/HTMLRenderer';
import { IAwards } from '@/stores/index.interface';
import { SectionHeading } from '../atoms/SectionHeading';
import { SectionList } from '../atoms/SectionList';
import { SectionSubtitle } from '../atoms/SectionSubtitle';
import { SectionTitle } from '../atoms/SectionTitle';
import { dateParser } from '@/helpers/utils';
import { useEffect, useRef } from 'react';
import { useAwards } from '../../../stores/awards';
import { scrollToElement } from '../../../helpers/utils/index';

export const AwardSection = ({ awardsReceived }: { awardsReceived: IAwards[] }) => {
  const awardsRef = useRef<null | HTMLDivElement>(null);
  useEffect(() => {
    return useAwards.subscribe(() => {
      scrollToElement(awardsRef);
    });
  }, []);

  return (
    <div className="mb-2" ref={awardsRef}>
      <SectionHeading title="Awards" />

      {awardsReceived.map((award: IAwards, index: number) => {
        return (
          <div key={index} className="pb-2">
            <SectionTitle label={award.title} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionSubtitle label={award.awarder} />
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p className="text-xs" style={{ whiteSpace: 'nowrap' }}>{dateParser(award.date)}</p>
              </div>
            </div>
            <SectionList>
              <HTMLRenderer htmlString={award.summary} />
            </SectionList>
          </div>
        );
      })}
    </div>
  );
};
