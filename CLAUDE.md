# CLAUDE.md

This file provides context and guidance for Claude Code when working in this repository.

## Project Overview

**turbo-octo-system** is an AI workspace. This repository is in its early stages — add project-specific details here as it evolves.

## Development Commands

> Update these sections as the project's language, framework, and tooling are established.

### Install Dependencies
```bash
# e.g. npm install | pip install -e . | bundle install
```

### Run Tests
```bash
# e.g. npm test | pytest | cargo test
```

### Run Linter
```bash
# e.g. npm run lint | ruff check . | clippy
```

### Build
```bash
# e.g. npm run build | cargo build
```

## Repository Conventions

- **Default branch**: `main`
- **Feature branches**: Use descriptive names, e.g. `feature/my-feature` or `fix/bug-description`
- **Commit style**: Clear, imperative messages (e.g. "Add user authentication")

## Claude Code Session Hook

A `SessionStart` hook is configured at `.claude/hooks/session-start.sh`. It runs automatically at the start of each Claude Code web session to install dependencies and prepare the environment.

To update the hook as new dependencies are added, edit `.claude/hooks/session-start.sh`.

## Notes for Claude

- This is an early-stage repository. When asked to add features, check for existing patterns first.
- Keep solutions simple and avoid over-engineering.
- When adding a new language or framework, update this file with the relevant commands above.
