# HTML Project Setup

You are finishing the setup of a simple HTML/CSS/JS project. The scaffolding is already done — your job is to do the final polish passes below, in order.

The project has:
- `index.html`
- `src/styles.css`
- `src/script.js`
- `.github/workflows/deploy.yml` — deploys to GitHub Pages on push to main
- `.prettierrc` and `.gitignore`

Themes are served from CDN at runtime. The settings widget (also CDN) injects a `<style>` tag that sets CSS custom properties like `--color-background`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-secondary`, `--color-border`, `--font-heading`, `--font-body`, `--font-mono`, `--radius-card`, `--radius-badge`, `--shadow-card`.

The SVG-to-PNG converter is at: `{{SVG_TO_PNG_PATH}}`
Usage: `node "{{SVG_TO_PNG_PATH}}" <input.svg> <output.png> <size>`

---

## Pre-Step — Migrate legacy file structure

Before doing anything else, check for and fix any of these legacy patterns:

### 1. Move root-level JS/CSS into src/

If `script.js` exists in the project root and `src/script.js` does NOT exist:
- Move `script.js` to `src/script.js`
- In `index.html`, update `<script src="script.js">` to `<script src="src/script.js">`

If `style.css` or `styles.css` exists in the project root and `src/styles.css` does NOT exist:
- Move the file to `src/styles.css`
- In `index.html`, update the `<link>` stylesheet href to `src/styles.css`

If neither case applies, skip this part.

### 2. Remove build-info.js

If `build-info.js` exists in the project root:
- Delete it
- Remove its `<script>` tag from `index.html` (it is replaced by the settings widget added in Step 4)

### 3. Update the workflow

Read `.github/workflows/deploy.yml`. If it doesn't match the template below, rewrite it to match exactly:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

If the file already matches, skip this part.

---

## Step 0 — Split JavaScript if needed

Read `src/script.js`. If it is large (over ~150 lines) or contains one or more big inline data structures (arrays of objects, lookup tables, static config), split it:

- Move each large data structure to its own file, e.g. `src/data.js` or `src/data/flashcards.js`
- Keep logic and UI code in `src/script.js`
- Update `index.html` to load the new files with `<script>` tags in the right order (data files before script.js)

Only split if there is a clear boundary. Do not split a small or simple script.

---

## Step 1 — Favicon

Check if `assets/images/favicon.png` exists. If it doesn't, also check `src/favicon.png` (legacy location). If found in `src/`, move it to `assets/images/favicon.png` and update the `<link rel="icon">` href in `index.html`.

If neither exists:

1. Look at the project name, `index.html`, and any existing code to understand what this project is
2. Design a simple, bold SVG icon that fits the project — solid shapes, minimal detail (it will be shown at 32px)
3. Write the SVG to `assets/images/favicon.svg`
4. Run: `node "{{SVG_TO_PNG_PATH}}" assets/images/favicon.svg assets/images/favicon.png 256`
5. Add inside `<head>` in `index.html`:
   ```html
   <link rel="icon" type="image/png" href="assets/images/favicon.png">
   ```

If `assets/images/favicon.png` already exists, skip this step.

---

## Step 2 — README

Check if `README.md` exists. If it doesn't, generate one:
- Project name as heading
- Short description (infer from the code and project name)
- How to run: open `index.html` in a browser
- A **Live** link to the GitHub Pages URL

To get the GitHub Pages URL:
1. Run `git remote get-url origin`
2. If it returns a URL like `https://github.com/username/repo.git` or `git@github.com:username/repo.git`, extract `username` and `repo` and construct: `https://username.github.io/repo/`
3. If the remote is not set or the command fails, use the placeholder: `https://<username>.github.io/<repo-name>/`

Include the live link in the README like:
```
**Live:** https://username.github.io/repo/
```

Keep the README short overall — this is a simple project.

If `README.md` already exists, check if it has a live link. If it doesn't, add one using the same URL logic above.

---

## Step 3 — Meta tags

