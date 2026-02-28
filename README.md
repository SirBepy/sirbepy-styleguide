# bepy-project-init

A CLI tool for initializing new personal web projects with a single command.

## What it does

Scaffolds a new Vite (vanilla JS) or React project with a consistent, opinionated baseline:

- Guided prompts for project name, framework, styleguide, and PWA
- Vite scaffolding with boilerplate cleaned up and replaced with minimal stubs
- Optional Sass styleguide setup with design tokens
- Optional PWA setup (manifest, icons via SVG → PNG, `vite-plugin-pwa`)
- Git initialized with an initial commit

## Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)
- Git

For PWA icon generation only:
- `sharp` installed globally: `npm install -g sharp`

## Setup

Clone this repo to `~/scripts/`:

```bash
git clone https://github.com/YOUR_USERNAME/bepy-project-init ~/scripts
```

On macOS/Linux, make the launcher executable:

```bash
chmod +x ~/scripts/init.sh
```

## Usage

Navigate to an empty folder where you want your new project, then run:

**macOS/Linux:**
```bash
~/scripts/init.sh
```

**Windows (PowerShell):**
```powershell
~/scripts/init.ps1
```

The script will prompt you through the rest. It automatically pulls the latest templates from GitHub on each run — update a template once, every future project gets it.

## Structure

```
~/scripts/
  init.sh              ← Bash launcher
  init.ps1             ← PowerShell launcher
  init.js              ← Core logic (Node.js)
  svg-to-png.js        ← PWA icon helper
  templates/
    vite/              ← Templates for Vite vanilla projects
    react/             ← Templates for React projects
    ...                ← Shared templates
```

## Templates

All generated file content lives in `templates/`. Edit any template to change what every future project starts with — no need to modify the scripts.
