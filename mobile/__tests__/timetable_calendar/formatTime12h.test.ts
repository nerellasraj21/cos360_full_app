import { formatTime12h } from '../../components/ui/time-picker-modal';

describe('formatTime12h', () => {
  it('TC-TTC-06-U11 formats 09:45 as 9:45 AM', () => {
    expect(formatTime12h('09:45')).toBe('9:45 AM');
  });

  it('TC-TTC-06-U11 formats 00:05 as 12:05 AM', () => {
    expect(formatTime12h('00:05')).toBe('12:05 AM');
  });

  it('TC-TTC-06-U11 formats noon and afternoon hours', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM');
    expect(formatTime12h('12:30')).toBe('12:30 PM');
    expect(formatTime12h('13:05')).toBe('1:05 PM');
    expect(formatTime12h('23:59')).toBe('11:59 PM');
  });

  it('TC-TTC-06-U11 accepts HH:MM:SS input and ignores the seconds', () => {
    expect(formatTime12h('07:30:00')).toBe('7:30 AM');
  });

  it('TC-TTC-06-U11 returns an empty string for empty input and the raw text for invalid input', () => {
    expect(formatTime12h('')).toBe('');
    expect(formatTime12h('abc')).toBe('abc');
  });
});
