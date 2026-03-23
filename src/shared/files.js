"use strict";

const fs = require("fs");
const path = require("path");
const state = require("../state");
const { GREEN, RED, YELLOW, RESET } = require("./colors");

function track(p) {
  state.createdFiles.push(path.resolve(p));
}

function snapshotPreExisting() {
  state.preExistingFiles.clear();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isFile()) {
        state.preExistingFiles.add(fullPath);
      } else if (entry.isDirectory()) {
        walk(fullPath);
      }
    }
  }
  walk(process.cwd());
}

function assertSafeToOverwrite(destPath) {
  const resolvedPath = path.resolve(destPath);
  if (fs.existsSync(resolvedPath) && state.preExistingFiles.has(resolvedPath)) {
    throw new Error(`Refusing to overwrite pre-existing file: ${resolvedPath}`);
  }
}

function copyTemplate(relSrc, destPath, substitutions) {
  const srcPath = path.join(state.scriptDir, "templates", relSrc);
  let content = fs.readFileSync(srcPath, "utf8");
  for (const key of Object.keys(substitutions)) {
    content = content.replaceAll("{{" + key + "}}", substitutions[key]);
  }
  assertSafeToOverwrite(destPath);
  fs.writeFileSync(destPath, content);
  track(destPath);
}

function cleanup() {
  console.log(YELLOW + "🧹 Cleaning up..." + RESET);
  let allOk = true;
  for (let i = state.createdFiles.length - 1; i >= 0; i--) {
    const p = state.createdFiles[i];
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (e) {
      allOk = false;
    }
  }
  if (allOk) {
    console.log(GREEN + "Folder restored to pre-run state." + RESET);
  } else {
    console.log(RED + "Cleanup incomplete — some files may remain. Check the folder manually." + RESET);
  }
}

function mergeGitignore(destPath) {
  const templatePath = path.join(state.scriptDir, "templates", "gitignore");
  const templateContent = fs.readFileSync(templatePath, "utf8");
  const existed = fs.existsSync(destPath);
  const existingContent = existed ? fs.readFileSync(destPath, "utf8") : "";

  const templateLines = templateContent.split("\n").map((l) => l.trim());
  const existingLines = existingContent.split("\n").map((l) => l.trim());

  const missingLines = templateLines.filter(
    (l) => l.length > 0 && !l.startsWith("#") && !existingLines.includes(l),
  );

  if (!existed) {
    fs.writeFileSync(destPath, templateContent);
    track(destPath);
  } else if (missingLines.length > 0) {
    const merged =
      existingContent.trimEnd() +
      "\n\n# Added by bepy-project-init\n" +
      missingLines.join("\n") +
      "\n";
    fs.writeFileSync(destPath, merged);
  }
}

function injectIntoHtml(htmlPath, options = {}) {
  let html = fs.readFileSync(htmlPath, "utf8");

  if (options.googleFonts && !html.includes("fonts.googleapis.com")) {
    const fontsLink =
      '    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=Fredoka:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">\n';
    html = html.replace("</head>", fontsLink + "  </head>");
  }

  if (options.voidTheme) {
    html = html.replace(/<style id="active-theme">[\s\S]*?<\/style>/, "");
    html = html.replace(/(<html\b[^>]*?)(\s*>)/, '$1 data-theme="void"$2');
    const voidCssPath = path.join(state.scriptDir, "themes", "theme-void.css");
    if (fs.existsSync(voidCssPath)) {
      const voidCss = fs.readFileSync(voidCssPath, "utf8");
      const styleBlock = '    <style id="active-theme">\n' + voidCss + "\n    </style>\n";
      html = html.replace("</head>", styleBlock + "  </head>");
    }
  }

  if (options.widgetTag && !html.includes("sirbepy.github.io")) {
    const widgetScript =
      '    <script src="https://sirbepy.github.io/bepy-project-init/widget/settings.js"></script>\n';
    html = html.replace("</body>", widgetScript + "  </body>");
  }

  if (options.buildInfoScript && !html.includes("build-info.js")) {
    const buildInfoTag =
      '    <script type="module" src="assets/scripts/build-info.js"></script>\n';
    html = html.replace("</body>", buildInfoTag + "  </body>");
  }

  if (options.pwaManifest && !html.includes("manifest.json")) {
    const pwaTags =
      '    <link rel="manifest" href="/manifest.json">\n' +
      '    <meta name="theme-color" content="' + options.pwaThemeColor + '">\n';
    html = html.replace("</head>", pwaTags + "  </head>");
  }

  fs.writeFileSync(htmlPath, html);
}

module.exports = {
  track,
  snapshotPreExisting,
  assertSafeToOverwrite,
  copyTemplate,
  cleanup,
  mergeGitignore,
  injectIntoHtml,
};
