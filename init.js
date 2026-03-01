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

// ─── Step functions ────────────────────────────────────────────────────────────

function selfUpdate() {
  console.log(GREEN + "🚀 Web Project Initializer" + RESET);
  try {
    execFileSync("git", ["-C", scriptDir, "pull"], { stdio: "pipe" });
    console.log(GREEN + "✅ Scripts updated." + RESET);
  } catch (e) {
    console.log(
      YELLOW +
        "⚠️  Could not reach GitHub — running with local version." +
        RESET,
    );
  }
}

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
}

async function stepFramework() {
  const choice = await prompt("Framework? (1) Vite  (2) React", "", (v) => {
    if (v !== "1" && v !== "2") {
      console.log(RED + "Invalid choice. Enter 1 or 2." + RESET);
      return false;
    }
    return true;
  });
  framework = choice === "1" ? "vite" : "react";
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

    copyTemplate("vite/index.html", path.resolve("index.html"), {
      PROJECT_NAME: projectName,
    });

    const srcExisted = fs.existsSync("src");
    fs.mkdirSync("src", { recursive: true });
    if (!srcExisted) track(path.resolve("src"));

    copyTemplate("vite/main.js", path.resolve("src/main.js"), {});

    fs.rmSync("main.js", { force: true });

    const styleScssIsNew = !fs.existsSync(path.resolve("src/style.scss"));
    assertSafeToOverwrite(path.resolve("src/style.scss"));
    fs.writeFileSync(path.resolve("src/style.scss"), "/* Styles */\n");
    if (styleScssIsNew) track(path.resolve("src/style.scss"));

    const assetsIconsExisted = fs.existsSync("assets/icons");
    fs.mkdirSync("assets/icons", { recursive: true });
    if (!assetsIconsExisted) track(path.resolve("assets/icons"));
    const assetsImagesExisted = fs.existsSync("assets/images");
    fs.mkdirSync("assets/images", { recursive: true });
    if (!assetsImagesExisted) track(path.resolve("assets/images"));

    copyTemplate("build-info.js", path.resolve("build-info.js"), {});
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
    const indexScssIsNew = !fs.existsSync(path.resolve("src/index.scss"));
    assertSafeToOverwrite(path.resolve("src/index.scss"));
    fs.writeFileSync(path.resolve("src/index.scss"), "/* Styles */\n");
    if (indexScssIsNew) track(path.resolve("src/index.scss"));
    copyTemplate("react/App.scss", path.resolve("src/App.scss"), {});

    const srcComponentsExisted = fs.existsSync("src/components");
    fs.mkdirSync("src/components", { recursive: true });
    if (!srcComponentsExisted) track(path.resolve("src/components"));

    const reactIconsExisted = fs.existsSync("assets/icons");
    fs.mkdirSync("assets/icons", { recursive: true });
    if (!reactIconsExisted) track(path.resolve("assets/icons"));
    const reactImagesExisted = fs.existsSync("assets/images");
    fs.mkdirSync("assets/images", { recursive: true });
    if (!reactImagesExisted) track(path.resolve("assets/images"));

    copyTemplate("build-info.js", path.resolve("src/build-info.js"), {});
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

  console.log(GREEN + "✅ Project scaffolded." + RESET);
}

async function stepStyleguide() {
  const answer = await prompt("Set up styleguide? [Y/n]", "y");
  if (answer.toLowerCase() === "n") return;

  console.log(YELLOW + "🎨 Setting up styleguide..." + RESET);

  copyTemplate("styleguide.scss", path.resolve("src/styleguide.scss"), {});

  if (framework === "vite") {
    copyTemplate("vite/style.scss", path.resolve("src/style.scss"), {});
  }
  if (framework === "react") {
    copyTemplate("react/index.scss", path.resolve("src/index.scss"), {});
    copyTemplate("react/App.scss", path.resolve("src/App.scss"), {});
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

  // Inject PWA tags into index.html
  const indexPath = path.resolve("index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  const pwaTags =
    '    <link rel="manifest" href="/manifest.json">\n' +
    '    <meta name="theme-color" content="' +
    themeColor +
    '">\n';
  assertSafeToOverwrite(indexPath);
  fs.writeFileSync(
    indexPath,
    indexHtml.replace("</head>", pwaTags + "  </head>"),
  );

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
  });

  console.log(YELLOW + "🔧 Initializing git..." + RESET);
  execSync("git init", { stdio: "inherit" });
  copyTemplate(".gitignore", path.resolve(".gitignore"), {});
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
      "Next steps:\n" +
      "  npm run dev\n" +
      "  Add your GitHub remote: git remote add origin <url>" +
      RESET,
  );
}

// ─── Main entry point ──────────────────────────────────────────────────────────

async function main() {
  selfUpdate();
  await preflight();
  await stepProjectName();
  snapshotPreExisting();
  await stepFramework();
  stepScaffold();
  await stepStyleguide();
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
