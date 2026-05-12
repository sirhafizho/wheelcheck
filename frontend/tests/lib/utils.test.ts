import { formatDistance, formatWheelchairDistance } from '@/lib/utils';

describe('formatWheelchairDistance', () => {
  it('returns under a minute for short distances', () => {
    expect(formatWheelchairDistance(80)).toBe('< 1 min roll');
  });

  it('returns rounded roll times for medium distances', () => {
    expect(formatWheelchairDistance(350)).toBe('~5 min roll');
    expect(formatWheelchairDistance(1500)).toBe('~23 min roll');
  });

  it('returns kilometers for long distances', () => {
    expect(formatWheelchairDistance(2400)).toBe('~2.4 km');
  });
});

describe('formatDistance', () => {
  it('formats meters and kilometers', () => {
    expect(formatDistance(350)).toBe('350 m');
    expect(formatDistance(2400)).toBe('2.4 km');
  });
});