Open `index.html` and check for these meta tags. Add any that are missing:

```html
<meta name="description" content="...">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="assets/images/favicon.png">
<meta name="twitter:card" content="summary">
```

Infer description from the project. Place all meta tags inside `<head>`.

---

## Step 4 — Settings widget

**This step is required. Do not skip it.**

1. Read `index.html` and check if there is already an element with `position: fixed` or `position: absolute` in the top-right corner
2. Add the following lines to `index.html` just before `</body>`. This is mandatory:

```html
<!-- Settings widget - comment out to disable -->
<script src="https://cdn.jsdelivr.net/gh/sirbepy/bepy-project-init@main/widget/settings.js"></script>
```

If something is already fixed/absolute in the top-right, insert this line BEFORE the script tag to move the widget:

```html
<script>window.__SETTINGS_CORNER = 'top-left';</script>
```

---

## Step 5 — Animated background

**This step is required. Do not skip it.**

Add these lines to `index.html` just before `</body>`, after the settings widget script:

```html
<!-- Animated background. To disable: set window.BEPY_BACKGROUND = false before this tag. To use a custom SVG: set window.BEPY_BG_PATTERN = 'your-pattern.svg' before this tag. -->
<script src="https://cdn.jsdelivr.net/gh/sirbepy/bepy-project-init@main/widget/background.js"></script>
```

Do not add this if a `background.js` script tag already exists.

---

## Step 6 — Theme the page

**This step is required. Do not skip it.**

Open `src/styles.css`. Rewrite it so the page uses the CSS custom properties injected by the settings widget. Rules:

1. **Backgrounds:** If the page has an animated gradient, multi-stop gradient, or decorative background effect, keep the effect but replace the hardcoded colors inside it with theme palette colors (`var(--color-primary)`, `var(--color-secondary)`, `var(--color-background)`, `var(--color-surface)`, etc.). Do not flatten a gradient into a solid color. If the background is already a plain solid color, replace it with `var(--color-background)`.
2. Replace any hardcoded surface/card colors with `var(--color-surface)` or `var(--color-surface-alt)`
3. Replace any hardcoded text colors with `var(--color-text)` or `var(--color-text-muted)`
4. Replace any hardcoded border colors with `var(--color-border)`
5. Replace any hardcoded accent/highlight colors with `var(--color-primary)` or `var(--color-secondary)`
6. Replace any hardcoded `font-family` declarations with `var(--font-body)` or `var(--font-heading)` as appropriate
7. Add `body { color: var(--color-text); font-family: var(--font-body); }` if not already present. Do NOT add a `background` property to `body` or `html` — the animated background script handles it.
8. Remove any existing `background` or `background-color` rules from `body`, `html`, or any full-page wrapper element — the background script is the single source of truth for the page background.
9. Keep all layout, spacing, sizing, and structural rules exactly as they are — only replace color and font values

If the project has no styles yet (file is empty or just a comment), write a clean base that uses the variables for background, text, and fonts.

---

## Step 7 — Portfolio data

Check if `.portfolio-data/metadata.json` already exists. If it does, skip this step entirely.

Otherwise, generate portfolio data for this project. Create two files:

### `.portfolio-data/metadata.json`

```json
{
  "title": "",
  "shortDescription": "",
  "type": "Web App",
  "status": "in-progress",
  "languages": ["HTML", "CSS", "JavaScript"],
  "frameworks": [],
  "liveUrl": null,
  "mainImage": null,
  "images": [],
  "year": 0,
  "impressiveness": 0
}
```

Fill all fields by reading the project. `liveUrl` should be `null` unless you can determine the GitHub Pages URL. `impressiveness` is 1–5 (1 = tiny script, 5 = flagship project) — flag your guess.

### `.portfolio-data/PORTFOLIO.md`

Three short sections, 150–250 words total:

**The What** — what the project is and how it's used
**The Why** — why it was built
**The How** — interesting technical details (skip entirely if nothing interesting to say)

---

When all steps are done, do not commit — the tool will handle that.
