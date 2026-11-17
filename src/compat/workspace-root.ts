const roots = new WeakMap<Document, ReturnType<typeof createRoot>>();

/** The current host has one document root, not an Obsidian split/popout tree. */
function createRoot(doc: Document) {
  return {
    doc,
    get win() {
      return doc.defaultView;
    },
    get containerEl() {
      return doc.querySelector('main') ?? doc.body;
    },
    getRoot() {
      return this;
    },
    getContainer() {
      return this;
    },
  };
}

/** Share root identity across plugin owners without retaining retired documents. */
export function workspaceRoot(doc: Document) {
  let root = roots.get(doc);
  if (!root) {
    root = createRoot(doc);
    roots.set(doc, root);
  }
  return root;
}
