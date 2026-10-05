import { describe, expect, it } from 'vitest';

import { constructContainerUrl, constructProblemUrl } from './submission';

describe('submission URL helpers', () => {
  describe('constructContainerUrl', () => {
    it('returns empty string when subpaths is empty or missing', () => {
      expect(constructContainerUrl(null)).toBe('');
      expect(constructContainerUrl(undefined)).toBe('');
      expect(constructContainerUrl([])).toBe('');
      expect(constructContainerUrl([''])).toBe('');
    });

    it('returns problemset container url when single subpath', () => {
      expect(constructContainerUrl(['probset1'])).toBe('/problems/probset1');
    });

    it('returns chapter container url when two subpaths', () => {
      expect(constructContainerUrl(['course1', 'chap1'])).toBe('/courses/course1/chapters/chap1');
    });
  });

  describe('constructProblemUrl', () => {
    it('returns empty string when problemAlias or subpaths are invalid', () => {
      expect(constructProblemUrl(null, 'A')).toBe('');
      expect(constructProblemUrl([], 'A')).toBe('');
      expect(constructProblemUrl(['probset1'], '')).toBe('');
      expect(constructProblemUrl(['probset1'], '-')).toBe('');
      expect(constructProblemUrl(['probset1'], '#')).toBe('');
      expect(constructProblemUrl([], '-')).toBe('');
    });

    it('constructs problemset problem url correctly', () => {
      expect(constructProblemUrl(['probset1'], 'A')).toBe('/problems/probset1/A');
    });

    it('constructs course chapter problem url correctly', () => {
      expect(constructProblemUrl(['course1', 'chap1'], 'A')).toBe('/courses/course1/chapters/chap1/problems/A');
    });
  });
});
