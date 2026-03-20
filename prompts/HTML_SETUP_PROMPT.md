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

## Step 1 — Favicon

Check if `src/favicon.png` exists. If it doesn't:

1. Look at the project name, `index.html`, and any existing code to understand what this project is
2. Design a simple, bold SVG icon that fits the project — solid shapes, minimal detail (it will be shown at 32px)
3. Write the SVG to `src/favicon.svg`
4. Run: `node "{{SVG_TO_PNG_PATH}}" src/favicon.svg src/favicon.png 256`
5. Add inside `<head>` in `index.html`:
   ```html
   <link rel="icon" type="image/png" href="src/favicon.png">
   ```

If `src/favicon.png` already exists, skip this step.

---

## Step 2 — README

Check if `README.md` exists. If it doesn't, generate one:
- Project name as heading
- Short description (infer from the code and project name)
- How to run: open `index.html` in a browser, or visit the GitHub Pages URL once deployed
- Keep it short — this is a simple project

If `README.md` already exists, skip this step.

---

## Step 3 — Meta tags

Open `index.html` and check for these meta tags. Add any that are missing:

```html
<meta name="description" content="...">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="src/favicon.png">
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

## Step 5 — Theme the page

**This step is required. Do not skip it.**

Open `src/styles.css`. Rewrite it so the page uses the CSS custom properties injected by the settings widget. Rules:

1. Replace any hardcoded background colors with `var(--color-background)`
2. Replace any hardcoded surface/card colors with `var(--color-surface)` or `var(--color-surface-alt)`
3. Replace any hardcoded text colors with `var(--color-text)` or `var(--color-text-muted)`
4. Replace any hardcoded border colors with `var(--color-border)`
5. Replace any hardcoded accent/highlight colors with `var(--color-primary)` or `var(--color-secondary)`
6. Replace any hardcoded `font-family` declarations with `var(--font-body)` or `var(--font-heading)` as appropriate
7. Add `body { background: var(--color-background); color: var(--color-text); font-family: var(--font-body); }` if not already present
8. Keep all layout, spacing, sizing, and structural rules exactly as they are — only replace color and font values

If the project has no styles yet (file is empty or just a comment), write a clean base that uses the variables for background, text, and fonts.

---

## Step 6 — Portfolio data

Generate portfolio data for this project. Create two files:

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
