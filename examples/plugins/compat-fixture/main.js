// Original test/example plugin, not copied from Obsidian's sample plugin.
const {Plugin, Notice} = require('obsidian');
module.exports = class CompatibilityFixture extends Plugin {
  async onload() {
    const previous = await this.loadData();
    await this.saveData({loads: (previous?.loads || 0) + 1, unloaded: false});
    this.addCommand({id: 'create', name: 'Create a test note', callback: async () => {
      const file = await this.app.vault.create('Compatibility.md', '# Compatibility\n');
      await this.app.vault.append(file, 'Original plugin, independent runtime.\n');
      new Notice('Created ' + file.path);
    }});
    this.addCommand({id: 'edit', name: 'Replace the selection',
      editorCallback: editor => editor.replaceSelection('PLUGIN')});
    this.addCommand({id: 'count', name: 'Count Markdown files', callback: () =>
      new Notice(String(this.app.vault.getMarkdownFiles().length))});
  }
  async onunload() {
    const previous = await this.loadData();
    await this.saveData({...previous, unloaded: true});
  }
};
