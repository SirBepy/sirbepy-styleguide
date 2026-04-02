# bepy-styleguide

Joe's design system, hosted on CDN via GitHub Pages.

## What's here

- **Styleguide explorer** - `index.html` showcases all components, typography, colors, and utilities
- **4 themes** - Void, Glacier, Cosmo, Nebula - all using CSS custom properties
- **Settings widget** - floating gear button with theme switcher, background, and about panel
- **Compiled styleguide** - `styleguide.css` with reusable component classes

## CDN usage

Projects pull themes and widgets from this repo via jsDelivr:

```
https://cdn.jsdelivr.net/gh/sirbepy/bepy-project-init@main/themes/theme-void.css
https://cdn.jsdelivr.net/gh/sirbepy/bepy-project-init@main/widget/settings.js
https://cdn.jsdelivr.net/gh/sirbepy/bepy-project-init@main/styleguide.css
```

## Themes

| Theme       | Description           |
| ----------- | --------------------- |
| **Void**    | Dark purple - default |
| **Glacier** | Cool blue-grey        |
| **Cosmo**   | Vibrant and colorful  |
| **Nebula**  | Deep space tones      |

All themes define CSS custom properties (`--color-primary`, `--font-heading`, `--radius-card`, etc.) that the styleguide components consume.

## Repo structure

```
bepy-project-init/
  index.html         - Styleguide explorer page
  styleguide.css     - Compiled component classes
  themes/            - Theme CSS files
  widget/            - Settings widget + animated background
  package.json       - Repo metadata
```
