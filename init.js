#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");
const inquirer = require("inquirer");
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

// ─── Utility functions ─────────────────────────────────────────────────────────

function prompt(label, defaultVal, validator) {
  return inquirer.prompt([{
    type: "input",
    name: "value",
    message: label,
    default: (defaultVal !== undefined && defaultVal !== "") ? defaultVal : undefined,
    validate: validator ? (input) => {
      const val = (input === "" || input === undefined) ? (defaultVal || "") : input;
      const result = validator(val);
      return result === true ? true : (typeof result === "string" ? result : " ");
    } : undefined,
  }]).then(a => {
    const val = a.value;
    if (val === undefined || val === null || val === "") return defaultVal || "";
    return val;
  });
}

function select(message, choices) {
  return inquirer.prompt([{
    type: "list",
    name: "value",
    message,
    choices,
  }]).then(a => a.value);
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

function runClaudeCli(promptFile) {
  const promptPath = path.join(scriptDir, "prompts", promptFile);

  if (!fs.existsSync(promptPath)) {
    console.log(RED + `❌ Prompt file not found: ${promptPath}` + RESET);
    console.log(
      YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET,
    );
    return false;
  }

  try {
    execSync(
      process.platform === "win32" ? "where claude" : "which claude",
      { stdio: "pipe" },
    );
  } catch (e) {
    console.log(RED + "❌ Claude CLI not found on PATH." + RESET);
    console.log(
      YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET,
    );
    return false;
  }

  try {
    execSync(`claude < "${promptPath}"`, { stdio: "inherit" });
    return true;
  } catch (e) {
    console.log(RED + "❌ Claude CLI call failed." + RESET);
    console.log(
      YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET,
    );
    return false;
  }
}

function commitIfDirty(message) {
  try {
    const status = execSync("git status --porcelain", { encoding: "utf8" });
    if (status.trim().length > 0) {
      execSync("git add .", { stdio: "inherit" });
      execSync(`git commit -m "${message}"`, { stdio: "inherit" });
    }
    return true;
  } catch (e) {
    return false;
  }
}

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

  if (!fs.existsSync(path.resolve(".eslintrc.js"))) {
    missing.push(".eslintrc.js");
  }

  if (!fs.existsSync(path.resolve(".prettierrc"))) {
    missing.push(".prettierrc");
  }

  if (!fs.existsSync(path.resolve("tsconfig.json"))) {
    missing.push("tsconfig.json");
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
    } else if (
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.endsWith(".d.ts")
    ) {
      misplaced.push(`${name} → src/${name}`);
    }
  }

  return misplaced;
}

