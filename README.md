# bepy-project-init

A CLI tool for initializing new personal web projects with a single command.

## What it does

Scaffolds a new Vite (vanilla JS) or React project with a consistent, opinionated baseline:

- Guided prompts for project name, description, framework, styleguide, and PWA
- Vite scaffolding with boilerplate cleaned up and replaced with minimal stubs
- 4 built-in themes (Void, Glacier, Cosmo, Nebula) copied to `assets/themes/`
- Settings widget injected into every project — floating ⚙️ button with theme switcher, build info, and about panel
- Optional Sass styleguide setup with design tokens
- Optional PWA setup (manifest, icons via SVG → PNG, `vite-plugin-pwa`)
- GitHub Actions workflow for GitHub Pages deployment
- Git initialized with an initial commit
- **Upgrade mode** to retrofit existing projects with the same features

## Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)
- Git

For PWA icon generation only:

- `sharp` installed globally: `npm install -g sharp`

## One-time setup

### 1. Clone this repo

```bash
git clone https://github.com/sirbepy/bepy-project-init ~/scripts
```

### 2. Make the launcher executable (macOS/Linux)

```bash
chmod +x ~/scripts/init.sh
```

### 3. Customize the settings widget

Open `~/scripts/widget/settings.js` and fill in the `AUTHOR` constant at the top:

```js
const AUTHOR = {
  name: "SirBepy",
  github: "https://github.com/sirbepy",
  youtube: "https://youtube.com/@sirbepy",
};
```

This shows up in the About section of the settings panel in every generated project.

## Creating a new project

Navigate to an **empty folder** where you want your project, then run:

**macOS/Linux:**

```bash
~/scripts/init.sh
```

**Windows (PowerShell):**

```powershell
~/scripts/init.ps1
```

The script auto-updates itself from GitHub on each run, then walks you through:

| Prompt                  | Options                                      |
| ----------------------- | -------------------------------------------- |
| What do you want to do? | `1` Create new project, `2` Upgrade existing |
| Project name?           | Defaults to folder name                      |
| Rename folder to match? | `y` / `n`                                    |
| Project description?    | Optional, written into `package.json`        |
| Framework?              | `1` Vite (vanilla JS), `2` React             |
| Set up styleguide?      | `Y` / `n` — default yes                      |
| Set up as PWA?          | `y` / `N` — default no                       |

If you choose PWA, you'll also be asked for a hex theme color and an optional SVG icon path.

After that, dependencies are installed and git is initialized automatically.

### Next steps after init

```bash
npm run dev
git remote add origin <your-github-repo-url>
git push -u origin main
```

Pushing to GitHub triggers the included workflow which deploys to GitHub Pages automatically.

## Upgrading an existing project

Run the script from inside an existing project folder and choose option `2`. It will:

1. Check that git is initialized and offer to commit any uncommitted changes first
2. Detect what's missing: themes, settings widget tag, `build-info.js`, GitHub Actions workflow
3. Add only what's missing — existing files are never overwritten
4. Commit the changes as `chore: apply bepy-project-init upgrade`

## What gets created

```
my-project/
  index.html              ← cleaned up, fonts + void theme + widget injected
  vite.config.js          ← standard (or PWA config if opted in)
  package.json            ← with description filled in
  build-info.js           ← exposes BUILD_TIMESTAMP + PROJECT_NAME to window
  manifest.json           ← (PWA only)
  .gitignore
  src/
    main.js / main.jsx
    style.scss / index.scss
    App.jsx               ← (React only)
    App.scss              ← (React only)
    styleguide.scss       ← (if styleguide opted in)
    build-info.js         ← (React, inside src/)
    components/           ← (React only)
  assets/
    icons/                ← icon.svg + icon-192.png + icon-512.png (PWA only)
    images/
    themes/
      theme-void.css
      theme-glacier.css
      theme-cosmo.css
      theme-nebula.css
  .github/
    workflows/
      deploy.yml          ← GitHub Pages deployment
```

## Themes

Four themes are included out of the box, all using CSS custom properties:

| Theme       | Description           |
| ----------- | --------------------- |
| **Void**    | Dark purple — default |
| **Glacier** | Cool blue-grey        |
| **Cosmo**   | Vibrant and colorful  |
| **Nebula**  | Deep space tones      |

Themes live in `assets/themes/` as plain CSS files. The active theme is stored in `localStorage`. Users can switch themes live via the settings panel.

To add a custom theme: drop a `theme-yourname.css` file into `assets/themes/` — the widget picks it up automatically.

## Settings widget

Every project gets a floating ⚙️ button (top-right) that opens a settings panel:

- **App** — project name, description, and last build time
- **Theme** — buttons for each theme in `assets/themes/`
- **About** — your name, links to GitHub and YouTube (from `AUTHOR` in `widget/settings.js`)
- **Feedback** — link to a Google Form

Build time is populated by the GitHub Actions workflow via `build-info.js`. In local dev it shows "Local build".

## Toolkit structure

```
~/scripts/
  init.sh              ← Bash launcher (macOS/Linux)
  init.ps1             ← PowerShell launcher (Windows)
  init.js              ← Core logic (Node.js)
  svg-to-png.js        ← PWA icon generator
  themes/
    theme-void.css
    theme-glacier.css
    theme-cosmo.css
    theme-nebula.css
  widget/
    settings.js        ← Settings panel widget (edit AUTHOR here)
  templates/
    vite/              ← Templates for Vite vanilla projects
    react/             ← Templates for React projects
    README.md          ← Template copied into each new project
    build-info.js
    deploy.yml
    deploy-react.yml
    manifest.json
    styleguide.scss
    ...
```

Edit any file in `templates/` to change what every future project starts with.
