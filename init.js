#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");
const readline = require("readline");
const os = require("os");

// ─── Color constants ───────────────────────────────────────────────────────────
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

// ─── Module-level state ────────────────────────────────────────────────────────
let scriptDir = path.dirname(process.argv[1]);
let projectName = "";
let framework = "";
let setupStyleguide = false;
let setupPwa = false;
let themeColor = "";
let createdFiles = [];
let preExistingFiles = new Set();
let upgradeMode = null; // null = not yet determined
let projectDescription = "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─── Utility functions ─────────────────────────────────────────────────────────

function prompt(label, defaultVal, validator) {
  return new Promise((resolve) => {
    function ask() {
      const display =
        YELLOW +
        label +
        (defaultVal ? " [" + defaultVal + "]" : "") +
        ": " +
        RESET;
      rl.question(display, (answer) => {
        const value = answer.trim() === "" ? defaultVal : answer.trim();
        if (validator && !validator(value)) {
          ask();
        } else {
          resolve(value);
        }
      });
    }
    ask();
  });
}

function track(p) {
  createdFiles.push(path.resolve(p));
}

function snapshotPreExisting() {
  preExistingFiles.clear();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isFile()) {
        preExistingFiles.add(fullPath);
      } else if (entry.isDirectory()) {
        walk(fullPath);
      }
    }
  }
  walk(process.cwd());
}

function assertSafeToOverwrite(destPath) {
  const resolvedPath = path.resolve(destPath);
  if (fs.existsSync(resolvedPath) && preExistingFiles.has(resolvedPath)) {
    throw new Error(`Refusing to overwrite pre-existing file: ${resolvedPath}`);
  }
}

function substitute(filePath, substitutions) {
  let content = fs.readFileSync(filePath, "utf8");
  for (const key of Object.keys(substitutions)) {
    content = content.replaceAll("{{" + key + "}}", substitutions[key]);
  }
  fs.writeFileSync(filePath, content);
}

function copyTemplate(relSrc, destPath, substitutions) {
  const srcPath = path.join(scriptDir, "templates", relSrc);
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
  for (let i = createdFiles.length - 1; i >= 0; i--) {
    const p = createdFiles[i];
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (e) {
      allOk = false;
    }
  }
  if (allOk) {
    console.log(GREEN + "Folder restored to pre-run state." + RESET);
  } else {
    console.log(
      RED +
        "Cleanup incomplete — some files may remain. Check the folder manually." +
        RESET,
    );
  }
}

// ─── New utility functions ─────────────────────────────────────────────────────

