import { describe, expect, it } from 'vitest';
import { webViewBounds, nativeTouchPoint } from '../scripts/android-touch.mjs';

const node = (app = 'com.crafactory.engine', bounds = '[0,126][1080,2328]') =>
  `<node class="android.webkit.WebView" package="${app}" bounds="${bounds}" />`;

describe('physical Android WebView touch coordinates', () => {
  it('includes the native system-bar offset for short property fields', () => {
    const bounds = webViewBounds(node(), 'com.crafactory.engine');
    expect(bounds).toEqual({ left: 0, top: 126, right: 1080, bottom: 2328 });
    expect(nativeTouchPoint({ x: 60, y: 300, width: 200, height: 44 }, 2.625, bounds)).toEqual({
      x: 420,
      y: 971,
    });
  });
  it('supports an offset application window without borrowing another app WebView', () => {
    const bounds = webViewBounds(
      node('other.app') + node('com.crafactory.engine', '[80,126][1080,2328]'),
      'com.crafactory.engine',
    );
    expect(nativeTouchPoint({ x: 0, y: 0, width: 44, height: 44 }, 2, bounds)).toEqual({
      x: 124,
      y: 170,
    });
  });
  it('rejects absent application WebViews', () => {
    expect(() => webViewBounds(node('other.app'), 'com.crafactory.engine')).toThrow('one visible');
  });
  it('rejects ambiguous WebViews', () => {
    expect(() => webViewBounds(node() + node(), 'com.crafactory.engine')).toThrow('one visible');
  });
  it('rejects empty native view geometry', () => {
    expect(() =>
      webViewBounds(node('com.crafactory.engine', '[0,0][0,0]'), 'com.crafactory.engine'),
    ).toThrow('positive');
  });
  it('rejects offscreen touch targets instead of tapping unrelated system UI', () => {
    expect(() =>
      nativeTouchPoint(
        { x: 0, y: 1000, width: 44, height: 44 },
        3,
        webViewBounds(node(), 'com.crafactory.engine'),
      ),
    ).toThrow('inside');
  });
});
