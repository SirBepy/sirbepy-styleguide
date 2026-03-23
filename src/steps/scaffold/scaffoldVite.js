"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const state = require("../../state");
const { track, copyTemplate } = require("../../shared/files");
const { downloadThemes } = require("../../shared/themes");
const { GREEN, YELLOW, RESET } = require("../../shared/colors");

// Handles both "vite" (vanilla-ts) and "react" (react-ts) scaffolding
function stepScaffold() {
  console.log(YELLOW + "⚙️  Scaffolding project..." + RESET);

  const before = new Set(fs.readdirSync("."));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bepy-vite-"));
  execSync(
    "npm create vite@latest " +
      tmpDir +
      " -- --template " +
      (state.framework === "vite" ? "vanilla-ts" : "react-ts"),
    { stdio: "inherit" },
  );

  // Copy scaffolded files to cwd (rename can fail across drives on Windows)
  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const child of fs.readdirSync(src)) {
        copyRecursive(path.join(src, child), path.join(dest, child));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  for (const entry of fs.readdirSync(tmpDir)) {
    const src = path.join(tmpDir, entry);
    const dest = path.resolve(entry);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    copyRecursive(src, dest);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });

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

  if (state.framework === "vite") {
    _scaffoldViteSpecific();
  } else {
    _scaffoldReactSpecific();
  }

  _scaffoldShared();

  console.log(GREEN + "✅ Project scaffolded." + RESET);
}

function _scaffoldViteSpecific() {
  for (const f of ["src/counter.ts", "src/typescript.svg", "public/vite.svg"]) {
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }
  fs.rmSync("src/style.css", { force: true });
  fs.rmSync("src/main.ts", { force: true });

  copyTemplate("vite/index.html", path.resolve("index.html"), {
    PROJECT_NAME: state.projectName,
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

  const stylesStubPath = path.resolve("src/styles/styles.scss");
  if (!fs.existsSync(stylesStubPath)) {
    fs.writeFileSync(stylesStubPath, "/* Styles */\n");
    track(stylesStubPath);
  }

  copyTemplate("vite/app.ts", path.resolve("src/app.ts"), {});
  copyTemplate("build-info.js", path.resolve("assets/scripts/build-info.js"), {});
}

function _scaffoldReactSpecific() {
  execSync("npm install -D eslint-plugin-react eslint-plugin-react-hooks", { stdio: "inherit" });
  fs.rmSync("src/App.css", { force: true });
  fs.rmSync("src/assets/react.svg", { force: true });
  fs.rmSync("public/vite.svg", { force: true });
  fs.rmSync("src/index.css", { force: true });

  copyTemplate("react/App.tsx", path.resolve("src/App.tsx"), {
    PROJECT_NAME: state.projectName,
  });
  copyTemplate("react/main.tsx", path.resolve("src/main.tsx"), {});
  copyTemplate("react/index.html", path.resolve("index.html"), {
    PROJECT_NAME: state.projectName,
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

  const stylesStubPath = path.resolve("src/styles/styles.scss");
  if (!fs.existsSync(stylesStubPath)) {
    fs.writeFileSync(stylesStubPath, "/* Styles */\n");
    track(stylesStubPath);
  }

  copyTemplate("build-info.js", path.resolve("assets/scripts/build-info.js"), {});
}

function _scaffoldShared() {
  const githubExisted = fs.existsSync(".github");
  fs.mkdirSync(".github/workflows", { recursive: true });
  if (!githubExisted) track(path.resolve(".github"));

  copyTemplate(
    state.framework === "vite" ? "deploy.yml" : "deploy-react.yml",
    path.resolve(".github/workflows/deploy.yml"),
    {},
  );

  copyTemplate(
    state.framework === "vite" ? "vite/.eslintrc.js" : "react/.eslintrc.js",
    path.resolve(".eslintrc.js"),
    {},
  );
  copyTemplate(".prettierrc", path.resolve(".prettierrc"), {});

  try {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.name = state.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    pkg.description = state.projectDescription;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch (e) {
    // package.json may not exist yet or may be malformed
  }
}

module.exports = stepScaffold;
