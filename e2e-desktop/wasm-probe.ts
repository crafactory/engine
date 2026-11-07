import type { Page } from '@playwright/test';

/** Compile a minimal valid module in the page so its actual entry CSP decides. */
export async function compileWasm(page: Page) {
  return page.evaluate(
    (bytes) =>
      new Promise<string>((resolve) =>
        setTimeout(async () => {
          try {
            await WebAssembly.compile(new Uint8Array(bytes));
            resolve('compiled');
          } catch (error) {
            resolve(String(error));
          }
        }, 0),
      ),
    [0, 97, 115, 109, 1, 0, 0, 0],
  );
}
