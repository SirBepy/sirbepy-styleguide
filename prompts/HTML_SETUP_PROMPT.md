# HTML Project Setup

You are finishing the setup of a simple HTML/CSS/JS project. The scaffolding is already done — your job is to do the final polish passes below, in order.

The project has:
- `index.html`
- `src/styles.css`
- `src/script.js`
- `src/themes/` — theme CSS files (theme-void.css, theme-cosmo.css, theme-glacier.css, theme-nebula.css)
- `.github/workflows/deploy.yml` — deploys to GitHub Pages on push to main
- `.prettierrc` and `.gitignore`

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

## Step 4 — Theme

Add the void theme to `index.html`. Inside `<head>`, add this **before** the `src/styles.css` link:

```html
<link rel="stylesheet" href="src/themes/theme-void.css">
```

If it's already there, skip this step.

---

## Step 5 — Portfolio data

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
