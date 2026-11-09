/* Original physical touch geometry: WebView coordinates do not include system bars. */
import assert from 'node:assert/strict';

export function webViewBounds(xml, app) {
  // Android exposes an accessibility WebView inside the native WebView container.
  // Use the outer physical viewport, not that virtual child's slightly taller bounds.
  const views = [];
  const stack = [];
  for (const node of xml.match(/<\/?node\b[^>]*>/g) ?? []) {
    if (node.startsWith('</')) {
      stack.pop();
      continue;
    }
    const owned =
      node.includes('class="android.webkit.WebView"') && node.includes(`package="${app}"`);
    if (owned && !stack.includes(true)) views.push(node);
    if (!node.endsWith('/>')) stack.push(owned);
  }
  assert.equal(views.length, 1, 'Expected one visible application WebView');
  const match = /bounds="\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]"/.exec(views[0]);
  assert(match, 'Expected absolute native WebView bounds');
  const [left, top, right, bottom] = match.slice(1).map(Number);
  assert(right > left && bottom > top, 'Expected positive WebView area');
  return { left, top, right, bottom };
}

export function nativeTouchPoint(rect, ratio, bounds) {
  assert(
    rect && rect.width > 0 && rect.height > 0 && Number.isFinite(ratio) && ratio > 0,
    'Expected visible touch geometry',
  );
  const x = Math.round(bounds.left + (rect.x + Math.min(rect.width / 2, 100)) * ratio);
  const y = Math.round(bounds.top + (rect.y + Math.min(rect.height / 2, 100)) * ratio);
  assert(
    x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom,
    'Touch must stay inside the native WebView',
  );
  return { x, y };
}
