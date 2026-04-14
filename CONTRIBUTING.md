# Contributing to Rift

Thanks for your interest in contributing to [Rift](https://github.com/Compound-inc/rift).

We welcome thoughtful contributions to the codebase, documentation, and developer/AI experience.

Before contributing, please read this guide so your work aligns with the project direction and current repository structure.

## Before You Start

For small fixes, feel free to open a pull request directly.

For larger changes, please open an issue first before you start implementing. This is especially important for:

- New features
- Architecture changes
- Data model changes
- Sync / Zero behavior changes
- Auth, billing, or workspace policy changes
- Major UI refactors
- Changes touching self-hosting or deployment flows

Opening an issue first helps avoid duplicated work and makes it easier to confirm that the change fits the project roadmap.

When contributing:

- Keep app-specific changes inside `apps/*`
- Keep reusable/shared logic inside `packages/*`
- Avoid broad cross-repo refactors unless they are clearly justified

## Development Setup

For full local setup instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md).