function migrateLooseFiles() {
  fs.mkdirSync(path.resolve("assets/scripts"), { recursive: true });
  fs.mkdirSync(path.resolve("assets/styles"), { recursive: true });
  fs.mkdirSync(path.resolve("src"), { recursive: true });

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
    } else if (
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.endsWith(".d.ts")
    ) {
      moveFile(src, "src", name);
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

  const webFrameworks = ["react", "vite"];
  const allFrameworks = ["react", "vite", "roblox", "general", "html"];

  if (first === "update" || first === "upgrade") {
    upgradeMode = true;
    if (webFrameworks.includes(second)) framework = second;
    return;
  }

  if (first === "init" || first === "create") {
    upgradeMode = false;
    if (allFrameworks.includes(second)) framework = second;
    return;
  }

  if (allFrameworks.includes(first)) {
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
  const files = fs.readdirSync(".");

  // Detect framework from project files if not already set by args
  if (framework === "") {
    const hasViteConfig = files.some(f => /^vite\.config\.[jt]s$/.test(f));
    if (hasViteConfig) {
      const hasTsx = fs.existsSync("src") &&
        fs.readdirSync("src").some(f => f.endsWith(".tsx") || f.endsWith(".jsx"));
      framework = hasTsx ? "react" : "vite";
    } else if (files.some(f => f.endsWith(".html"))) {
      framework = "html";
    }
  }

  // Determine mode if not set by args
  if (upgradeMode === null) {
    if (framework === "vite" || framework === "react") {
      upgradeMode = true;
      console.log(GREEN + `🔍 Detected ${framework} project — running update.` + RESET);
    } else {
      upgradeMode = false;
      if (framework === "html") {
        console.log(GREEN + "🔍 Detected HTML project." + RESET);
      }
    }
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

function isWebFramework(fw) {
  return fw === "vite" || fw === "react";
}

function detectRoblox() {
  const markers = ["default.project.json", ".robloxignore"];
  for (const m of markers) {
    if (fs.existsSync(path.resolve(m))) return true;
  }
  return fs.readdirSync(".").some(f => /\.(rbxlx|rbxl|rbxm|rbxmx)$/.test(f));
}

async function stepFramework() {
  if (["vite", "react", "roblox", "general", "html"].includes(framework)) return;

  if (detectRoblox()) {
    framework = "roblox";
    console.log(GREEN + "🎮 Roblox project detected." + RESET);
    return;
  }

  const projectType = await select("What kind of project?", [
    { name: "Web", value: "web" },
    { name: "Game", value: "game" },
    { name: "Other", value: "other" },
  ]);

  if (projectType === "game") {
    framework = "roblox";
    return;
  }

  if (projectType === "other") {
    console.log(YELLOW + "⚠️  Other projects not yet supported." + RESET);
    process.exit(0);
  }

  // Web sub-menu — order Simple Web based on whether .json or .scss exist
  const hasJsonOrScss = fs.readdirSync(".").some(f => f.endsWith(".json") || f.endsWith(".scss"));
  const webChoices = [
    { name: "Simple Web  (HTML / CSS / JS)", value: "html" },
    { name: "Vite        (vanilla JS + bundler)", value: "vite" },
    { name: "React       (React + Vite)", value: "react" },
  ];
  if (hasJsonOrScss) {
    const simpleWeb = webChoices.shift();
    webChoices.push(simpleWeb);
  }

  framework = await select("What kind of web project?", webChoices);
}

function stepScaffoldNonWeb() {
  console.log(YELLOW + "⚙️  Setting up project..." + RESET);

  const templateDir = framework; // 'roblox' or 'general'
  const subs = {
    PROJECT_NAME: projectName,
    PROJECT_DESCRIPTION: projectDescription,
  };

  copyTemplate(`${templateDir}/gitignore`, path.resolve(".gitignore"), subs);
  copyTemplate(`${templateDir}/CLAUDE.md`, path.resolve("CLAUDE.md"), subs);
  copyTemplate(`${templateDir}/README.md`, path.resolve("README.md"), subs);
  copyTemplate(`${templateDir}/skills`, path.resolve("skills"), subs);

  console.log(YELLOW + "🔧 Initializing git..." + RESET);
  execSync("git init", { stdio: "inherit" });
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "CHORE: initial project setup"', { stdio: "inherit" });

  console.log(GREEN + "✅ Project set up." + RESET);
}

function stepScaffold() {
  console.log(YELLOW + "⚙️  Scaffolding project..." + RESET);

  const before = new Set(fs.readdirSync("."));

  execSync(
    "npm create vite@latest . -- --template " +
      (framework === "vite" ? "vanilla-ts" : "react-ts"),
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
  execSync(
    "npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier prettier",
    { stdio: "inherit" },
  );

  if (framework === "vite") {
    // Vite vanilla-ts cleanup
    for (const f of ["src/counter.ts", "src/typescript.svg", "public/vite.svg"]) {
      if (fs.existsSync(f)) fs.rmSync(f, { force: true });
    }
    fs.rmSync("src/style.css", { force: true });
    fs.rmSync("src/main.ts", { force: true });

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

    // src/ directory structure
    const srcStylesExisted = fs.existsSync("src/styles");
    fs.mkdirSync("src/styles/components", { recursive: true });
    if (!srcStylesExisted) track(path.resolve("src/styles"));
    const srcComponentsExisted = fs.existsSync("src/components");
    fs.mkdirSync("src/components", { recursive: true });
    if (!srcComponentsExisted) track(path.resolve("src/components"));
    const srcUtilsExisted = fs.existsSync("src/utils");
    fs.mkdirSync("src/utils", { recursive: true });
    if (!srcUtilsExisted) track(path.resolve("src/utils"));
    const srcAssetsExisted = fs.existsSync("src/assets");
    fs.mkdirSync("src/assets", { recursive: true });
    if (!srcAssetsExisted) track(path.resolve("src/assets"));

    // Stub entry stylesheet — overwritten by stepStyleguide if enabled
    const stylesStubPath = path.resolve("src/styles/styles.scss");
    if (!fs.existsSync(stylesStubPath)) {
      fs.writeFileSync(stylesStubPath, "/* Styles */\n");
      track(stylesStubPath);
    }

    copyTemplate("vite/app.ts", path.resolve("src/app.ts"), {});
    copyTemplate(
      "build-info.js",
      path.resolve("assets/scripts/build-info.js"),
      {},
    );
  } else {
    // React cleanup
    execSync(
      "npm install -D eslint-plugin-react eslint-plugin-react-hooks",
      { stdio: "inherit" },
    );
    fs.rmSync("src/App.css", { force: true });
    fs.rmSync("src/assets/react.svg", { force: true });
    fs.rmSync("public/vite.svg", { force: true });
    fs.rmSync("src/index.css", { force: true });

    copyTemplate("react/App.tsx", path.resolve("src/App.tsx"), {
      PROJECT_NAME: projectName,
    });
    copyTemplate("react/main.tsx", path.resolve("src/main.tsx"), {});

    // Use our own index.html — fonts, void theme, widget, and build-info all pre-wired
    copyTemplate("react/index.html", path.resolve("index.html"), {
      PROJECT_NAME: projectName,
    });

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

    // src/ directory structure
    const srcStylesExisted = fs.existsSync("src/styles");
    fs.mkdirSync("src/styles/components", { recursive: true });
    if (!srcStylesExisted) track(path.resolve("src/styles"));
    const srcComponentsExisted = fs.existsSync("src/components");
    fs.mkdirSync("src/components", { recursive: true });
    if (!srcComponentsExisted) track(path.resolve("src/components"));
    const srcPagesExisted = fs.existsSync("src/pages");
    fs.mkdirSync("src/pages", { recursive: true });
    if (!srcPagesExisted) track(path.resolve("src/pages"));
    const srcHooksExisted = fs.existsSync("src/hooks");
    fs.mkdirSync("src/hooks", { recursive: true });
    if (!srcHooksExisted) track(path.resolve("src/hooks"));
    const srcContextExisted = fs.existsSync("src/context");
    fs.mkdirSync("src/context", { recursive: true });
    if (!srcContextExisted) track(path.resolve("src/context"));
    const srcServicesExisted = fs.existsSync("src/services");
    fs.mkdirSync("src/services", { recursive: true });
    if (!srcServicesExisted) track(path.resolve("src/services"));
    const srcUtilsExisted = fs.existsSync("src/utils");
    fs.mkdirSync("src/utils", { recursive: true });
    if (!srcUtilsExisted) track(path.resolve("src/utils"));

    // Stub entry stylesheet — overwritten by stepStyleguide if enabled
    const stylesStubPath = path.resolve("src/styles/styles.scss");
    if (!fs.existsSync(stylesStubPath)) {
      fs.writeFileSync(stylesStubPath, "/* Styles */\n");
      track(stylesStubPath);
    }

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

  copyTemplate(
    framework === "vite" ? "vite/.eslintrc.js" : "react/.eslintrc.js",
    path.resolve(".eslintrc.js"),
    {},
  );
  copyTemplate(".prettierrc", path.resolve(".prettierrc"), {});

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

async function stepStyleguide() {
  const answer = await prompt("Set up styleguide? [Y/n]", "y");
  if (answer.toLowerCase() === "n") {
    setupStyleguide = false;
    return;
  }
  console.log(YELLOW + "🎨 Setting up styleguide..." + RESET);
  fs.mkdirSync(path.resolve("src/styles/components"), { recursive: true });
  copyTemplate("styleguide.scss", path.resolve("src/styles/styleguide.scss"), {});
  copyTemplate("base.scss", path.resolve("src/styles/base.scss"), {});
  if (framework === "vite") {
    copyTemplate("vite/styles.scss", path.resolve("src/styles/styles.scss"), {});
  }
  if (framework === "react") {
    copyTemplate("react/styles.scss", path.resolve("src/styles/styles.scss"), {});
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
      ? "vite/vite.config.ts"
      : "react/vite.config.ts",
    path.resolve("vite.config.ts"),
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
  execSync('git commit -m "CHORE: initial project setup"', {
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

async function stepAiSetup() {
  try {
    const promptPath = path.join(scriptDir, "prompts", "SETUP_PROMPT.md");
    const answer = await prompt("Run AI setup now? (y/n)", "n");
    if (answer.toLowerCase() !== "y") {
      console.log(
        YELLOW + `💡 Run it later: claude < "${promptPath}"` + RESET,
      );
      return;
    }
    console.log(YELLOW + "🤖 Running AI setup via Claude CLI..." + RESET);
    const ok = runClaudeCli("SETUP_PROMPT.md");
    if (ok) {
      const committed = commitIfDirty("CHORE: apply AI setup");
      if (!committed) {
        console.log(
          YELLOW +
            "⚠️  AI setup ran but changes could not be committed. Commit them manually." +
            RESET,
        );
      }
      console.log(GREEN + "✅ AI setup complete." + RESET);
    }
  } catch (e) {
    console.log(
      YELLOW +
        "⚠️  AI setup step failed: " +
        e.message +
        ". Continuing." +
        RESET,
    );
  }
}

// ─── Upgrade mode functions ────────────────────────────────────────────────────

function upgradeAssertGitRepo() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe" });
  } catch (e) {
    console.error(
      RED + "❌ Not a git repository. Please initialize git first." + RESET,
    );
    process.exit(1);
  }
}

function upgradeCheckWebEligibility() {
  const indexPath = path.resolve("index.html");
  if (!fs.existsSync(indexPath)) {
    const htmlFiles = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
    if (htmlFiles.length === 0) {
      console.log(
        RED +
          "❌ Upgrade currently supports web projects only (Vite/React). Use create mode for Roblox/General." +
          RESET,
      );
      process.exit(1);
    }
  }
}

async function upgradeHandleDirtyTree() {
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
    execSync('git commit -m "CHORE: stash uncommitted changes before upgrade"', {
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
        RED +
          "❌ Upgrade currently supports web projects only (Vite/React). Use create mode for Roblox/General." +
          RESET,
      );
      process.exit(1);
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

  if (!fs.existsSync(path.resolve(".eslintrc.js"))) {
    copyTemplate(
      framework === "vite" ? "vite/.eslintrc.js" : "react/.eslintrc.js",
      path.resolve(".eslintrc.js"),
      {},
    );
    console.log(GREEN + "✅ Added .eslintrc.js" + RESET);
  }

  if (!fs.existsSync(path.resolve(".prettierrc"))) {
    copyTemplate(".prettierrc", path.resolve(".prettierrc"), {});
    console.log(GREEN + "✅ Added .prettierrc" + RESET);
  }

  if (!fs.existsSync(path.resolve("tsconfig.json"))) {
    copyTemplate(
      framework === "vite" ? "vite/tsconfig.json" : "react/tsconfig.json",
      path.resolve("tsconfig.json"),
      {},
    );
    console.log(GREEN + "✅ Added tsconfig.json" + RESET);
  }

  // Step 4: ensure styleguide is set up
  // Detect whether project uses src/styles/ (new) or assets/styles/ (old)
  const stylesDir = fs.existsSync(path.resolve("src/styles"))
    ? path.resolve("src/styles")
    : path.resolve("assets/styles");
  const styleguidePath = path.join(stylesDir, "styleguide.scss");
  const styleguideExisted = fs.existsSync(styleguidePath);
  const styleguideContentBefore = styleguideExisted
    ? fs.readFileSync(styleguidePath, "utf8")
    : null;
  let styleguideChanged = false;

  if (!styleguideExisted) {
    fs.mkdirSync(path.join(stylesDir, "components"), { recursive: true });
    copyTemplate("styleguide.scss", styleguidePath, {});
    copyTemplate("base.scss", path.join(stylesDir, "base.scss"), {});
    console.log(GREEN + "✅ Added styleguide.scss" + RESET);

    if (framework === "vite") {
      // Support both old (style.scss) and new (styles.scss) filenames
      const legacyPath = path.join(stylesDir, "style.scss");
      const stylePath = path.join(stylesDir, "styles.scss");
      const targetPath = fs.existsSync(legacyPath) ? legacyPath : stylePath;
      if (!fs.existsSync(targetPath)) {
        copyTemplate("vite/styles.scss", targetPath, {});
      } else {
        let content = fs.readFileSync(targetPath, "utf8");
        if (
          !content.includes("@use './styleguide'") &&
          !content.includes('@use "./styleguide"')
        ) {
          fs.writeFileSync(targetPath, "@use './styleguide';\n" + content);
          console.log(
            YELLOW + "✏️  Added @use './styleguide' to styles.scss" + RESET,
          );
        }
      }
    }

    if (framework === "react") {
      // Support both old (index.scss) and new (styles.scss) filenames
      const legacyPath = path.join(stylesDir, "index.scss");
      const stylesPath = path.join(stylesDir, "styles.scss");
      const targetPath = fs.existsSync(legacyPath) ? legacyPath : stylesPath;
      if (!fs.existsSync(targetPath)) {
        copyTemplate("react/styles.scss", targetPath, {});
      } else {
        let content = fs.readFileSync(targetPath, "utf8");
        if (
          !content.includes("@use './styleguide'") &&
          !content.includes('@use "./styleguide"')
        ) {
          fs.writeFileSync(targetPath, "@use './styleguide';\n" + content);
          console.log(
            YELLOW + "✏️  Added @use './styleguide' to styles.scss" + RESET,
          );
        }
      }
    }
  }

  const styleguideContentAfter = fs.existsSync(styleguidePath)
    ? fs.readFileSync(styleguidePath, "utf8")
    : null;
  styleguideChanged =
    styleguideContentAfter !== null &&
    styleguideContentAfter !== styleguideContentBefore;

  if (styleguideChanged) {
    console.log(
      YELLOW + "🤖 Running styleguide adoption via Claude CLI..." + RESET,
    );
    const styleguideOk = runClaudeCli("STYLEGUIDE_PROMPT.md");
    if (!styleguideOk) {
      const promptPath = path.join(scriptDir, "prompts", "STYLEGUIDE_PROMPT.md");
      console.log(
        RED +
          "❌ Styleguide adoption via Claude CLI failed. Apply it manually." +
          RESET,
      );
      console.log(
        YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET,
      );
    }
  }
}

function upgradeFinalize() {
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "CHORE: apply bepy-project-init upgrade"', {
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

// ─── HTML / CSS / JS workflow ──────────────────────────────────────────────────

async function stepScaffoldHtml() {
  console.log(YELLOW + "⚙️  Setting up HTML project..." + RESET);

  fs.mkdirSync("src", { recursive: true });
  track(path.resolve("src"));

  if (fs.existsSync("index.html")) {
    let html = fs.readFileSync("index.html", "utf8");

    // Extract inline <style>
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      fs.writeFileSync("src/styles.css", styleMatch[1].trim() + "\n");
      track(path.resolve("src/styles.css"));
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/i, "");
      html = html.replace("</head>", '  <link rel="stylesheet" href="src/styles.css">\n</head>');
      console.log(GREEN + "✅ Extracted inline styles → src/styles.css" + RESET);
    } else if (!fs.existsSync("src/styles.css")) {
      fs.writeFileSync("src/styles.css", "/* styles */\n");
      track(path.resolve("src/styles.css"));
      html = html.replace("</head>", '  <link rel="stylesheet" href="src/styles.css">\n</head>');
    }

    // Extract inline <script> (no src= attribute)
    const scriptMatch = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      fs.writeFileSync("src/script.js", scriptMatch[1].trim() + "\n");
      track(path.resolve("src/script.js"));
      html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i, "");
      html = html.replace("</body>", '  <script src="src/script.js"></script>\n</body>');
      console.log(GREEN + "✅ Extracted inline scripts → src/script.js" + RESET);
    } else if (!fs.existsSync("src/script.js")) {
      fs.writeFileSync("src/script.js", "// scripts\n");
      track(path.resolve("src/script.js"));
      html = html.replace("</body>", '  <script src="src/script.js"></script>\n</body>');
    }

    fs.writeFileSync("index.html", html);
  } else {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="src/styles.css">
</head>
<body>

  <script src="src/script.js"></script>
</body>
</html>
`;
    fs.writeFileSync("index.html", html);
    track(path.resolve("index.html"));
    fs.writeFileSync("src/styles.css", "/* styles */\n");
    fs.writeFileSync("src/script.js", "// scripts\n");
    track(path.resolve("src/styles.css"));
    track(path.resolve("src/script.js"));
  }

  // Copy themes to src/themes/
  const themesDir = path.join(scriptDir, "themes");
  if (fs.existsSync(themesDir)) {
    const destThemesDir = path.resolve("src/themes");
    fs.mkdirSync(destThemesDir, { recursive: true });
    track(destThemesDir);
    for (const f of fs.readdirSync(themesDir)) {
      fs.copyFileSync(path.join(themesDir, f), path.join(destThemesDir, f));
    }
    console.log(GREEN + "✅ Themes copied → src/themes/" + RESET);
  }

  // GitHub Pages deploy workflow
  const workflowDir = path.resolve(".github/workflows");
  fs.mkdirSync(workflowDir, { recursive: true });
  track(path.resolve(".github"));
  copyTemplate("html/deploy.yml", path.join(workflowDir, "deploy.yml"), {});

  // .gitignore and .prettierrc
  copyTemplate("html/gitignore", path.resolve(".gitignore"), {});
  copyTemplate(".prettierrc", path.resolve(".prettierrc"), {});

  if (!fs.existsSync(".git")) {
    console.log(YELLOW + "🔧 Initializing git..." + RESET);
    execSync("git init", { stdio: "inherit" });
  }

  console.log(GREEN + "✅ HTML project structure ready." + RESET);
}

async function stepHtmlAiSetup() {
  const templatePath = path.join(scriptDir, "prompts", "HTML_SETUP_PROMPT.md");
  const svgToPngPath = path.join(scriptDir, "svg-to-png.js");

  const answer = await prompt("Run AI setup now? (y/n)", "n");
  if (answer.toLowerCase() !== "y") {
    console.log(YELLOW + `💡 Run it later: claude < "${templatePath}"` + RESET);
    return;
  }

  // Write a resolved version of the prompt with the svg-to-png path substituted in
  const promptContent = fs.readFileSync(templatePath, "utf8")
    .replaceAll("{{SVG_TO_PNG_PATH}}", svgToPngPath);
  const tempPromptPath = path.join(os.tmpdir(), "bepy-html-setup.md");
  fs.writeFileSync(tempPromptPath, promptContent);

  console.log(YELLOW + "🤖 Running AI setup via Claude CLI..." + RESET);
  try {
    execSync(`claude < "${tempPromptPath}"`, { stdio: "inherit" });
    const committed = commitIfDirty("CHORE: AI project setup");
    if (!committed) {
      console.log(YELLOW + "⚠️  AI setup ran but nothing to commit." + RESET);
    }
    console.log(GREEN + "✅ AI setup complete." + RESET);
  } catch (e) {
    console.log(YELLOW + "⚠️  AI setup failed: " + e.message + ". Continuing." + RESET);
  } finally {
    fs.rmSync(tempPromptPath, { force: true });
  }
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
  console.log(GREEN + "🚀 SirBepy's Project Initializer" + version + RESET);

  await resolveFromArgs();
  await promptMissing();

  if (upgradeMode) {
    try {
      upgradeAssertGitRepo();
      upgradeCheckWebEligibility();
      await upgradeHandleDirtyTree();
      await upgradeDetect();
      await upgradePatch();
      upgradeFinalize();
      await stepAiSetup();
    } catch (err) {
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

  // Init / setup path
  await stepProjectName();
  snapshotPreExisting();
  await stepFramework();
  if (isWebFramework(framework)) {
    await preflight(); // safety check before running npm create vite
    stepScaffold();
    await stepStyleguide();
    await stepPwa();
    stepFinalize();
    await stepAiSetup();
  } else if (framework === "html") {
    await stepScaffoldHtml();
    await stepHtmlAiSetup();
  } else {
    stepScaffoldNonWeb();
    await stepAiSetup();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(RED + "❌ Error: " + err.message + RESET);
    cleanup();
    process.exit(1);
  });
