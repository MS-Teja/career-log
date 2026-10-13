import { describe, expect, it } from 'vitest';
import { suggestTopics } from '@/lib/suggestTopics';

describe('suggestTopics', () => {
  it('suggests topics from keywords in the summary first', () => {
    const s = suggestTopics('Longest increasing path in a matrix using DFS with memoisation', 'coding', []);
    expect(s.slice(0, 3)).toEqual(expect.arrayContaining(['dp', 'graphs', 'arrays']));
  });

  it('falls back to common topics for the round type', () => {
    expect(suggestTopics('', 'hr', [])).toEqual(['hr', 'behavioural']);
  });

  it('never suggests topics already picked and respects the limit', () => {
    const s = suggestTopics('Design an LRU cache with a hash map and linked list', 'technical', ['hashing'], 3);
    expect(s).not.toContain('hashing');
    expect(s).toHaveLength(3);
  });
});
