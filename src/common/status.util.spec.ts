import { daysUntil, getReviewStatus, getStatusForDays, todayIso } from './status.util';

describe('status.util', () => {
  describe('todayIso / daysUntil', () => {
    it('tracks the real clock rather than a frozen date', () => {
      const today = todayIso();
      expect(today).toBe(new Date().toISOString().slice(0, 10));
      expect(daysUntil(today)).toBe(0);
    });

    it('returns a positive count for a future date and negative for a past one', () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 10);
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 10);

      expect(daysUntil(future.toISOString().slice(0, 10))).toBe(10);
      expect(daysUntil(past.toISOString().slice(0, 10))).toBe(-10);
    });
  });

  describe('getStatusForDays', () => {
    it('is Overdue once past the review date', () => {
      expect(getStatusForDays(-1)).toBe('Overdue');
    });

    it('is Review Due Soon inside the 30-day window, inclusive of the boundary', () => {
      expect(getStatusForDays(30)).toBe('Review Due Soon');
      expect(getStatusForDays(0)).toBe('Review Due Soon');
    });

    it('is Compliant just outside the 30-day window', () => {
      expect(getStatusForDays(31)).toBe('Compliant');
    });
  });

  describe('getReviewStatus', () => {
    it('derives status from a real review date relative to today', () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 100);
      expect(getReviewStatus(future.toISOString().slice(0, 10))).toBe('Compliant');
    });

    it('is Overdue for a review date in the past', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 5);
      expect(getReviewStatus(past.toISOString().slice(0, 10))).toBe('Overdue');
    });
  });
});
