import { expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/** Run bounded native Git workflows in a disposable, credential-free repository. */
export async function acceptGitWorkflow({
  page,
  root,
  profile,
  git,
  gitAt,
}: {
  page: Page;
  root: string;
  profile: string;
  git: (...args: string[]) => string;
  gitAt: (cwd: string, ...args: string[]) => string;
}): Promise<string[]> {
  const gitRemote = path.join(profile, 'remote.git');
  await page.getByTestId('settings-close').click();
  await fs.appendFile(path.join(root, 'Test.md'), '\nNative Git fixture edit\n');
  await expect(page.locator('.cm-content')).toContainText('Native Git fixture edit');
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill('Git: Open source control view');
  await page
    .locator('.palette-list [role="option"]')
    .filter({ hasText: /^Git: Open source control view$/ })
    .click();
  await expect(page.locator('.plugin-view-pane')).toBeVisible();
  await expect(
    page.locator('.plugin-view-content').getByText('Test', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill('Git: Stage current file');
  await page
    .locator('.palette-list [role="option"]')
    .filter({ hasText: 'Git: Stage current file' })
    .click();
  await expect.poll(() => git('diff', '--cached', '--name-only')).toContain('Test.md');
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill('Git: Commit staged with specific message');
  await page
    .locator('.palette-list [role="option"]')
    .filter({ hasText: 'Git: Commit staged with specific message' })
    .click();
  await expect(page.locator('.modal')).toBeVisible();
  console.log('GIT COMMIT DIALOG ' + (await page.locator('.modal').innerText()));
  await page.locator('.modal input').fill('Native Git fixture commit');
  await page.locator('.modal input').press('Enter');
  await expect.poll(() => git('log', '-1', '--format=%s')).toContain('Native Git fixture commit');
  expect(git('show', 'HEAD:Test.md')).toContain('Native Git fixture edit');
  const committed = git('rev-parse', 'HEAD').trim();
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill('Git: Push');
  await page
    .locator('.palette-list [role="option"]')
    .filter({ hasText: /^Git: Push$/ })
    .click();
  await expect.poll(() => git('ls-remote', 'origin', 'refs/heads/main')).toContain(committed);
  const peer = path.join(profile, 'peer');
  git('clone', '--branch', 'main', gitRemote, peer);
  gitAt(peer, 'config', 'user.name', 'Engine Compatibility Fixture');
  gitAt(peer, 'config', 'user.email', 'fixture@example.invalid');
  gitAt(peer, 'config', 'commit.gpgSign', 'false');
  gitAt(peer, 'config', 'core.hooksPath', os.platform() === 'win32' ? 'NUL' : '/dev/null');
  await fs.appendFile(path.join(peer, 'Test.md'), '\nIncoming local-remote fixture edit\n');
  gitAt(peer, 'add', 'Test.md');
  gitAt(peer, 'commit', '-m', 'Incoming fixture commit');
  gitAt(peer, 'push', 'origin', 'main');
  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  await page.getByTestId('palette-input').fill('Git: Pull');
  await page
    .locator('.palette-list [role="option"]')
    .filter({ hasText: /^Git: Pull$/ })
    .click();
  await expect
    .poll(() => fs.readFile(path.join(root, 'Test.md'), 'utf8'))
    .toContain('Incoming local-remote fixture edit');
  await expect(page.locator('.cm-content')).toContainText('Incoming local-remote fixture edit');
  return [
    'explicit native profile uses real Node modules',
    'stage current file updates the real index',
    'commit staged with specific message creates a local commit containing the edit',
    'push updates a disposable local bare remote',
    'pull imports a peer commit and refreshes the real editor; no credentials or Internet remote used',
  ];
}
