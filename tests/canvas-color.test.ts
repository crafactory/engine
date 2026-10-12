import {it,expect} from 'vitest';
import {canvasForeground,canvasBackground} from '../src/canvas-color';
it('chooses contrasting foregrounds for light and dark custom Canvas backgrounds',()=>{
  expect(canvasForeground('#fff')).toBe('#000000');expect(canvasForeground('#000000')).toBe('#ffffff');
});
it('gives dark standard colored cards a light foreground independent of theme',()=>{
  expect(canvasForeground('#466b58')).toBe('#ffffff');expect(canvasForeground('#456678')).toBe('#ffffff');
});
it('rejects unsupported CSS expressions and images instead of fetching them as Canvas colors',()=>{
  expect(canvasForeground('var(--custom)')).toBeUndefined();
  expect(canvasBackground('url(https://example.com/track)')).toBeUndefined();
  expect(canvasBackground('4')).toBe('#466b58');expect(canvasBackground('#fff')).toBe('#fff');
});
