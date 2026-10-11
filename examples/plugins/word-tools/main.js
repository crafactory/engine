// Original example plugin, MIT licensed. Runs in a Web Worker.
engine.registerCommand('count-vault', 'Word tools: count words across the vault', () => {
  const words = engine.notes
    .filter(note => note.path.endsWith('.md'))
    .reduce((sum, note) => sum + (note.content.match(/[\p{L}\p{N}]+/gu)?.length || 0), 0);
  engine.notice(`${words.toLocaleString()} words across your Markdown notes.`);
});
