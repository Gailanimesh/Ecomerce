import { toPaise, toRupees } from './money.util';

describe('MoneyUtil', () => {
  it('should correctly convert Rupees to Paise integer', () => {
    expect(toPaise(499.5)).toBe(49950);
    expect(toPaise('499.50')).toBe(49950);
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(0)).toBe(0);
  });

  it('should throw on invalid rupee inputs', () => {
    expect(() => toPaise(-10)).toThrow();
    expect(() => toPaise('invalid')).toThrow();
  });

  it('should correctly convert Paise to formatted Rupees string', () => {
    expect(toRupees(49950)).toBe('499.50');
    expect(toRupees(10000)).toBe('100.00');
    expect(toRupees(0)).toBe('0.00');
  });

  it('should throw on invalid paise inputs', () => {
    expect(() => toRupees(-500)).toThrow();
  });
});
