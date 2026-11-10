/* Owned debug IME driver shared by editor and property acceptance. No CDP composition. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { imeCompositionReady } from './android-ime-state.mjs';

export async function composeNative({
  page,
  target,
  shell,
  quote,
  APP,
  output,
  nativeTap,
  recoverLauncherAnr,
}) {
  const defaultIme = shell('settings get secure default_input_method').trim();
  const fixtureIme = APP + '/.CompositionIme';
  try {
    shell('ime enable ' + quote(fixtureIme));
    shell('ime set ' + quote(fixtureIme));
    await expect
      .poll(
        async () => {
          await recoverLauncherAnr();
          shell(`am start -n ${APP}/.MainActivity`);
          if (shell('settings get secure default_input_method').trim() !== fixtureIme)
            shell('ime set ' + quote(fixtureIme));
          await target.click();
          await nativeTap(target);
          await page.keyboard.press('Control+End');
          const dump = shell('dumpsys input_method');
          await fs.writeFile(path.join(output, 'input-method-ready.txt'), dump);
          if (!imeCompositionReady(dump)) return 'text editor connection pending';
          return shell(
            `am broadcast -a ${APP}.TEST_COMPOSITION_READY -n '${APP}/.CompositionIme$Run'`,
          );
        },
        { timeout: 15000 },
      )
      .toContain('result=0');
    await target.evaluate((element) => {
      window.__nativeComposition = [];
      for (const type of ['compositionstart', 'compositionupdate', 'compositionend']) {
        element.addEventListener(type, (event) =>
          window.__nativeComposition.push({ type, data: event.data }),
        );
      }
    });
    assert(
      shell(`am broadcast -a ${APP}.TEST_COMPOSITION -n '${APP}/.CompositionIme$Run'`).includes(
        'result=0',
      ),
      'Ready native InputConnection accepts one composition',
    );
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            window.__nativeComposition.some((event) => event.type === 'compositionend'),
          ),
        { timeout: 15000 },
      )
      .toBe(true);
    return await page.evaluate(() => window.__nativeComposition);
  } finally {
    shell('ime set ' + quote(defaultIme));
    shell('ime disable ' + quote(fixtureIme));
  }
}
