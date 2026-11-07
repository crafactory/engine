import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/** Read the Content-Security-Policy meta tag from an application entry. */
function csp(file: string) {
  const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  expect(match).not.toBeNull();
  return match![1];
}
/** Extract the script-src directive so capability changes cannot hide in another directive. */
function scriptSrc(policy: string) {
  return policy
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('script-src '));
}
it('default entry permits Blob modules but refuses JS eval and WebAssembly compilation', () => {
  const policy = csp('index.html');
  expect(scriptSrc(policy)).toBe("script-src 'self' blob:");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy).not.toContain("'wasm-unsafe-eval'");
});
it('trusted entry scopes eval and WebAssembly compilation to the desktop opt-in', () => {
  expect(scriptSrc(csp('trusted.html'))).toBe(
    "script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'",
  );
});
