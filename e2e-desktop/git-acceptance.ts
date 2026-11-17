import { expect, type Locator, type Page } from '@playwright/test';
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
  const command = async (name: string) => {
    await page.getByRole('button', { name: 'Command palette', exact: true }).click();
    await page.getByTestId('palette-input').fill(name);
    await page.getByRole('option', { name, exact: true }).click();
  };
  const source = page.locator('.plugin-view-pane[data-type="git-view"]'),
    diff = page.locator('.plugin-view-pane[data-type="split-diff-view"]'),
    history = page.locator('.plugin-view-pane[data-type="git-history-view"]');
  const row = () => source.locator('[aria-label="Test.md"]');
  // Query rendered lines, not private plugin/editor objects. These fixtures fit in the viewport.
  const lines = (editor: Locator) => editor.locator('.cm-line').allTextContents();
  const expectDiff = async (before: string, after: string) => {
    await expect(diff).toBeVisible();
    const editors = diff.locator('.cm-editor');
    await expect(editors).toHaveCount(2);
    await expect.poll(() => lines(editors.first())).toEqual(before.split('\n'));
    await expect.poll(() => lines(editors.last())).toEqual(after.split('\n'));
  };
  const closeDiff = () => diff.getByRole('button', { name: /^Close Diff:/ }).click();
  const gitRemote = path.join(profile, 'remote.git'),
    file = path.join(root, 'Test.md'),
    original = await fs.readFile(file, 'utf8'),
    edited = original + '\nNative Git fixture edit 中文\n',
    saved = edited + 'Edited in Git diff 中文\n';
  await page.getByTestId('settings-close').click();
  await fs.writeFile(file, edited);
  await expect(page.getByRole('textbox', { name: 'Note editor', exact: true })).toContainText(
    'Native Git fixture edit',
  );
  await command('Git: Open source control view');
  await expect(row()).toBeVisible();
  await row().getByText('Test', { exact: true }).click();
  await expectDiff(original, edited);
  const rightEditor = diff.locator('.cm-editor [contenteditable="true"]').last();
  await rightEditor.click();
  await rightEditor.press('ControlOrMeta+End');
  await rightEditor.pressSequentially('Edited in Git diff ');
  await page.keyboard.insertText('中文');
  await rightEditor.press('Enter');
  await expect.poll(() => fs.readFile(file, 'utf8'), { timeout: 10000 }).toBe(saved);
  await expect(page.getByRole('textbox', { name: 'Note editor', exact: true })).toContainText(
    'Edited in Git diff 中文',
  );
  await closeDiff();

  await row().locator('[aria-label="Stage"]').click();
  await expect.poll(() => git('show', ':Test.md')).toBe(saved);
  await expect(row().locator('[aria-label="Unstage"]')).toBeVisible();
  await row().getByText('Test', { exact: true }).click();
  await expectDiff(original, saved);
  await closeDiff();
  await row().locator('[aria-label="Unstage"]').click();
  await expect.poll(() => git('diff', '--cached', '--name-only')).toBe('');
  expect(await fs.readFile(file, 'utf8')).toBe(saved);
  await expect(row().locator('[aria-label="Stage"]')).toBeVisible();
  await command('Git: Stage current file');
  await expect.poll(() => git('show', ':Test.md')).toBe(saved);

  const unstaged = path.join(root, 'Unstaged.md');
  await fs.writeFile(unstaged, 'Unstaged sentinel 中文\n');
  await command('Git: Commit staged with specific message');
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.modal input').fill('Native Git fixture commit');
  await page.locator('.modal input').press('Enter');
  await expect.poll(() => git('log', '-1', '--format=%s')).toBe('Native Git fixture commit\n');
  expect(git('show', 'HEAD:Test.md')).toBe(saved);
  expect(git('ls-tree', '--name-only', 'HEAD')).not.toContain('Unstaged.md');
  expect(await fs.readFile(unstaged, 'utf8')).toBe('Unstaged sentinel 中文\n');
  await fs.unlink(unstaged);
  const committed = git('rev-parse', 'HEAD').trim();
  await command('Git: Push');
  await expect.poll(() => git('ls-remote', 'origin', 'refs/heads/main')).toContain(committed);

  const peer = path.join(profile, 'peer');
  git('clone', '--branch', 'main', gitRemote, peer);
  gitAt(peer, 'config', 'user.name', 'Engine Compatibility Fixture');
  gitAt(peer, 'config', 'user.email', 'fixture@example.invalid');
  gitAt(peer, 'config', 'commit.gpgSign', 'false');
  gitAt(peer, 'config', 'core.hooksPath', os.platform() === 'win32' ? 'NUL' : '/dev/null');
  const pulled = saved + '\nIncoming local-remote fixture edit\n';
  await fs.writeFile(path.join(peer, 'Test.md'), pulled);
  gitAt(peer, 'add', 'Test.md');
  gitAt(peer, 'commit', '-m', 'Incoming fixture commit');
  gitAt(peer, 'push', 'origin', 'main');
  await command('Git: Pull');
  await expect.poll(() => fs.readFile(file, 'utf8')).toBe(pulled);
  await expect(page.getByRole('textbox', { name: 'Note editor', exact: true })).toContainText(
    'Incoming local-remote fixture edit',
  );

  await command('Git: Open history view');
  await history.getByText('Incoming fixture commit', { exact: false }).click();
  await expect(history.locator('[aria-label="Test.md"]')).toBeVisible();
  const later = pulled + '\nUncommitted history sentinel\n';
  await fs.writeFile(file, later);
  await expect(page.getByRole('textbox', { name: 'Note editor', exact: true })).toContainText(
    'Uncommitted history sentinel',
  );
  await history.locator('[aria-label="Test.md"]').getByText('Test', { exact: true }).click();
  await expectDiff(saved, pulled);
  await expect(diff.locator('.plugin-view-header strong')).not.toContainText('Working Tree');
  expect(await fs.readFile(file, 'utf8')).toBe(later);
  await closeDiff();
  await history.getByRole('button', { name: 'Close History', exact: true }).click();
  await source.getByRole('button', { name: 'Close Source Control', exact: true }).click();
  await expect(page.locator('.plugin-view-pane')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Note editor', exact: true })).toContainText(
    'Uncommitted history sentinel',
  );
  expect(await fs.readFile(file, 'utf8')).toBe(later);
  return [
    'explicit native profile uses real Node modules',
    'source control lists the actual modified file and opens working-tree diff with exact old/new lines',
    'typing in the real diff editor saves exact Unicode bytes and refreshes the native note',
    'individual source-control stage/unstage changes the real index and preserves working bytes',
    'staged diff matches HEAD and the index; command stage still works',
    'specific-message staged-only commit preserves an unrelated unstaged file',
    'push updates a disposable local bare remote',
    'pull imports a peer commit and refreshes the editor without credentials or Internet remotes',
    'expanded child-commit history diff excludes later working-tree edits and refreshes the reused title',
    'closing all plugin panes preserves the current native editor and exact disk bytes',
  ];
}
