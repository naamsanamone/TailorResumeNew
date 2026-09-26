import type { Dayjs } from 'dayjs/index';
import dayjs from 'dayjs';
import { MutableRefObject } from 'react';

export const dateParser = (dateValue: string | Dayjs | null | undefined, outputFormat = 'MMM YYYY'): string => {
  if (!dateValue) return '';
  const s = String(dateValue).trim();
  if (!s) return '';
  if (/^\d{4}$/.test(s)) return s;
  if (/^(present|current|now)$/i.test(s)) return 'Present';
  if (/^(spring|summer|fall|autumn|winter)\s+\d{4}$/i.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = dayjs(`${m[2]}-${m[1].padStart(2, '0')}-01`);
    if (d.isValid()) return d.format(outputFormat);
  }
  const dayjsDate = dayjs(s);
  if (dayjsDate.isValid()) {
    return dayjsDate.format(outputFormat);
  }
  return s;
};

export const scrollToElement = (ref: MutableRefObject<HTMLDivElement | null>) => {
  ref.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'end',
    inline: 'nearest',
  });
};
