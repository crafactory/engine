import { test, expect, _electron as electron } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { nativeTestEnv } from './native-env';
import { acceptDataviewReading } from './dataview-acceptance';
const corpus = JSON.parse(
  await fs.readFile(
    new URL('../docs/compatibility/community-corpus.json', import.meta.url),
    'utf8',
  ),
);
for (const plugin of corpus.plugins)
  test(`trusted renderer real plugin: ${plugin.name} ${plugin.tag}`, async ({}, testInfo) => {
    test.skip(
      !process.env.ENGINE_PLUGIN_CORPUS,
      'Optional corpus requires verified upstream inputs',
    );
    const source = path.resolve(process.env.ENGINE_PLUGIN_CORPUS!, plugin.directory);
    for (const [file, hash] of [
      ['main.js', plugin.main_sha256],
      ['manifest.json', plugin.manifest_sha256],
    ])
      expect(
        crypto
          .createHash('sha256')
          .update(await fs.readFile(path.join(source, file)))
          .digest('hex'),
      ).toBe(hash);
    const manifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-renderer-corpus-')),
      profile = await fs.mkdtemp(path.join(os.tmpdir(), 'engine-renderer-corpus-profile-'));
    const dir = path.join(root, '.crafactory/plugins', manifest.id);
    await fs.mkdir(dir, { recursive: true });
    const note =
      plugin.name === 'Dataview'
        ? '# Test\n\n#alpha\n\n```dataview\nTABLE file.name AS "Name", file.mtime AS "Modified"\n```\n\n```dataview\nTASK\n```\n\n```dataview\nLIST FROM "Folder"\n```\n\n```dataview\nLIST\nWHERE file.name = "Second"\n```\n\n```dataview\nLIST FROM ""\nSORT file.name DESC\nLIMIT 2\n```\n\n```dataview\nTABLE rows.file.name AS "Files", length(rows) AS "Count"\nGROUP BY file.folder\n```\n\n```dataview\nTABLE WITHOUT ID file.name AS "Name", Tag\nFLATTEN file.etags AS Tag\n```\n\n```dataviewjs\ndv.paragraph("JS " + dv.current().file.name)\n```\n\n```dataviewjs\nawait dv.view("View", {name: "Test"})\n```\n\nInline: `= this.file.name`\n\n- [ ] Task one\n- [x] Task two\n'
        : Array(400).fill('word').join(' ');
    await fs.writeFile(
      path.join(root, 'Test.md'),
      plugin.name === 'Templater'
        ? 'Original text'
        : plugin.name === 'Advanced Tables'
          ? '|Name|Value|\n|-|-|\n|One|1|\n|Two|2|\n'
          : note,
    );
    if (plugin.name === 'Templater') {
      await fs.mkdir(path.join(root, 'Templates'), { recursive: true });
      await fs.writeFile(path.join(root, 'Templates/Template.md'), 'Template body');
      await fs.writeFile(path.join(root, 'Templates/Create.md'), 'Created body');
      await fs.writeFile(
        path.join(root, 'Templates/Startup.md'),
        '<%* await tp.file.create_new("Startup created", "StartupCreated", false) %>',
      );
      await fs.writeFile(
        path.join(root, 'Templates/UserScript.md'),
        '<%* tR += await tp.user.hello() %>',
      );
      await fs.mkdir(path.join(root, 'Scripts'), { recursive: true });
      await fs.writeFile(
        path.join(root, 'Scripts/hello.js'),
        'module.exports = async () => "User script output";\n',
      );
    }
    if (plugin.name === 'Calendar (Beta)') {
      await fs.mkdir(path.join(root, 'Daily notes'), { recursive: true });
      await fs.mkdir(path.join(root, 'Templates'), { recursive: true });
      await fs.writeFile(path.join(root, 'Templates/Daily.md'), '# {{date}}\n\n');
    }
    if (plugin.name === 'Dataview') {
      await fs.writeFile(path.join(root, 'Second.md'), '# Second\n\n#alpha\n');
      await fs.mkdir(path.join(root, 'Folder'), { recursive: true });
      await fs.writeFile(
        path.join(root, 'Folder/Third.md'),
        '# Third\n\n#alpha\n\n- [ ] Third task\n',
      );
      await fs.writeFile(path.join(root, 'View.js'), 'dv.paragraph("VIEW " + input.name);');
    }
    if (plugin.name === 'Tasks') {
      await fs.writeFile(path.join(root, 'Test.md'), '# Test\n\n```tasks\nnot done\n```\n');
      await fs.writeFile(
        path.join(root, 'Tasks.md'),
        '# Tasks\n\n- [ ] Engine compatibility task\n- [x] Completed sentinel\n',
      );
    }
    const needsEval = ['Dataview', 'Templater', 'Kanban', 'Excalidraw'].includes(plugin.name);
    const needsNative = ['Git', 'Kanban', 'Excalidraw', 'Copilot'].includes(plugin.name);
    const gitEnvironment = {
      ...nativeTestEnv(profile),
      GIT_CONFIG_GLOBAL: os.platform() === 'win32' ? 'NUL' : '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
    };
    const gitAt = (cwd: string, ...args: string[]) =>
      execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: gitEnvironment });
    const git = (...args: string[]) => gitAt(root, ...args);
    const gitRemote = path.join(profile, 'remote.git');
    if (plugin.name === 'Git') {
      git('init', '-b', 'main');
      git('config', 'user.name', 'Engine Compatibility Fixture');
      git('config', 'user.email', 'fixture@example.invalid');
      git('config', 'commit.gpgSign', 'false');
      git('config', 'core.hooksPath', os.platform() === 'win32' ? 'NUL' : '/dev/null');
      await fs.writeFile(path.join(root, '.gitignore'), '.crafactory/\n');
      git('add', 'Test.md', '.gitignore');
      git('commit', '-m', 'Fixture initial commit');
      git('init', '--bare', gitRemote);
      git('remote', 'add', 'origin', gitRemote);
      git('push', '-u', 'origin', 'main');
    }
    if (needsEval || needsNative)
      await fs.writeFile(
        path.join(profile, 'trusted-renderer.json'),
        JSON.stringify({ unsafeEval: needsEval, nativePlugins: needsNative }),
      );
    for (const file of ['main.js', 'manifest.json'])
      await fs.copyFile(path.join(source, file), path.join(dir, file));
    if (plugin.styles_sha256) {
      const bytes = await fs.readFile(path.join(source, 'styles.css'));
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(plugin.styles_sha256);
      await fs.writeFile(path.join(dir, 'styles.css'), bytes);
    }
    if (plugin.name === 'Excalidraw') await fs.writeFile(path.join(dir, 'data.json'), '{}');
    const executablePath = process.env.E2E_EXECUTABLE_PATH;
    const launch = () =>
      electron.launch({
        executablePath,
        args: [
          '--no-sandbox',
          ...(executablePath ? [] : [path.resolve('electron/main.cjs')]),
          '--vault',
          root,
          '--user-data-dir=' + profile,
        ],
        env: gitEnvironment,
      });
    let app = await launch();
    try {
      const pageErrors: string[] = [],
        consoleErrors: string[] = [],
        orderedErrors: string[] = [];
      let page = await app.firstWindow();
      const trackPage = async () => {
        const observed = page;
        if (plugin.name === 'Excalidraw')
          await observed.addLocatorHandler(
            observed.locator('.excalidraw-release').first(),
            async (modal) => {
              await modal.getByRole('button', { name: 'Close plugin modal', exact: true }).click();
            },
          );
        page.on('console', (message) => {
          if (message.text().startsWith('[compat:')) console.log(message.text());
        });
        page.on('console', (message) => {
          if (message.type() === 'error' && message.text().startsWith('Plugin '))
            void message
              .args()[1]
              ?.evaluate((error) => (error as Error)?.stack)
              .then((stack) => console.log('PLUGIN STACK ' + plugin.name + ': ' + stack));
        });
        page.on('pageerror', (error) => {
          pageErrors.push(error.message);
          orderedErrors.push(error.message);
          console.error(plugin.name + ' runtime: ' + error.stack);
        });
        page.on('console', (message) => {
          if (message.type() === 'error') {
            consoleErrors.push(message.text());
            orderedErrors.push(message.text());
            console.error(plugin.name + ' console: ' + message.text());
          }
        });
      };
      await trackPage();
      await page.getByTestId('file-Test.md').click();
      await expect(page.locator('.note-title h1')).toHaveText('Test');
      if (needsEval) await expect(page).toHaveURL('engine://app/trusted.html');
      const settings = async () => {
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('button', { name: 'Community plugins', exact: true }).click();
      };
      await settings();
      await page
        .getByLabel('Runtime for ' + manifest.name, { exact: true })
        .selectOption('renderer');
      let control = page.getByRole('switch', { name: 'Enable ' + manifest.name, exact: true });
      await control.click();
      await page.getByTestId('dialog-submit').click();
      await expect
        .poll(
          async () =>
            (await control.isChecked()) || (await page.locator('.error-banner').count()) > 0,
          { timeout: 15000 },
        )
        .toBe(true);
      let outcome = 'STARTUP_ONLY',
        blocker = '',
        workflows: string[] = [];
      if (await page.locator('.error-banner').count()) {
        blocker = await page.locator('.error-banner span').innerText();
        outcome = blocker.includes('Unsupported Obsidian capability:')
          ? 'UNSUPPORTED_STARTUP'
          : 'LOAD_ERROR';
        await expect(control).not.toBeChecked();
        await expect(page.locator('.plugin-status-item')).toHaveCount(0);
      } else if (plugin.name === 'Style Settings') {
        // Original fixture CSS follows the public @settings format; upstream bytes stay untouched.
        const css =
          '/* @settings\nname: Engine Probe\nid: engine-probe\nsettings:\n  - id: engine-probe-toggle\n    title: Probe toggle\n    type: class-toggle\n  - id: engine-probe-color\n    title: Probe color\n    type: variable-text\n    default: red\n  - id: engine-probe-choice\n    title: Probe choice\n    type: variable-select\n    default: narrow\n    options:\n      - narrow\n      - wide\n  - id: engine-probe-number\n    title: Probe number\n    type: variable-number\n    default: 10\n    format: px\n  - id: engine-probe-slider\n    title: Probe slider\n    type: variable-number-slider\n    default: 12\n    min: 8\n    max: 24\n    step: 1\n    format: px\n*/\nbody { --engine-probe-color: red; --engine-probe-choice: narrow; --engine-probe-number: 10px; --engine-probe-slider: 12px; }\nbody.engine-probe-toggle { --engine-visible-probe: 1; }';
        const openStyleSettings = async () => {
          await page.addStyleTag({ content: css });
          await page.evaluate(() => (window as any).app.workspace.trigger('parse-style-settings'));
          await page
            .getByRole('button', { name: 'Plugin settings ' + manifest.name, exact: true })
            .click();
          await page
            .locator('.plugin-settings-content')
            .getByText('Engine Probe', { exact: true })
            .click();
        };
        const effects = () =>
          page.evaluate(() => [
            document.body.classList.contains('engine-probe-toggle'),
            getComputedStyle(document.body).getPropertyValue('--engine-probe-color').trim(),
            getComputedStyle(document.body).getPropertyValue('--engine-visible-probe').trim(),
            getComputedStyle(document.body).getPropertyValue('--engine-probe-choice').trim(),
            getComputedStyle(document.body).getPropertyValue('--engine-probe-number').trim(),
            getComputedStyle(document.body).getPropertyValue('--engine-probe-slider').trim(),
          ]);
        await openStyleSettings();
        await page.getByRole('switch', { name: 'Probe toggle', exact: true }).check();
        await page.getByRole('textbox', { name: 'Probe color', exact: true }).fill('#123456');
        await page.getByRole('textbox', { name: 'Probe color', exact: true }).press('Tab');
        await page.getByLabel('Probe choice', { exact: true }).selectOption('wide');
        await page.getByLabel('Probe number', { exact: true }).fill('14');
        await page.getByLabel('Probe number', { exact: true }).press('Tab');
        const slider = page.getByRole('slider', { name: 'Probe slider', exact: true });
        await slider.focus();
        await slider.press('Home');
        for (let i = 0; i < 10; i++) await slider.press('ArrowRight');
        await expect(slider).toHaveValue('18');
        await expect(slider).toHaveAttribute('title', '18');
        await expect(slider).toHaveAttribute('aria-valuetext', '18');
        await expect.poll(effects).toEqual([true, '#123456', '1', 'wide', '14px', '18px']);
        const saved = {
          'engine-probe@@engine-probe-toggle': true,
          'engine-probe@@engine-probe-color': '#123456',
          'engine-probe@@engine-probe-choice': 'wide',
          'engine-probe@@engine-probe-number': 14,
          'engine-probe@@engine-probe-slider': 18,
        };
        await expect
          .poll(async () => JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8')))
          .toEqual(saved);
        const search = page.locator('.plugin-settings-content').getByRole('searchbox');
        await search.fill('Probe color');
        await expect(
          page.getByRole('switch', { name: 'Probe toggle', exact: true }),
        ).not.toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Probe color', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Clear search', exact: true }).click();
        await expect(page.getByRole('switch', { name: 'Probe toggle', exact: true })).toBeVisible();
        await app.close();
        app = await launch();
        page = await app.firstWindow();
        await trackPage();
        await page.getByTestId('file-Test.md').click();
        await settings();
        await page
          .getByLabel('Runtime for ' + manifest.name, { exact: true })
          .selectOption('renderer');
        const restartedControl = page.getByRole('switch', {
          name: 'Enable ' + manifest.name,
          exact: true,
        });
        await restartedControl.click();
        await page.getByTestId('dialog-submit').click();
        await expect(restartedControl).toBeChecked();
        await openStyleSettings();
        await expect(page.getByRole('switch', { name: 'Probe toggle', exact: true })).toBeChecked();
        await expect(page.getByRole('textbox', { name: 'Probe color', exact: true })).toHaveValue(
          '#123456',
        );
        await expect(page.getByLabel('Probe choice', { exact: true })).toHaveValue('wide');
        await expect(page.getByLabel('Probe number', { exact: true })).toHaveValue('14');
        await expect(page.getByRole('slider', { name: 'Probe slider', exact: true })).toHaveValue(
          '18',
        );
        await expect.poll(effects).toEqual([true, '#123456', '1', 'wide', '14px', '18px']);
        expect(JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8'))).toEqual(saved);
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        workflows = [
          'parse original @settings CSS using the documented rescan event',
          'expand real class-toggle, variable-text, variable-select, variable-number and variable-number-slider settings',
          'UI changes affect computed CSS and persist exact plugin data',
          'range Home/ArrowRight events update slider and formatted CSS',
          'search filters controls and clear restores them',
          'application restart and re-enable restore all five controls, computed CSS and persisted values; theme/snippet management and other setting kinds unverified',
        ];
      } else if (plugin.name === 'Tasks') {
        expect(
          await page.evaluate(
            () => (window as any).app.metadataTypeManager.getAllProperties().tq_explain.type,
          ),
        ).toBe('checkbox');
        await page.getByTestId('settings-close').click();
        await page.getByTestId('mode-reading').click();
        const block = page.locator('.reading-surface .plugin-code-block');
        await expect(block).toContainText('Engine compatibility task', { timeout: 15000 });
        await expect(block).not.toContainText('Completed sentinel');
        // Completing a filtered task removes its checkbox; assert persisted state, not the removed control.
        await block.locator('input[type=checkbox]').first().click();
        await expect
          .poll(() => fs.readFile(path.join(root, 'Tasks.md'), 'utf8'))
          .toContain('- [x] Engine compatibility task');
        await expect(block).not.toContainText('Engine compatibility task');
        workflows = [
          'not-done query renders a task from another note and excludes completed tasks',
          'checking a rendered task persists completion to the original note and refreshes the query',
        ];
        outcome = 'BOUNDED_WORKFLOWS_PASS';
      } else if (plugin.name === 'Dataview') {
        await page.getByRole('button', { name: 'Plugin settings Dataview', exact: true }).click();
        await page.getByRole('switch', { name: 'Enable JavaScript queries', exact: true }).check();
        await page.getByTestId('settings-close').click();
        await page.getByTestId('mode-reading').click();
        await acceptDataviewReading(page, testInfo);
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        workflows = [
          'TABLE file.name/file.mtime',
          'TASK',
          'LIST FROM folder',
          'LIST WHERE file.name',
          'LIST SORT/LIMIT',
          'GROUP BY folder',
          'FLATTEN etags',
          'DataviewJS',
          'dv.view custom view',
          'inline query',
        ];
      } else if (plugin.name === 'Templater') {
        await page
          .getByRole('button', { name: 'Plugin settings ' + manifest.name, exact: true })
          .click();
        const folder = page.getByLabel('Template folder location', { exact: true });
        await folder.fill('Templates');
        await folder.press('Tab');
        const scripts = page.getByLabel('User scripts folder', { exact: true });
        await scripts.fill('Scripts');
        await scripts.press('Tab');
        await page.getByRole('switch', { name: 'Automatic jump to cursor', exact: true }).check();
        await page.getByLabel('User script intellisense', { exact: true }).selectOption('4');
        await expect
          .poll(async () => {
            try {
              const data = JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8'));
              return [
                data.templates_folder,
                data.user_scripts_folder,
                data.auto_jump_to_cursor,
                data.intellisense_render,
              ];
            } catch {
              return null;
            }
          })
          .toEqual(['Templates', 'Scripts', true, '4']);
        const dangerous = page.getByRole('switch', {
          name: 'Trigger Templater on new file creation',
          exact: true,
        });
        await dangerous.click();
        const warning = page.getByRole('dialog', {
          name: 'Trigger Templater on new file creation',
          exact: true,
        });
        await expect(warning).toContainText('dangerous');
        await warning.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(dangerous).not.toBeChecked();
        await dangerous.click();
        await warning.getByRole('checkbox').check();
        await warning.getByRole('button', { name: 'Enable', exact: true }).click();
        await expect(dangerous).toBeChecked();
        await expect(warning).toHaveCount(0);
        await expect
          .poll(
            async () =>
              JSON.parse(
                await page.evaluate(() => localStorage.getItem('templater-local-settings') || '{}'),
              ).trigger_on_file_creation,
          )
          .toBe(true);
        const startup = page.getByRole('switch', { name: 'Enable startup templates', exact: true });
        await startup.click();
        const startupWarning = page.getByRole('dialog', {
          name: 'Enable startup templates',
          exact: true,
        });
        await expect(
          startupWarning.getByRole('button', { name: 'Enable', exact: true }),
        ).toBeDisabled();
        await expect(startup).not.toBeChecked();
        await startupWarning.getByRole('checkbox').check();
        await startupWarning.getByRole('button', { name: 'Enable', exact: true }).click();
        await expect(startup).toBeChecked();
        await expect
          .poll(
            async () =>
              JSON.parse(
                await page.evaluate(() => localStorage.getItem('templater-local-settings') || '{}'),
              ).enable_startup_templates,
          )
          .toBe(true);
        await page.getByRole('button', { name: 'Add new startup template', exact: true }).click();
        const startupDialog = page.getByRole('dialog', {
          name: 'Add startup template',
          exact: true,
        });
        await startupDialog.getByLabel('Template', { exact: true }).fill('Templates/Startup.md');
        await startupDialog.getByRole('button', { name: 'Done', exact: true }).click();
        await expect
          .poll(async () => {
            try {
              return JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8'))
                .startup_templates;
            } catch {
              return null;
            }
          })
          .toEqual(['Templates/Startup.md']);
        await page.getByRole('button', { name: 'Add template hotkey', exact: true }).click();
        const hotkey = page.getByRole('dialog').nth(1);
        await hotkey.getByLabel('Template', { exact: true }).fill('Templates/Template');
        await hotkey.getByRole('switch', { name: 'Insert command', exact: true }).check();
        await hotkey.getByRole('button', { name: 'Done', exact: true }).click();
        await expect
          .poll(async () => {
            try {
              return JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8'))
                .enabled_templates_hotkeys;
            } catch {
              return null;
            }
          })
          .toEqual(['Templates/Template']);
        await page.getByTestId('settings-close').click();
        await app.close();
        app = await launch();
        page = await app.firstWindow();
        await trackPage();
        await page.getByTestId('file-Test.md').click();
        await expect(page.locator('.note-title h1')).toHaveText('Test');
        await settings();
        await page
          .getByLabel('Runtime for ' + manifest.name, { exact: true })
          .selectOption('renderer');
        control = page.getByRole('switch', { name: 'Enable ' + manifest.name, exact: true });
        await control.click();
        await page.getByTestId('dialog-submit').click();
        await expect(control).toBeChecked();
        await page
          .getByRole('button', { name: 'Plugin settings ' + manifest.name, exact: true })
          .click();
        await expect(page.getByLabel('Template folder location', { exact: true })).toHaveValue(
          'Templates',
        );
        await expect(page.getByLabel('User scripts folder', { exact: true })).toHaveValue(
          'Scripts',
        );
        await expect(
          page.getByRole('switch', { name: 'Automatic jump to cursor', exact: true }),
        ).toBeChecked();
        await expect(
          page.getByRole('switch', { name: 'Trigger Templater on new file creation', exact: true }),
        ).toBeChecked();
        await expect(
          page.getByRole('switch', { name: 'Enable startup templates', exact: true }),
        ).toBeChecked();
        await expect(page.getByLabel('User script intellisense', { exact: true })).toHaveValue('4');
        await expect(page.locator('.plugin-settings-content')).toContainText('Templates/Template');
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
        await expect
          .poll(async () => {
            try {
              return JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8'))
                .enabled_templates_hotkeys;
            } catch {
              return null;
            }
          })
          .toEqual([]);
        await page.getByTestId('settings-close').click();
        await expect
          .poll(async () =>
            fs.readFile(path.join(root, 'StartupCreated.md'), 'utf8').catch(() => null),
          )
          .toBe('Startup created');
        await page.getByTestId('note-editor').click();
        await page.keyboard.press('Control+End');
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page
          .getByTestId('palette-input')
          .fill(manifest.name + ': Open insert template modal');
        await page.keyboard.press('Enter');
        const picker = page.getByRole('dialog');
        await expect(picker).toBeVisible();
        await picker.getByRole('button', { name: /^(Templates\/)?Template$/ }).click();
        await expect(page.getByTestId('note-editor')).toContainText('Template body');
        await expect
          .poll(async () => fs.readFile(path.join(root, 'Test.md'), 'utf8'))
          .toBe('Original textTemplate body');
        await settings();
        await control.click();
        await expect(control).not.toBeChecked();
        await control.click();
        await page.getByTestId('dialog-submit').click();
        await expect(control).toBeChecked();
        await page.getByTestId('settings-close').click();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page
          .getByTestId('palette-input')
          .fill(manifest.name + ': Open insert template modal');
        await expect(page.locator('.palette-list')).toContainText(
          manifest.name + ': Open insert template modal',
        );
        await page.keyboard.press('Escape');
        await page.getByTestId('note-editor').click();
        await page.keyboard.press('Control+End');
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page
          .getByTestId('palette-input')
          .fill(manifest.name + ': Open insert template modal');
        await page.keyboard.press('Enter');
        const userPicker = page.getByRole('dialog');
        await expect(userPicker).toBeVisible();
        await userPicker.getByRole('button', { name: /^(Templates\/)?UserScript$/ }).click();
        await expect(page.getByTestId('note-editor')).toContainText('User script output');
        await expect
          .poll(async () => fs.readFile(path.join(root, 'Test.md'), 'utf8'))
          .toBe('Original textTemplate bodyUser script output');
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page
          .getByTestId('palette-input')
          .fill(manifest.name + ': Create new note from template');
        await page.keyboard.press('Enter');
        const createPicker = page.getByRole('dialog');
        await expect(createPicker).toBeVisible();
        await createPicker.getByRole('button', { name: /^(Templates\/)?Create$/ }).click();
        await expect(page.locator('.note-title h1')).toHaveText('Untitled');
        await expect(page.getByTestId('note-editor')).toContainText('Created body');
        await expect
          .poll(async () => fs.readFile(path.join(root, 'Untitled.md'), 'utf8'))
          .toBe('Created body');
        expect(pageErrors).toEqual([]);
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        workflows = [
          'template folder, toggle and dropdown settings persist across restart',
          'dangerous setting cancel/confirm persists locally across restart',
          'startup template runs and creates an exact note after restart',
          'user script function inserts exact output',
          'template hotkey list add/delete and restart persistence',
          'insert template into active note',
          'persist exact editor content',
          'disable/re-enable re-registers command',
          'create new note from template and open exact content',
        ];
      } else if (plugin.name === 'Advanced Tables') {
        await page.getByTestId('settings-close').click();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page
          .getByTestId('palette-input')
          .fill(manifest.name + ': Format table at the cursor');
        await page.keyboard.press('Enter');
        const formatted =
          '| Name | Value |\n| ---- | ----- |\n| One  | 1     |\n| Two  | 2     |\n';
        await expect(page.getByTestId('note-editor')).toContainText('| Name | Value |');
        await expect
          .poll(async () => fs.readFile(path.join(root, 'Test.md'), 'utf8'))
          .toBe(formatted);
        expect(pageErrors).toEqual([]);
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        workflows = ['format table at cursor', 'exact editor/disk persistence'];
      } else if (plugin.name === 'Calendar (Beta)') {
        await page.getByTestId('settings-close').click();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill(manifest.name + ': Open view');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');
        const calendar = page.locator('.plugin-view-content');
        await expect(calendar).toContainText('Sun');
        const now = new Date(),
          date =
            now.getFullYear() +
            '-' +
            String(now.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(now.getDate()).padStart(2, '0');
        await calendar.locator('.day.today').click();
        const create = page.getByRole('dialog').last();
        await expect(create).toContainText('New Daily Note');
        await create.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(page.locator('.note-title h1')).toHaveText(date);
        await expect(page.getByTestId('note-editor')).toContainText(date);
        await expect
          .poll(async () => fs.readFile(path.join(root, 'Daily notes', date + '.md'), 'utf8'))
          .toBe('# ' + date + '\n\n');
        expect(pageErrors).toEqual([]);
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        workflows = [
          'open calendar view',
          'create today daily note from template',
          'exact daily note content and open',
        ];
      } else if (plugin.name === 'Reading Time') {
        const status = page.locator('.plugin-status-item');
        await expect(status).toHaveText('2 min read');
        await page
          .getByRole('button', { name: 'Plugin settings ' + manifest.name, exact: true })
          .click();
        await page.getByLabel('Reading speed', { exact: true }).fill('100');
        await expect(status).toHaveText('4 min read');
        await expect
          .poll(
            async () =>
              JSON.parse(await fs.readFile(path.join(dir, 'data.json'), 'utf8')).readingSpeed,
          )
          .toBe(100);
        await page.getByTestId('settings-close').click();
        await page.getByTestId('mode-reading').click();
        await expect(status).toHaveText('4 min read');
        await page.getByTestId('mode-source').click();
        await page.getByTestId('note-editor').click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.insertText(Array(800).fill('word').join(' '));
        await expect(status).toHaveText('8 min read', { timeout: 6000 });
        const wordModifier = process.platform === 'darwin' ? 'Alt' : 'Control';
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowUp' : 'Control+Home');
        for (let i = 0; i < 10; i++) await page.keyboard.press(wordModifier + '+Shift+ArrowRight');
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill(manifest.name + ': Selected Text');
        await page.keyboard.press('Enter');
        const modal = page.getByRole('dialog', {
          name: 'Reading Time of Selected Text',
          exact: true,
        });
        await expect(modal).toContainText('1 min read');
        await expect(modal).toContainText('(at 100 wpm)');
        await page.keyboard.press('Escape');
        await expect(modal).toHaveCount(0);
        await settings();
        await control.click();
        await expect(control).not.toBeChecked();
        await expect(status).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Plugin settings ' + manifest.name, exact: true }),
        ).toHaveCount(0);
        await control.click();
        await page.getByTestId('dialog-submit').click();
        await expect(control).toBeChecked();
        await expect(status).toHaveText('8 min read');
        await page
          .getByRole('button', { name: 'Plugin settings ' + manifest.name, exact: true })
          .click();
        await expect(page.getByLabel('Reading speed', { exact: true })).toHaveValue('100');
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        workflows = [
          '400-word document at 200 wpm',
          'reading speed setting saves 100 wpm',
          'reading/source transition retains 4 min',
          'editor-change: 800 words -> 8 min',
          '10-word selection modal at 100 wpm',
          'Escape closes modal',
          'disable removes status and settings',
          're-enable restores setting and 8 min',
        ];
      }
      if (
        plugin.name === 'Reading Time' ||
        plugin.name === 'Dataview' ||
        plugin.name === 'Templater' ||
        plugin.name === 'Advanced Tables' ||
        plugin.name === 'Calendar (Beta)' ||
        plugin.name === 'Tasks'
      )
        expect(outcome).toBe('BOUNDED_WORKFLOWS_PASS');
      if (outcome === 'STARTUP_ONLY' && plugin.name === 'Excalidraw') {
        await page.getByTestId('settings-close').click();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page
          .getByTestId('palette-input')
          .fill('Excalidraw: Create new drawing - IN A NEW TAB');
        await page
          .locator('.palette-list button')
          .filter({ hasText: /^Excalidraw: Create new drawing - IN A NEW TAB$/ })
          .click();
        await page.waitForTimeout(1000);
        await expect(page.locator('.plugin-view-pane canvas').first()).toBeVisible({
          timeout: 10000,
        });
        const drawingPath = await page.evaluate(
          () => (window as any).app.workspace.getActiveFile().path as string,
        );
        const initialDrawing = await fs.readFile(path.join(root, drawingPath), 'utf8'),
          canvas = page.locator('.plugin-view-pane canvas').last(),
          bounds = await canvas.boundingBox();
        expect(bounds).not.toBeNull();
        const rectangleTool = page.getByRole('button', { name: 'Rectangle', exact: true });
        await rectangleTool.click();
        await expect
          .poll(() =>
            page.evaluate(() => {
              const ea = (window as any).ExcalidrawAutomate;
              ea.setView('active');
              return ea.getExcalidrawAPI()?.getAppState().activeTool.type;
            }),
          )
          .toBe('rectangle');
        await page.mouse.move(bounds!.x + 350, bounds!.y + 350);
        await page.mouse.down();
        // Real frame-paced movement avoids collapsing every drag event into one render frame.
        for (let step = 1; step <= 8; step++) {
          await page.mouse.move(bounds!.x + 350 + 25 * step, bounds!.y + 350 + 17.5 * step);
          await page.evaluate(
            () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
          );
        }
        await page.mouse.up();
        await expect
          .poll(() =>
            page.evaluate(() => {
              const ea = (window as any).ExcalidrawAutomate;
              ea.setView('active');
              return ea
                .getExcalidrawAPI()
                ?.getSceneElements()
                .some((el: any) => el.type === 'rectangle' && el.width > 100 && el.height > 50);
            }),
          )
          .toBe(true);
        // Public plugin scripting API, not bundle inspection: https://zsviczian.github.io/obsidian-excalidraw-plugin/API/utility.html
        const rectangles = () =>
          page.evaluate(() => {
            const ea = (window as any).ExcalidrawAutomate;
            ea.setView('active');
            return ea
              .getViewElements()
              .filter((element: any) => element.type === 'rectangle' && !element.isDeleted)
              .map((element: any) => ({
                id: element.id,
                width: element.width,
                height: element.height,
              }));
          });
        await expect.poll(async () => (await rectangles()).length).toBe(1);
        const originalRectangles = await rectangles();
        expect(originalRectangles[0].width).toBeGreaterThan(100);
        await page.keyboard.press('ControlOrMeta+s');
        await expect
          .poll(() => fs.readFile(path.join(root, drawingPath), 'utf8'), { timeout: 15000 })
          .not.toBe(initialDrawing);
        await page.getByTestId('file-Test.md').click();
        await expect(page.locator('.retained-plugin-view:not([hidden]) canvas')).toHaveCount(0);
        await page
          .getByRole('tablist', { name: 'Open files' })
          .getByRole('button', {
            name: drawingPath.split('/').pop()!.replace(/\.md$/, ''),
            exact: true,
          })
          .click();
        await expect(page.locator('.plugin-view-pane canvas').first()).toBeVisible({
          timeout: 10000,
        });
        await expect.poll(rectangles).toEqual(originalRectangles);
        await app.close();
        app = await launch();
        page = await app.firstWindow();
        await trackPage();
        await settings();
        await page
          .getByLabel('Runtime for ' + manifest.name, { exact: true })
          .selectOption('renderer');
        const restartedControl = page.getByRole('switch', {
          name: 'Enable ' + manifest.name,
          exact: true,
        });
        await restartedControl.click();
        await page.getByTestId('dialog-submit').click();
        await expect(restartedControl).toBeChecked();
        await page.getByTestId('settings-close').click();
        await page.waitForFunction(() => Boolean((window as any).ExcalidrawAutomate));
        await page.evaluate(async (drawingPath) => {
          await (window as any).app.workspace.openLinkText(drawingPath, '', false);
        }, drawingPath);
        await page
          .waitForFunction(
            () => Boolean(document.querySelector('.plugin-view-pane canvas')),
            {},
            { timeout: 3000 },
          )
          .catch(() => {});
        if (!(await page.locator('.plugin-view-pane canvas').count())) {
          await page.getByRole('button', { name: 'Command palette', exact: true }).click();
          await page
            .getByTestId('palette-input')
            .fill('Toggle between Excalidraw and Markdown mode');
          await page
            .locator('.palette-list button')
            .filter({ hasText: /Toggle between Excalidraw and Markdown mode$/ })
            .click();
        }
        await expect(page.locator('.plugin-view-pane canvas').first()).toBeVisible();
        await expect.poll(rectangles).toEqual(originalRectangles);
        outcome = pageErrors.length ? 'BOUNDED_WORKFLOWS_WITH_ERRORS' : 'BOUNDED_WORKFLOWS_PASS';
        blocker = pageErrors[0] ?? '';
        workflows = [
          'create drawing Markdown',
          'draw rectangle via real canvas pointer input',
          'save changes to actual vault file',
          'switch documents without destroying the view',
          'restart application, reopen saved drawing and verify exact rectangle identity and dimensions',
        ];
      }
      if (outcome === 'STARTUP_ONLY' && plugin.name === 'Git') {
        await page.getByTestId('settings-close').click();
        await fs.appendFile(path.join(root, 'Test.md'), '\nNative Git fixture edit\n');
        await expect(page.locator('.cm-content')).toContainText('Native Git fixture edit');
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill('Git: Stage current file');
        await page
          .locator('.palette-list button')
          .filter({ hasText: 'Git: Stage current file' })
          .click();
        await expect.poll(() => git('diff', '--cached', '--name-only')).toContain('Test.md');
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill('Git: Commit staged with specific message');
        await page
          .locator('.palette-list button')
          .filter({ hasText: 'Git: Commit staged with specific message' })
          .click();
        await expect(page.locator('.modal')).toBeVisible();
        console.log('GIT COMMIT DIALOG ' + (await page.locator('.modal').innerText()));
        await page.locator('.modal input').fill('Native Git fixture commit');
        await page.locator('.modal input').press('Enter');
        await expect
          .poll(() => git('log', '-1', '--format=%s'))
          .toContain('Native Git fixture commit');
        expect(git('show', 'HEAD:Test.md')).toContain('Native Git fixture edit');
        const committed = git('rev-parse', 'HEAD').trim();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill('Git: Push');
        await page
          .locator('.palette-list button')
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
          .locator('.palette-list button')
          .filter({ hasText: /^Git: Pull$/ })
          .click();
        await expect
          .poll(() => fs.readFile(path.join(root, 'Test.md'), 'utf8'))
          .toContain('Incoming local-remote fixture edit');
        await expect(page.locator('.cm-content')).toContainText(
          'Incoming local-remote fixture edit',
        );
        workflows = [
          'explicit native profile uses real Node modules',
          'stage current file updates the real index',
          'commit staged with specific message creates a local commit containing the edit',
          'push updates a disposable local bare remote',
          'pull imports a peer commit and refreshes the real editor; no credentials or Internet remote used',
        ];
        outcome = 'BOUNDED_WORKFLOWS_PASS';
      }
      if (outcome === 'STARTUP_ONLY' && plugin.name === 'Kanban') {
        await page.getByTestId('settings-close').click();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill('Kanban: Create new board');
        await page
          .locator('.palette-list button')
          .filter({ hasText: /^Kanban: Create new board$/ })
          .click();
        await expect
          .poll(async () => ({
            views: await page.locator('.plugin-view-pane').count(),
            dialogs: await page.locator('.plugin-modal').count(),
            errors: orderedErrors.length,
          }))
          .not.toEqual({ views: 0, dialogs: 0, errors: 0 });
        const boardPath = await page.evaluate(
          () => (window as any).app.workspace.activeLeaf.view.file.path as string,
        );
        const listTitle = page
          .locator(
            '.plugin-view-pane input[type="text"],.plugin-view-pane textarea,.plugin-view-pane [contenteditable="true"]',
          )
          .first();
        await listTitle.fill('Tasks');
        await page
          .locator('.plugin-view-pane button')
          .filter({ hasText: /^Add list$/ })
          .click();
        await expect
          .poll(() => fs.readFile(path.join(root, boardPath), 'utf8'))
          .toContain('## Tasks');
        await page
          .locator('.plugin-view-pane button')
          .filter({ hasText: /^Done$/ })
          .click();
        await page.locator('.plugin-view-pane').getByText('Add a card').click();
        await page
          .getByRole('textbox', { name: 'Embedded Markdown editor', exact: true })
          .fill('Compatibility card');
        await page
          .getByRole('textbox', { name: 'Embedded Markdown editor', exact: true })
          .press('Enter');
        await expect
          .poll(async () =>
            (await fs.readFile(path.join(root, boardPath), 'utf8')).includes(
              '- [ ] Compatibility card',
            ),
          )
          .toBe(true);
        await expect(
          page.locator('.plugin-view-pane').getByText('Compatibility card', { exact: true }),
        ).toBeVisible();
        const cardText = page
          .locator('.kanban-plugin__item-wrapper')
          .getByText('Compatibility card', { exact: true });
        await cardText.click();
        await cardText.dblclick();
        const cardEditor = page
          .locator('.kanban-plugin__item-wrapper')
          .getByRole('textbox', { name: 'Embedded Markdown editor', exact: true });
        await cardEditor.fill('Edited compatibility card');
        await cardEditor.press('Enter');
        await expect(
          page
            .locator('.kanban-plugin__item')
            .getByText('Edited compatibility card', { exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Open board settings', exact: true }).click();
        const boardSettings = page.getByRole('dialog');
        await boardSettings
          .getByRole('switch', { name: 'Display card checkbox', exact: true })
          .check();
        await boardSettings
          .getByRole('button', { name: 'Close plugin modal', exact: true })
          .click();
        await page.locator('.kanban-plugin__item input[type=checkbox]').check();
        await page.getByRole('button', { name: 'Add a list', exact: true }).click();
        await page
          .getByRole('textbox', { name: 'Embedded Markdown editor', exact: true })
          .last()
          .fill('Done');
        await page
          .locator('.plugin-view-pane button')
          .filter({ hasText: /^Add list$/ })
          .click();
        await page
          .locator('.plugin-view-pane button')
          .filter({ hasText: /^Done$/ })
          .click();
        const lanes = page.locator('.kanban-plugin__lane');
        await expect
          .poll(() =>
            lanes.first().locator('.kanban-plugin__item-wrapper').getAttribute('data-hitboxid'),
          )
          .not.toBeNull();
        const start = (await lanes.first().locator('.kanban-plugin__item-title').boundingBox())!,
          target = (await lanes
            .nth(1)
            .locator('.kanban-plugin__placeholder[data-hitboxid]')
            .boundingBox())!;
        const frame = () =>
          page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
              ),
          );
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2 + 8, {
          steps: 5,
        });
        await frame();
        await page.mouse.move(
          target.x + target.width / 2,
          target.y + Math.max(target.height / 2, 8),
          { steps: 30 },
        );
        await frame();
        await page.mouse.up();
        await expect(lanes.nth(1)).toContainText('Edited compatibility card');
        await expect(lanes.first().locator('.kanban-plugin__item')).toHaveCount(0);
        await expect
          .poll(() => fs.readFile(path.join(root, boardPath), 'utf8'))
          .toMatch(/## Done\s+- \[x\] Edited compatibility card/);
        const savedBoard = await fs.readFile(path.join(root, boardPath), 'utf8');
        expect(savedBoard.match(/^## .*$/gm)).toEqual(['## Tasks', '## Done']);
        expect(savedBoard.match(/^- \[.\] .*$/gm)).toEqual(['- [x] Edited compatibility card']);
        expect(savedBoard).toContain('"show-checkboxes":true');
        await page.getByTestId('file-Test.md').click();
        await page.getByTestId('file-' + boardPath).click();
        await expect(
          page.locator('.plugin-view-pane').getByText('Tasks', { exact: true }),
        ).toBeVisible();
        await expect(
          lanes.nth(1).getByText('Edited compatibility card', { exact: true }),
        ).toBeVisible();
        expect(await fs.readFile(path.join(root, boardPath), 'utf8')).toBe(savedBoard);
        await app.close();
        app = await launch();
        page = await app.firstWindow();
        await trackPage();
        await settings();
        await page
          .getByLabel('Runtime for ' + manifest.name, { exact: true })
          .selectOption('renderer');
        const restartedControl = page.getByRole('switch', {
          name: 'Enable ' + manifest.name,
          exact: true,
        });
        await restartedControl.click();
        await page.getByTestId('dialog-submit').click();
        await expect(restartedControl).toBeChecked();
        await page.getByTestId('settings-close').click();
        await page.getByTestId('file-' + boardPath).click();
        await page
          .waitForFunction(
            () => Boolean(document.querySelector('.kanban-plugin')),
            {},
            { timeout: 3000 },
          )
          .catch(() => {});
        if (!(await page.locator('.kanban-plugin').count())) {
          await page.getByRole('button', { name: 'Command palette', exact: true }).click();
          await page.getByTestId('palette-input').fill('Toggle between Kanban and markdown mode');
          await page
            .locator('.palette-list button')
            .filter({ hasText: /Toggle between Kanban and markdown mode$/ })
            .click();
        }
        await expect(
          page.locator('.plugin-view-pane').getByText('Tasks', { exact: true }),
        ).toBeVisible();
        await expect(
          page
            .locator('.kanban-plugin__lane')
            .nth(1)
            .getByText('Edited compatibility card', { exact: true }),
        ).toBeVisible();
        await expect(
          page.locator('.kanban-plugin__lane').nth(1).locator('input[type=checkbox]'),
        ).toBeChecked();
        expect(await fs.readFile(path.join(root, boardPath), 'utf8')).toBe(savedBoard);
        expect([...pageErrors, ...consoleErrors]).toEqual([]);
        outcome = 'BOUNDED_WORKFLOWS_PASS';
        blocker =
          'None in the tested board/list/card/edit/completion/pointer-move workflow; other movement and integration modes unverified';
        workflows = [
          'create board and list using real embedded Markdown input',
          'submit a card and verify unchecked Markdown persistence',
          'double-click edit a card through the owned embedded editor',
          'open board settings and enable visible completion checkbox',
          'complete card and create a second list',
          'real frame-paced pointer drag moves completed card between lists',
          'verify section ownership, checked Markdown, saved checkbox configuration and exact bytes across document switch',
          'restart application, re-enable and verify moved card, checked state and exact saved Markdown; other drag/order modes and cross-plugin integrations unverified',
        ];
      }
      if (outcome === 'STARTUP_ONLY') {
        if (await page.getByTestId('settings-close').isVisible())
          await page.getByTestId('settings-close').click();
        await page.getByRole('button', { name: 'Command palette', exact: true }).click();
        await page.getByTestId('palette-input').fill(manifest.name + ':');
        await page.waitForTimeout(2500);
        console.log(
          'COMMANDS ' + plugin.name + ': ' + (await page.locator('.palette-list').innerText()),
        );
        await page.keyboard.press('Escape');
        if (orderedErrors.length) {
          outcome = 'STARTUP_WITH_ERRORS';
          blocker = orderedErrors[0];
        }
      }
      // A diagnostic refusal is not an acceptable regression for an already proven workflow.
      if (plugin.name !== 'Copilot')
        expect(outcome).toBe(
          plugin.name === 'Excalidraw' ? 'BOUNDED_WORKFLOWS_WITH_ERRORS' : 'BOUNDED_WORKFLOWS_PASS',
        );
      if (outcome === 'BOUNDED_WORKFLOWS_PASS') expect(pageErrors).toEqual([]);
      if (outcome === 'BOUNDED_WORKFLOWS_WITH_ERRORS')
        expect(
          pageErrors.filter(
            (error) =>
              error !==
              'Unsupported Obsidian capability: Obsidian core Canvas plugin. See docs/PLUGIN-COMPATIBILITY.md.',
          ),
        ).toEqual([]);
      if (outcome.startsWith('BOUNDED_WORKFLOWS_'))
        expect(
          consoleErrors.filter((error) =>
            /\b(?:CompatibilityError|TypeError|ReferenceError|Error):/.test(error),
          ),
        ).toEqual([]);
      const platform =
        process.platform === 'linux'
          ? 'Linux x64 Electron'
          : process.platform === 'darwin'
            ? 'macOS ' + process.arch + ' Electron'
            : process.platform + ' ' + process.arch + ' Electron';
      const nativeEnabled = await page.evaluate(
        () => typeof (window as any).require === 'function',
      );
      expect(nativeEnabled).toBe(needsNative);
      const unsafeEvalEnabled = await page.evaluate(() => window.engine!.unsafeEval!());
      expect(unsafeEvalEnabled).toBe(needsEval);
      const result = {
        name: plugin.name,
        repo: plugin.repo,
        tag: plugin.tag,
        manifest_version: manifest.version,
        main_sha256: plugin.main_sha256,
        manifest_sha256: plugin.manifest_sha256,
        styles_sha256: plugin.styles_sha256 ?? null,
        native_enabled: nativeEnabled,
        unsafe_eval_enabled: unsafeEvalEnabled,
        platform,
        mode: 'trusted renderer (explicit opt-in, not sandboxed)',
        outcome,
        first_blocker: blocker,
        functional_workflows: workflows.length ? workflows : 'NOT_RUN',
        runtime_errors: pageErrors,
        console_errors: consoleErrors,
        checked_at: new Date().toISOString(),
      };
      testInfo.annotations.push({ type: 'compatibility', description: JSON.stringify(result) });
      if (process.env.ENGINE_RENDERER_CORPUS_REPORT) {
        await fs.mkdir(process.env.ENGINE_RENDERER_CORPUS_REPORT, { recursive: true });
        await fs.writeFile(
          path.join(process.env.ENGINE_RENDERER_CORPUS_REPORT, plugin.directory + '.json'),
          JSON.stringify(result, null, 2) + '\n',
        );
      }
    } finally {
      await app.close();
      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(profile, { recursive: true, force: true });
    }
  });
