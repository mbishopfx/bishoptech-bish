# BISH Listener Desktop

This is the macOS-first Tauri desktop shell for the BISH local listener.

## Current v1 scope

- Configure BISH base URL, listener secret, workspace path, and tunnel strategy
- Start or stop the packaged listener wrapper
- Check prerequisites for `bun`, `gemini`, and `codex`
- Open the handoff output folder
- Install the macOS LaunchAgent bootstrap

## Current runtime assumption

The first desktop build still expects these local tools to exist on the operator machine:

- `bun`
- `gemini`
- `codex`

That keeps the first DMG listener-only and avoids turning the desktop app into a full local BISH appliance.

## Local development

```bash
bun install
bun run --cwd apps/listener-desktop build:web
```

For full Tauri development/builds you also need:

- Rust toolchain (`cargo`, `rustc`)
- Apple signing + notarization assets for release DMGs
