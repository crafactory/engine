# Security and data safety

Engine is pre-1.0 software. Make an independent backup before opening an important vault. Local snapshots and trash are convenience recovery mechanisms, not a complete backup strategy.

The Electron renderer uses context isolation, sandboxing, no Node integration, a restricted preload bridge, sender/frame-checked IPC, and a content-security policy. Vault paths are checked for lexical traversal and symlink escapes. Markdown HTML is disabled and rendered markup is sanitized. Mermaid runs in strict mode and the Bases evaluator does not use `eval`.

These safeguards are not a claim of a completed security audit. Filesystem operations are subject to cross-process races, OS permissions and filesystem semantics. Attachment loading is capped at 64 MB and note text at 32 MB. Indexed text files are loaded into memory; very large vaults are not yet performance-validated.

Only enable trusted local plugins. Plugins are off by default and have note read/write privileges when enabled. Custom CSS can change or obscure UI; it is not imported automatically from another application's settings.

There is no telemetry, account login, automatic remote sync, or update downloader. Embedded HTTPS pages and external images can contact third parties when intentionally opened or included in a note.

Do not publish security exploit details in a public issue. Use the repository's private vulnerability reporting facility when enabled; otherwise contact the repository maintainer privately before disclosure.
