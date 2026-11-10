import { expect, it } from 'vitest';
import { search } from '../src/knowledge';

it('numeric comparisons exclude cleared null properties without hiding null or presence searches', () => {
  const empty = { path: 'Empty.md', content: '---\nrating: null\n---\n' };
  const zero = { path: 'Zero.md', content: '---\nrating: 0\n---\n' };
  expect(search([empty], '[rating]')).toEqual([empty]);
  expect(search([empty], '[rating:null]')).toEqual([empty]);
  for (const query of [
    '[rating:>=0]',
    '[rating:<=0]',
    '[rating:>0]',
    '[rating:<0]',
    '[rating:>=0] [rating:<=0]',
  ])
    expect(search([empty], query), query).toEqual([]);
  expect(search([zero], '[rating:>=0] [rating:<=0]')).toEqual([zero]);
});
