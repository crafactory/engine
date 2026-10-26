import {describe,it,expect} from 'vitest';
import {BasesViewRegistry,builtinBasesViews,displayValue} from '../src/views/bases/registry';

describe('built-in Bases views', () => {
  it('registers table, cards and list renderers', () => {
    expect(builtinBasesViews.list().sort()).toEqual(['cards', 'list', 'table']);
    expect(typeof builtinBasesViews.resolve('table')).toBe('function');
    expect(typeof builtinBasesViews.resolve('cards')).toBe('function');
    expect(typeof builtinBasesViews.resolve('list')).toBe('function');
    expect(builtinBasesViews.resolve('missing')).toBeUndefined();
  });
  it('registers and revokes custom renderers', () => {
    const registry = new BasesViewRegistry();
    const View = () => null;
    const dispose = registry.register('custom', View);
    expect(registry.resolve('custom')).toBe(View);
    dispose();
    expect(registry.resolve('custom')).toBeUndefined();
    expect(() => registry.register('', View)).toThrow('Invalid Bases view');
  });
  it('renders cell values consistently', () => {
    expect(displayValue(['a', 'b'])).toBe('a, b');
    expect(displayValue(null)).toBe('');
    expect(displayValue(3)).toBe('3');
  });
});
