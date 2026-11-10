/* Original native property workflow: real InputConnection, Back and private-file restart. */
import path from 'node:path';
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { composeNative } from './android-compose.mjs';

export async function acceptProperties({
  getPage,
  restart,
  writeNative,
  readNative,
  readJSON,
  shell,
  quote,
  APP,
  output,
  nativeTap,
  keyboardVisibility,
  recoverLauncherAnr,
  metadata,
  resumed,
}) {
  const file = 'Properties.md';
  await writeNative(
    'vault/' + file,
    Buffer.from(
      '---\namount: 12.5\naliases: []\ndone: false\n---\n\n# Properties\n\nBody stays exact.\n',
    ),
  );
  const previous = readJSON('engine-profile/state.json').mobileLayout.active;
  await restart();
  let page = getPage();
  await expect(page.locator('.note-title h1')).toHaveText(path.basename(previous, '.md'));
  await page.getByRole('button', { name: 'Mobile files', exact: true }).click();
  await page.getByTestId('file-' + file).click();
  await expect(page.locator('.note-title h1')).toHaveText('Properties');
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await page.getByRole('button', { name: 'Note properties', exact: true }).click();
  await page.getByRole('button', { name: 'Property type amount', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Number', exact: true }).click();
  const amount = page.getByRole('spinbutton', { name: 'amount', exact: true });
  await amount.fill('');
  await amount.press('Enter');
  await expect.poll(() => readNative('vault/' + file)).toContain('amount: null');
  await expect
    .poll(() => readJSON('engine-profile/state.json').propertyTypes?.amount)
    .toBe('number');
  const aliases = page.getByRole('combobox', { name: 'aliases', exact: true });
  metadata.propertyCompositionEvents = await composeNative({
    page,
    target: aliases,
    shell,
    quote,
    APP,
    output,
    nativeTap,
    recoverLauncherAnr,
  });
  await expect(aliases).toHaveValue('中文');
  await expect(
    page.getByRole('button', { name: 'Remove aliases value 中文', exact: true }),
  ).toHaveCount(0);
  await aliases.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Remove aliases value 中文', exact: true }),
  ).toHaveCount(1);
  await expect.poll(() => readNative('vault/' + file)).toContain('  - 中文');
  await restart();
  page = getPage();
  await expect(page.locator('.note-title h1')).toHaveText('Properties');
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await page.getByRole('button', { name: 'Note properties', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'amount', exact: true })).toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'Remove aliases value 中文', exact: true }),
  ).toBeVisible();
  await nativeTap(page.getByRole('spinbutton', { name: 'amount', exact: true }));
  await expect
    .poll(keyboardVisibility, { timeout: 15000 })
    .toEqual({ native: true, reported: true });
  shell('input keyevent 4');
  await expect.poll(keyboardVisibility).toEqual({ native: false, reported: false });
  await page.getByRole('button', { name: 'Property type amount', exact: true }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  shell('input keyevent 4');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(page.locator('.note-title h1')).toHaveText('Properties');
  assert(resumed(), 'Back must not leave the app');
  const target = page.locator('.property-checkbox-target');
  const bounds = await target.boundingBox();
  assert(bounds?.width >= 44 && bounds.height >= 44, 'Native checkbox hit target');
  await nativeTap(target);
  await expect(page.getByRole('checkbox', { name: 'done', exact: true })).toBeChecked();
  await expect.poll(() => readNative('vault/' + file)).toContain('done: true');
  const expected = readNative('vault/' + file);
  assert(
    expected.endsWith('\n# Properties\n\nBody stays exact.\n'),
    'Property editing preserves body',
  );
  await restart();
  page = getPage();
  await expect(page.locator('.note-title h1')).toHaveText('Properties');
  await page.getByRole('button', { name: 'Mobile tools', exact: true }).click();
  await page.getByRole('button', { name: 'Note properties', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'done', exact: true })).toBeChecked();
  assert.equal(readNative('vault/' + file), expected, 'Exact private Markdown survives restart');
  assert.equal(readJSON('engine-profile/state.json').propertyTypes.amount, 'number');
  await page.screenshot({ path: path.join(output, 'android-properties.png') });
}
