export const demo: Record<string,string> = {
  'Welcome.md': `---
tags: [getting-started, thinking]
status: evergreen
aliases: [Start here]
---
# A home for your thinking

Good ideas rarely arrive fully formed. Give them a place to grow.

This is your **local-first knowledge workspace**. Write in plain Markdown, connect ideas with [[links]], and follow the connections wherever they lead. Your notes are files, not records in someone else's database.

> [!tip] Start with one thought
> Press **Ctrl / Cmd + N** to create a note, or **Ctrl / Cmd + O** to find one. Nothing needs to be perfectly organized before you begin.

## Make it yours

- [x] Open your first note
- [ ] Write something worth keeping
- [ ] Link it to another idea
- [ ] Explore your knowledge graph

## A few paths to follow

Read [[Guides/Getting started|Getting started]] for the essentials. Explore [[Ideas/Connected thinking|Connected thinking]] for a different way to work. Or open [[Projects/Engine.canvas|the project canvas]] to see ideas side by side.

| When you want to… | Try this |
| --- | --- |
| Capture a thought | New note · Ctrl / Cmd + N |
| Find a note | Quick switcher · Ctrl / Cmd + O |
| Search everything | Search · Ctrl / Cmd + Shift + F |
| See the big picture | Graph view |
| Keep a daily log | [[Daily notes/2026-10-11]] |

## Built around your files

Notes use Markdown. Properties use YAML. Visual boards use the open JSON Canvas format. Copy your vault anywhere and keep working.

==Your knowledge belongs to you.==
`,
  'links.md': `# Links\n\nA link is a small act of synthesis. Use \`[[Note name]]\` to connect two ideas, and \`[[Note name|display text]]\` when you want a different label.\n\nSee [[Ideas/Connected thinking]] and [[Guides/Getting started#Connect your ideas]].\n\n## Going deeper\n\nUse \`[[Note#Heading]]\` for a section, \`[[Note#^block-id]]\` for a block, and \`![[Note]]\` to embed another note.`,
  'Guides/Getting started.md': `---
tags: [guide]
status: evergreen
---
# Getting started

## Write naturally

Start typing. Use **bold**, *italic*, \`inline code\`, ==highlights==, and ~~strikethrough~~. Headings give your notes a little structure.

Switch between source, live editing, and reading using the controls above the note.

## Connect your ideas

Type \`[[\` to find and link another note. Each link creates a connection you can follow in the graph.

- [[Ideas/Connected thinking]]
- [[Ideas/Small pieces, loosely joined]]
- [[links]]

## Build a daily practice

Open today's daily note from the ribbon. Templates in your [[Templates/Meeting|Templates folder]] can give recurring notes a consistent shape.

## Work with properties

Inline properties store metadata in YAML frontmatter. Use tags to discover related notes and the [[Projects/Library.base|Library]] to browse them in a table.

> [!note] The browser preview is temporary
> Install the desktop application to open an actual folder and persist your files. This preview uses an in-memory example vault.
`,
  'Ideas/Connected thinking.md': `---
tags: [thinking, knowledge]
status: seedling
created: 2026-10-11
---
# Connected thinking

Instead of deciding where an idea belongs, ask what it connects to.

Every note can be a starting point. Every link is a doorway. A collection of small, well-connected ideas is easier to explore than a hierarchy of perfect folders.

## Connections over categories

[[Ideas/Small pieces, loosely joined]] describes the same principle from a different angle. [[Reading/How to take smart notes]] offers a practice for putting it to work.

> [!quote] A useful question
> What does this remind me of?

A network of notes becomes more useful with every meaningful connection. ^network

## A simple model

The value of a network grows with its useful edges, not just its number of nodes.

$$
G = (V, E)
$$

#knowledge/graphs
`,
  'Ideas/Small pieces, loosely joined.md': `---
tags: [thinking, systems]
status: evergreen
---
# Small pieces, loosely joined

Keep each note focused enough to be useful on its own. Connect it to context rather than repeating that context everywhere.

This makes ideas reusable. One observation might matter to [[Projects/Engine]], [[Ideas/Connected thinking]], and something you have not started yet.

## In practice

1. Capture an observation.
2. Give it a descriptive name.
3. Link it to one relevant note.
4. Return when you have something to add.
`,
  'Reading/How to take smart notes.md': `---
tags: [reading, knowledge]
author: Sönke Ahrens
status: reading
rating: 4
---
# How to take smart notes

Reading notes are most useful when they become thinking notes. Write ideas in your own words, connect them to what you already know, and let questions lead the next reading session.

## Notes

- A permanent note should be understandable without the original source.
- Links are arguments about why two ideas belong together.
- Writing makes the gaps in understanding visible.

Related: [[Ideas/Connected thinking]], [[Ideas/Small pieces, loosely joined]].
`,
  'Projects/Engine.md': `---
tags: [project, software]
status: active
priority: 1
---
# Crafactory Engine

An independent, open-source home for connected thinking.

## Principles

- Plain files first.
- Keep data portable.
- Make connections visible.
- Build with open resources.

## Next actions

- [x] Establish the local vault engine
- [x] Add Markdown editing and reading
- [ ] Deepen interoperability testing
- [ ] Ship signed desktop packages

Explore the [[Projects/Engine.canvas|planning canvas]] and [[Projects/Library.base|note library]].

## Architecture

\`\`\`mermaid
flowchart LR
  Editor --> Vault
  Vault --> Files
  Vault --> Graph
  Vault --> Canvas
\`\`\`
`,
  'Daily notes/2026-10-11.md': `---
tags: [daily]
---
# 2026-10-11

## Today

- [ ] Capture one useful idea
- [ ] Revisit [[Ideas/Connected thinking]]

## Notes

A little space to think, one day at a time.
`,
  'Templates/Meeting.md': `---
tags: [meeting]
date: "{{date}}"
---
# {{title}}

## Context

## Discussion

## Next actions

- [ ]
`,
  'Templates/Daily.md': `---\ntags: [daily]\n---\n# {{date}}\n\n## Today\n\n- [ ] \n\n## Notes\n\n`,
  'Projects/Library.base': `views:\n  - type: table\n    name: All notes\n    order: [file.name, note.status, note.tags, file.folder]\n`,
  'Projects/Engine.canvas': JSON.stringify({nodes:[
    {id:'one',type:'text',x:80,y:100,width:290,height:200,color:'4',text:'# Crafactory Engine\n\nPlain files. Connected ideas.\nAn open home for your thinking.'},
    {id:'two',type:'file',file:'Ideas/Connected thinking.md',x:510,y:40,width:300,height:250},
    {id:'three',type:'text',x:510,y:360,width:300,height:180,color:'5',text:'## Next questions\n\n- What is worth keeping?\n- What does it connect to?\n- How will I find it again?'}
  ],edges:[{id:'e1',fromNode:'one',fromSide:'right',toNode:'two',toSide:'left',label:'connect'},{id:'e2',fromNode:'two',fromSide:'bottom',toNode:'three',toSide:'top'}]},null,2)
};