function downloadThemes(destDir) {
  const themes = ["void", "glacier", "cosmo", "nebula"];
  for (const theme of themes) {
    const localPath = path.join(scriptDir, "themes", `theme-${theme}.css`);
    const destPath = path.join(destDir, `theme-${theme}.css`);
    if (fs.existsSync(localPath)) {
      fs.copyFileSync(localPath, destPath);
    } else {
      try {
        execSync(
          `curl -fsSL "https://sirbepy.github.io/bepy-project-init/themes/theme-${theme}.css" -o "${destPath}"`,
          { stdio: "pipe" },
        );
      } catch (e) {
        console.log(
          YELLOW + `⚠️  Could not download theme-${theme}.css` + RESET,
        );
      }
    }
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
    const voidCssPath = path.join(scriptDir, "themes", "theme-void.css");
    if (fs.existsSync(voidCssPath)) {
      const voidCss = fs.readFileSync(voidCssPath, "utf8");
      const styleBlock =
        '    <style id="active-theme">\n' + voidCss + "\n    </style>\n";
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
      '    <meta name="theme-color" content="' +
      options.pwaThemeColor +
      '">\n';
    html = html.replace("</head>", pwaTags + "  </head>");
  }

  fs.writeFileSync(htmlPath, html);
}

const isWorkflow = (f) => f.endsWith(".yml") || f.endsWith(".yaml");

function detectMissing() {
  const missing = [];

  const themesDir = path.resolve("assets/styles/themes");
  if (
    !fs.existsSync(themesDir) ||
    fs.readdirSync(themesDir).filter((f) => f.endsWith(".css")).length === 0
  ) {
    missing.push("assets/styles/themes/*.css");
  }

  const indexPath = path.resolve("index.html");
  if (fs.existsSync(indexPath)) {
    const indexHtml = fs.readFileSync(indexPath, "utf8");
    if (!indexHtml.includes("sirbepy.github.io")) {
      missing.push("widget script tag in index.html");
    }
    if (!indexHtml.includes("active-theme")) {
      missing.push('<style id="active-theme"> in index.html');
    }
    if (!indexHtml.includes("build-info.js")) {
      missing.push("build-info.js script tag in index.html");
    }
  }

  const buildInfoLocations = [
    "assets/scripts/build-info.js",
    "assets/build-info.js",
    "build-info.js",
    "src/build-info.js",
  ];
  if (!buildInfoLocations.some((p) => fs.existsSync(path.resolve(p)))) {
    missing.push("assets/scripts/build-info.js");
  }

  if (!fs.existsSync(path.resolve("package.json"))) {
    missing.push("package.json");
  }

  const workflowsDir = path.resolve(".github/workflows");
  if (
    !fs.existsSync(workflowsDir) ||
    fs.readdirSync(workflowsDir).filter(isWorkflow).length === 0
  ) {
    missing.push(".github/workflows/*.yml");
  }

  return missing;
}

const CONFIG_RE = /\.config\.(js|ts|mjs|cjs)$/;
const SW_RE = /^(sw|service-?worker|firebase-messaging-sw)\.js$/i;

function detectMisplaced() {
  const misplaced = [];

  if (fs.existsSync("assets")) {
    for (const entry of fs.readdirSync("assets", { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      if (name.endsWith(".js")) {
        misplaced.push(`assets/${name} → assets/scripts/${name}`);
      } else if (name.endsWith(".css") || name.endsWith(".scss")) {
        misplaced.push(`assets/${name} → assets/styles/${name}`);
      }
    }
  }

  for (const entry of fs.readdirSync(".", { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (name.startsWith(".") || CONFIG_RE.test(name) || SW_RE.test(name))
      continue;
    if (name.endsWith(".js")) {
      misplaced.push(`${name} → assets/scripts/${name}`);
    } else if (name.endsWith(".css") || name.endsWith(".scss")) {
      misplaced.push(`${name} → assets/styles/${name}`);
    }
  }

  return misplaced;
}

function migrateLooseFiles() {
  fs.mkdirSync(path.resolve("assets/scripts"), { recursive: true });
  fs.mkdirSync(path.resolve("assets/styles"), { recursive: true });

  const moves = [];

  function moveFile(src, destDir, oldRelPath) {
    const name = path.basename(src);
    const dest = path.resolve(destDir, name);
    const newRelPath = destDir + "/" + name;
    if (!fs.existsSync(dest)) {
      fs.renameSync(src, dest);
      moves.push({ old: oldRelPath, new: newRelPath });
      console.log(YELLOW + `📁 Moved ${oldRelPath} → ${newRelPath}` + RESET);
    }
  }

  if (fs.existsSync("assets")) {
    for (const entry of fs.readdirSync("assets", { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      const src = path.resolve("assets", name);
      if (name.endsWith(".js")) {
        moveFile(src, "assets/scripts", "assets/" + name);
      } else if (name.endsWith(".css") || name.endsWith(".scss")) {
        moveFile(src, "assets/styles", "assets/" + name);
      }
    }
  }

  for (const entry of fs.readdirSync(".", { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (name.startsWith(".") || CONFIG_RE.test(name) || SW_RE.test(name))
      continue;
    const src = path.resolve(name);
    if (name.endsWith(".js")) {
      moveFile(src, "assets/scripts", name);
    } else if (name.endsWith(".css") || name.endsWith(".scss")) {
      moveFile(src, "assets/styles", name);
    }
  }

  if (moves.length === 0) return;

  const indexPath = path.resolve("index.html");
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, "utf8");
    for (const move of moves) {
      html = html.replaceAll("/" + move.old, "/" + move.new);
      html = html.replaceAll('"' + move.old, '"' + move.new);
      html = html.replaceAll("'" + move.old, "'" + move.new);
    }
    fs.writeFileSync(indexPath, html);
    console.log(YELLOW + "✏️  Updated index.html references" + RESET);
  }

  const swPath = path.resolve("sw.js");
  if (fs.existsSync(swPath)) {
    let sw = fs.readFileSync(swPath, "utf8");
    let swChanged = false;
    for (const move of moves) {
      const patched = sw
        .replaceAll("./" + move.old, "./" + move.new)
        .replaceAll("'/" + move.old, "'/" + move.new)
        .replaceAll('"/' + move.old, '"/' + move.new)
        .replaceAll("'" + move.old, "'" + move.new)
        .replaceAll('"' + move.old, '"' + move.new);
      if (patched !== sw) swChanged = true;
      sw = patched;
    }
    if (swChanged) {
      sw = sw.replace(
        /(CACHE_NAME\s*=\s*['"][^'"]*-v)(\d+)(['"])/,
        (_, pre, num, quote) => pre + (parseInt(num, 10) + 1) + quote,
      );
      fs.writeFileSync(swPath, sw);
      console.log(
        YELLOW + "✏️  Updated sw.js paths and bumped cache version" + RESET,
      );
    }
  }
}

function patchWorkflow(workflowPath) {
  let content = fs.readFileSync(workflowPath, "utf8");
  if (content.includes("BUILD_TIMESTAMP_PLACEHOLDER")) return;

  const injectStep =
    "      - name: Inject build info\n" +
    "        run: |\n" +
    '          BUILD_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")\n' +
    '          PROJECT=$(basename "$GITHUB_REPOSITORY")\n' +
    '          BUILD_INFO=$(find . -name "build-info.js" -not -path "./.git/*")\n' +
    '          sed -i "s|BUILD_TIMESTAMP_PLACEHOLDER|$BUILD_TIME|g" $BUILD_INFO\n' +
    '          sed -i "s|PROJECT_NAME_PLACEHOLDER|$PROJECT|g" $BUILD_INFO\n';

  if (content.includes("actions/upload-pages-artifact")) {
    content = content.replace(
      /(\s*- uses: actions\/upload-pages-artifact)/,
      "\n" + injectStep + "$1",
    );
  } else if (content.includes("- run: npm ci")) {
    content = content.replace(
      "- run: npm ci",
      injectStep + "      - run: npm ci",
    );
  } else {
    content = content + "\n" + injectStep;
  }

  fs.writeFileSync(workflowPath, content);
}

function mergeGitignore(destPath) {
  const templatePath = path.join(scriptDir, "templates", "gitignore");
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

// ─── Arg parsing ──────────────────────────────────────────────────────────────

async function resolveFromArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) return;

  const [first, second] = args;

  if (first === "update" || first === "upgrade") {
    upgradeMode = true;
    if (second === "react" || second === "vite") framework = second;
    return;
  }

  if (first === "init" || first === "create") {
    upgradeMode = false;
    if (second === "react" || second === "vite") framework = second;
    return;
  }

  if (first === "react" || first === "vite") {
    upgradeMode = false;
    framework = first;
    return;
  }

  if (first === "update-react") {
    upgradeMode = true;
    framework = "react";
    return;
  }
  if (first === "update-vite") {
    upgradeMode = true;
    framework = "vite";
    return;
  }

  console.log(YELLOW + `⚠️  Unknown argument "${first}".` + RESET);
  console.log(`Usage: init [init|update] [react|vite]`);
}

async function promptMissing() {
  if (upgradeMode === null) {
    const choice = await prompt(
      "What do you want to do? (1) Initialize  (2) Update",
      "",
      (v) => {
        if (v !== "1" && v !== "2") {
          console.log(RED + "Invalid choice. Enter 1 or 2." + RESET);
          return false;
        }
        return true;
      },
    );
    upgradeMode = choice === "2";
  }

  if (framework === "") {
    const choice = await prompt("Framework? (1) Vite  (2) React", "", (v) => {
      if (v !== "1" && v !== "2") {
        console.log(RED + "Invalid choice. Enter 1 or 2." + RESET);
        return false;
      }
      return true;
    });
    framework = choice === "1" ? "vite" : "react";
  }
}

// ─── Step functions ────────────────────────────────────────────────────────────

async function preflight() {
  const entries = fs.readdirSync(".");
  if (entries.length > 0) {
    console.log(RED + "⚠️  Folder is not empty:" + RESET);
    for (const entry of entries) {
      console.log("  " + entry);
    }
    const answer = await prompt(
      "Folder is not empty. Continue anyway? (y/n)",
      "n",
    );
    if (answer !== "y") {
      console.log("Aborting.");
      process.exit(0);
    }
  }
}

async function stepProjectName() {
  const defaultName = path.basename(process.cwd());
  const name = await prompt("Project name?", defaultName);
  if (name !== defaultName) {
    const renameAnswer = await prompt("Rename folder to match? (y/n)", "n");
    if (renameAnswer === "y") {
      const newPath = path.join(path.dirname(process.cwd()), name);
      fs.renameSync(process.cwd(), newPath);
      process.chdir(newPath);
      console.log(GREEN + "Folder renamed to " + name + "." + RESET);
    }
  }
  projectName = name;
  projectDescription = await prompt("Project description? (optional)", "");
}

function stepScaffold() {
  console.log(YELLOW + "⚙️  Scaffolding project..." + RESET);

  const before = new Set(fs.readdirSync("."));

  execSync(
    "npm create vite@latest . -- --template " +
      (framework === "vite" ? "vanilla" : "react"),
    { stdio: "inherit" },
  );

  const after = fs.readdirSync(".");
  for (const entry of after) {
    if (!before.has(entry)) {
      track(path.resolve(entry));
    }
  }

  console.log(YELLOW + "📦 Installing dependencies..." + RESET);
  execSync("npm install", { stdio: "inherit" });
  execSync("npm install -D sass", { stdio: "inherit" });

  if (framework === "vite") {
    // Vite vanilla cleanup
    for (const f of ["counter.js", "javascript.svg", "public/vite.svg"]) {
      if (fs.existsSync(f)) fs.rmSync(f, { force: true });
    }
    fs.rmSync("style.css", { force: true });
    fs.rmSync("main.js", { force: true });

    // Our template already has fonts, void theme, widget, and build-info wired up
    copyTemplate("vite/index.html", path.resolve("index.html"), {
      PROJECT_NAME: projectName,
    });

    const assetsIconsExisted = fs.existsSync("assets/icons");
    fs.mkdirSync("assets/icons", { recursive: true });
    if (!assetsIconsExisted) track(path.resolve("assets/icons"));
    const assetsImagesExisted = fs.existsSync("assets/images");
    fs.mkdirSync("assets/images", { recursive: true });
    if (!assetsImagesExisted) track(path.resolve("assets/images"));

    const assetsStylesExisted = fs.existsSync("assets/styles");
    fs.mkdirSync("assets/styles/themes", { recursive: true });
    if (!assetsStylesExisted) track(path.resolve("assets/styles"));
    console.log(YELLOW + "🎨 Downloading themes..." + RESET);
    downloadThemes(path.resolve("assets/styles/themes"));

    const assetsScriptsExisted = fs.existsSync("assets/scripts");
    fs.mkdirSync("assets/scripts", { recursive: true });
    if (!assetsScriptsExisted) track(path.resolve("assets/scripts"));

    copyTemplate("vite/main.js", path.resolve("assets/scripts/main.js"), {});
    copyTemplate(
      "build-info.js",
      path.resolve("assets/scripts/build-info.js"),
      {},
    );
  } else {
    // React cleanup
    fs.rmSync("src/App.css", { force: true });
    fs.rmSync("src/assets/react.svg", { force: true });
    fs.rmSync("public/vite.svg", { force: true });
    fs.rmSync("src/index.css", { force: true });

    copyTemplate("react/App.jsx", path.resolve("src/App.jsx"), {
      PROJECT_NAME: projectName,
    });
    copyTemplate("react/main.jsx", path.resolve("src/main.jsx"), {});

    // Use our own index.html — fonts, void theme, widget, and build-info all pre-wired
    copyTemplate("react/index.html", path.resolve("index.html"), {
      PROJECT_NAME: projectName,
    });

    const srcComponentsExisted = fs.existsSync("src/components");
    fs.mkdirSync("src/components", { recursive: true });
    if (!srcComponentsExisted) track(path.resolve("src/components"));

    const reactIconsExisted = fs.existsSync("assets/icons");
    fs.mkdirSync("assets/icons", { recursive: true });
    if (!reactIconsExisted) track(path.resolve("assets/icons"));
    const reactImagesExisted = fs.existsSync("assets/images");
    fs.mkdirSync("assets/images", { recursive: true });
    if (!reactImagesExisted) track(path.resolve("assets/images"));

    const reactStylesExisted = fs.existsSync("assets/styles");
    fs.mkdirSync("assets/styles/themes", { recursive: true });
    if (!reactStylesExisted) track(path.resolve("assets/styles"));
    console.log(YELLOW + "🎨 Downloading themes..." + RESET);
    downloadThemes(path.resolve("assets/styles/themes"));

    const reactScriptsExisted = fs.existsSync("assets/scripts");
    fs.mkdirSync("assets/scripts", { recursive: true });
    if (!reactScriptsExisted) track(path.resolve("assets/scripts"));

    copyTemplate(
      "build-info.js",
      path.resolve("assets/scripts/build-info.js"),
      {},
    );
  }

  // Both frameworks
  const githubExisted = fs.existsSync(".github");
  fs.mkdirSync(".github/workflows", { recursive: true });
  if (!githubExisted) track(path.resolve(".github"));

  copyTemplate(
    framework === "vite" ? "deploy.yml" : "deploy-react.yml",
    path.resolve(".github/workflows/deploy.yml"),
    {},
  );

  try {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.description = projectDescription;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch (e) {
    // package.json may not exist yet or may be malformed
  }

  console.log(GREEN + "✅ Project scaffolded." + RESET);
}

function stepStyleguide() {
  console.log(YELLOW + "🎨 Setting up styleguide..." + RESET);

  copyTemplate(
    "styleguide.scss",
    path.resolve("assets/styles/styleguide.scss"),
    {},
  );

  if (framework === "vite") {
    copyTemplate(
      "vite/style.scss",
      path.resolve("assets/styles/style.scss"),
      {},
    );
  }
  if (framework === "react") {
    copyTemplate(
      "react/index.scss",
      path.resolve("assets/styles/index.scss"),
      {},
    );
    copyTemplate("react/App.scss", path.resolve("assets/styles/App.scss"), {});
  }

  console.log(GREEN + "✅ Styleguide ready." + RESET);
  setupStyleguide = true;
}

async function stepPwa() {
  const answer = await prompt("Set up as PWA? [y/N]", "n");
  if (answer.toLowerCase() !== "y") return;

  themeColor = await prompt("Theme color?", "#0f0f0f", (v) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) {
      console.log(RED + "Invalid hex color. Use format #rrggbb." + RESET);
      return false;
    }
    return true;
  });

  const hasIcon = await prompt("Do you have an SVG icon ready? (y/n)", "n");

  const iconDestPath = path.resolve("assets/icons/icon.svg");
  const iconExisted = fs.existsSync(iconDestPath);
  if (hasIcon === "y") {
    const iconPath = await prompt("Path to SVG file?", "", (v) => {
      if (!fs.existsSync(v)) {
        console.log(RED + "File not found." + RESET);
        return false;
      }
      return true;
    });
    assertSafeToOverwrite(iconDestPath);
    fs.copyFileSync(iconPath, iconDestPath);
  } else {
    const placeholderSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" fill="' +
      themeColor +
      '"/>' +
      "</svg>";
    assertSafeToOverwrite(iconDestPath);
    fs.writeFileSync(iconDestPath, placeholderSvg);
  }
  if (!iconExisted) track(iconDestPath);

  console.log(YELLOW + "🖼️  Generating PNG icons..." + RESET);

  execFileSync(
    process.execPath,
    [
      path.join(scriptDir, "svg-to-png.js"),
      "assets/icons/icon.svg",
      "assets/icons/icon-192.png",
      "192",
    ],
    { stdio: "inherit" },
  );
  track(path.resolve("assets/icons/icon-192.png"));

  execFileSync(
    process.execPath,
    [
      path.join(scriptDir, "svg-to-png.js"),
      "assets/icons/icon.svg",
      "assets/icons/icon-512.png",
      "512",
    ],
    { stdio: "inherit" },
  );
  track(path.resolve("assets/icons/icon-512.png"));

  copyTemplate("manifest.json", path.resolve("manifest.json"), {
    PROJECT_NAME: projectName,
    THEME_COLOR: themeColor,
  });

  injectIntoHtml(path.resolve("index.html"), {
    pwaManifest: true,
    pwaThemeColor: themeColor,
  });

  execSync("npm install -D vite-plugin-pwa", { stdio: "inherit" });

  copyTemplate(
    framework === "vite"
      ? "vite/vite.config.pwa.js"
      : "react/vite.config.pwa.js",
    path.resolve("vite.config.js"),
    {},
  );

  console.log(GREEN + "✅ PWA configured." + RESET);
  setupPwa = true;
}

function stepFinalize() {
  copyTemplate("README.md", path.resolve("README.md"), {
    PROJECT_NAME: projectName,
    FRAMEWORK: framework === "vite" ? "Vite" : "React",
    PROJECT_DESCRIPTION: projectDescription,
  });

  console.log(YELLOW + "🔧 Initializing git..." + RESET);
  execSync("git init", { stdio: "inherit" });
  mergeGitignore(path.resolve(".gitignore"));
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "chore: initial project setup"', {
    stdio: "inherit",
  });

  console.log(
    GREEN +
      "✅ " +
      projectName +
      " initialized\n" +
      "\n" +
      "   Framework:   " +
      (framework === "vite" ? "Vite" : "React") +
      "\n" +
      "   Styleguide:  " +
      (setupStyleguide ? "yes" : "no") +
      "\n" +
      "   PWA:         " +
      (setupPwa ? "yes" : "no") +
      "\n" +
      "\n" +
      "Next steps (manual):\n" +
      "  Run when ready: npm run dev\n" +
      "  Add your GitHub remote: git remote add origin <url>" +
      RESET,
  );
}

// ─── Upgrade mode functions ────────────────────────────────────────────────────

async function upgradeGitSafety() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe" });
  } catch (e) {
    console.error(
      RED + "❌ Not a git repository. Please initialize git first." + RESET,
    );
    process.exit(1);
  }

  const status = execSync("git status --porcelain", { encoding: "utf8" });
  if (status.trim().length > 0) {
    console.log(YELLOW + "⚠️  You have uncommitted changes:" + RESET);
    console.log(status);
    const answer = await prompt(
      'Commit as "Clean repo before doing bepy-project-init"? (y/n)',
      "n",
    );
    if (answer !== "y") {
      console.log("Aborting. Please commit or stash your changes first.");
      process.exit(0);
    }
    execSync("git add .", { stdio: "inherit" });
    execSync('git commit -m "Clean repo before doing bepy-project-init"', {
      stdio: "inherit",
    });
  }
}

async function upgradeDetect() {
  let renamed = false;
  const indexPath = path.resolve("index.html");
  if (!fs.existsSync(indexPath)) {
    const htmlFiles = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
    if (htmlFiles.length === 1) {
      console.log(YELLOW + `Renaming ${htmlFiles[0]} → index.html` + RESET);
      fs.renameSync(htmlFiles[0], "index.html");
      renamed = true;
    } else if (htmlFiles.length > 1) {
      console.log(YELLOW + "Multiple HTML files found:" + RESET);
      htmlFiles.forEach((f, i) => console.log(`  (${i + 1}) ${f}`));
      const choice = await prompt(
        "Which file is your entry point? (number)",
        "1",
      );
      const chosen = htmlFiles[parseInt(choice, 10) - 1] || htmlFiles[0];
      console.log(YELLOW + `Renaming ${chosen} → index.html` + RESET);
      fs.renameSync(chosen, "index.html");
      renamed = true;
    } else {
      console.log(
        YELLOW + "No index.html found and no HTML files to rename." + RESET,
      );
    }
  }

  const missing = detectMissing();
  const misplaced = detectMisplaced();

  if (missing.length === 0 && misplaced.length === 0 && !renamed) {
    console.log(
      GREEN + "✅ Nothing to upgrade — project is up to date." + RESET,
    );
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log(YELLOW + "The following items will be added:" + RESET);
    for (const item of missing) {
      console.log("  • " + item);
    }
  }
  if (misplaced.length > 0) {
    console.log(YELLOW + "The following files will be moved:" + RESET);
    for (const item of misplaced) {
      console.log("  • " + item);
    }
  }
}

async function upgradePatch() {
  // Step 1: migrate all loose JS/CSS/SCSS files to the correct asset dirs
  migrateLooseFiles();

  // Step 2: migrate old assets/themes/ → assets/styles/themes/
  const themesDir = path.resolve("assets/styles/themes");
  fs.mkdirSync(themesDir, { recursive: true });

  const oldThemesDir = path.resolve("assets/themes");
  if (fs.existsSync(oldThemesDir)) {
    for (const f of fs.readdirSync(oldThemesDir)) {
      fs.renameSync(path.join(oldThemesDir, f), path.join(themesDir, f));
    }
    fs.rmdirSync(oldThemesDir);
    console.log(
      YELLOW + "📁 Moved assets/themes/ → assets/styles/themes/" + RESET,
    );
  }

  console.log(YELLOW + "🎨 Downloading themes..." + RESET);
  downloadThemes(themesDir);

  const indexPath = path.resolve("index.html");
  if (fs.existsSync(indexPath)) {
    injectIntoHtml(indexPath, {
      googleFonts: true,
      voidTheme: true,
      widgetTag: true,
      buildInfoScript: true,
    });
  }

  // Step 3: add build-info only if not already present (may have been migrated in step 1)
  if (!fs.existsSync(path.resolve("assets/scripts/build-info.js"))) {
    copyTemplate(
      "build-info.js",
      path.resolve("assets/scripts/build-info.js"),
      {},
    );
  }

  // Remove any stray build-info that wasn't caught by migrateLooseFiles (e.g. src/)
  if (fs.existsSync(path.resolve("src/build-info.js"))) {
    fs.rmSync(path.resolve("src/build-info.js"));
    console.log(
      YELLOW +
        "🗑️  Removed old src/build-info.js (moved to assets/scripts/)" +
        RESET,
    );
  }

  const workflowsDir = path.resolve(".github/workflows");
  if (fs.existsSync(workflowsDir)) {
    const workflows = fs.readdirSync(workflowsDir).filter(isWorkflow);
    if (workflows.length > 0) {
      patchWorkflow(path.join(workflowsDir, workflows[0]));
    } else {
      copyTemplate("deploy.yml", path.join(workflowsDir, "deploy.yml"), {});
    }
  } else {
    fs.mkdirSync(workflowsDir, { recursive: true });
    copyTemplate("deploy.yml", path.join(workflowsDir, "deploy.yml"), {});
  }

  if (!fs.existsSync(path.resolve("package.json"))) {
    const pkgName = path
      .basename(process.cwd())
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    fs.writeFileSync(
      path.resolve("package.json"),
      JSON.stringify(
        { name: pkgName, version: "1.0.0", scripts: { dev: "npx serve ." } },
        null,
        2,
      ) + "\n",
    );
    console.log(GREEN + "✅ Created package.json" + RESET);
  }

  // Merge .gitignore (additive — only add missing lines, never remove)
  mergeGitignore(path.resolve(".gitignore"));
  console.log(GREEN + "✅ .gitignore updated." + RESET);

  // Step 4: ensure styleguide is set up
  const styleguidePath = path.resolve("assets/styles/styleguide.scss");
  if (!fs.existsSync(styleguidePath)) {
    fs.mkdirSync(path.resolve("assets/styles"), { recursive: true });
    copyTemplate("styleguide.scss", styleguidePath, {});
    console.log(GREEN + "✅ Added styleguide.scss" + RESET);

    if (framework === "vite") {
      const stylePath = path.resolve("assets/styles/style.scss");
      if (!fs.existsSync(stylePath)) {
        copyTemplate("vite/style.scss", stylePath, {});
      } else {
        let content = fs.readFileSync(stylePath, "utf8");
        if (
          !content.includes("@use './styleguide'") &&
          !content.includes('@use "./styleguide"')
        ) {
          fs.writeFileSync(stylePath, "@use './styleguide';\n" + content);
          console.log(
            YELLOW + "✏️  Added @use './styleguide' to style.scss" + RESET,
          );
        }
      }
    }

    if (framework === "react") {
      const indexScssPath = path.resolve("assets/styles/index.scss");
      if (!fs.existsSync(indexScssPath)) {
        copyTemplate("react/index.scss", indexScssPath, {});
      } else {
        let content = fs.readFileSync(indexScssPath, "utf8");
        if (
          !content.includes("@use './styleguide'") &&
          !content.includes('@use "./styleguide"')
        ) {
          fs.writeFileSync(indexScssPath, "@use './styleguide';\n" + content);
          console.log(
            YELLOW + "✏️  Added @use './styleguide' to index.scss" + RESET,
          );
        }
      }

      const appScssPath = path.resolve("assets/styles/App.scss");
      if (!fs.existsSync(appScssPath)) {
        copyTemplate("react/App.scss", appScssPath, {});
      }
    }
  }
}

function upgradeFinalize() {
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "MAJOR: apply bepy-project-init upgrade"', {
    stdio: "inherit",
  });

  let devCmd = "  Open index.html in a browser or use a local server";
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve("package.json"), "utf8"),
    );
    if (pkg.scripts && pkg.scripts.dev)
      devCmd = "  Run when ready: npm run dev";
  } catch (e) {}

  console.log(
    GREEN +
      "✅ Upgrade complete!\n" +
      "\n" +
      "Next steps:\n" +
      devCmd +
      "\n" +
      "  Push to GitHub to trigger deployment" +
      RESET,
  );
}

// ─── Main entry point ──────────────────────────────────────────────────────────

async function main() {
  let version = "";
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(scriptDir, "package.json"), "utf8"),
    );
    if (pkg.version) version = " v" + pkg.version;
  } catch (e) {}
  console.log(GREEN + "🚀 Web Project Initializer" + version + RESET);

  await resolveFromArgs();
  await promptMissing();

  if (upgradeMode) {
    try {
      await upgradeGitSafety();
      await upgradeDetect();
      await upgradePatch();
      upgradeFinalize();
    } catch (err) {
      rl.close();
      console.error(RED + "❌ Error during upgrade: " + err.message + RESET);
      console.log(
        YELLOW +
          "💡 To undo: git reset --hard HEAD~1 (or HEAD~2 if cleanup commit was made)" +
          RESET,
      );
      process.exit(1);
    }
    return;
  }

  // Init path
  await preflight();
  await stepProjectName();
  snapshotPreExisting();
  stepScaffold();
  stepStyleguide();
  await stepPwa();
  stepFinalize();
}

main()
  .then(() => rl.close())
  .catch((err) => {
    rl.close();
    console.error(RED + "❌ Error: " + err.message + RESET);
    cleanup();
    process.exit(1);
  });
