"use strict";

const fs = require("fs");
const path = require("path");
const state = require("../state");
const { copyTemplate, mergeGitignore, injectIntoHtml } = require("../shared/files");
const { runClaudeCli } = require("../shared/git");
const { downloadThemes } = require("../shared/themes");
const { migrateLooseFiles, isWorkflow } = require("./detect");
const { GREEN, RED, YELLOW, RESET } = require("../shared/colors");

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
    content = content.replace("- run: npm ci", injectStep + "      - run: npm ci");
  } else {
    content = content + "\n" + injectStep;
  }

  fs.writeFileSync(workflowPath, content);
}

async function upgradePatch() {
  // Step 1: migrate loose JS/CSS/SCSS files to correct asset dirs
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
    console.log(YELLOW + "📁 Moved assets/themes/ → assets/styles/themes/" + RESET);
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

  // Step 3: add build-info only if not already present
  if (!fs.existsSync(path.resolve("assets/scripts/build-info.js"))) {
    copyTemplate("build-info.js", path.resolve("assets/scripts/build-info.js"), {});
  }

  if (fs.existsSync(path.resolve("src/build-info.js"))) {
    fs.rmSync(path.resolve("src/build-info.js"));
    console.log(YELLOW + "🗑️  Removed old src/build-info.js (moved to assets/scripts/)" + RESET);
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
    const pkgName = path.basename(process.cwd()).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    fs.writeFileSync(
      path.resolve("package.json"),
      JSON.stringify({ name: pkgName, version: "1.0.0", scripts: { dev: "npx serve ." } }, null, 2) + "\n",
    );
    console.log(GREEN + "✅ Created package.json" + RESET);
  }

  mergeGitignore(path.resolve(".gitignore"));
  console.log(GREEN + "✅ .gitignore updated." + RESET);

  if (!fs.existsSync(path.resolve(".eslintrc.js"))) {
    copyTemplate(
      state.framework === "vite" ? "vite/.eslintrc.js" : "react/.eslintrc.js",
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
      state.framework === "vite" ? "vite/tsconfig.json" : "react/tsconfig.json",
      path.resolve("tsconfig.json"),
      {},
    );
    console.log(GREEN + "✅ Added tsconfig.json" + RESET);
  }

  // Step 4: ensure styleguide is set up
  const stylesDir = fs.existsSync(path.resolve("src/styles"))
    ? path.resolve("src/styles")
    : path.resolve("assets/styles");
  const styleguidePath = path.join(stylesDir, "styleguide.scss");
  const styleguideExisted = fs.existsSync(styleguidePath);
  const styleguideContentBefore = styleguideExisted ? fs.readFileSync(styleguidePath, "utf8") : null;

  if (!styleguideExisted) {
    fs.mkdirSync(path.join(stylesDir, "components"), { recursive: true });
    copyTemplate("styleguide.scss", styleguidePath, {});
    copyTemplate("base.scss", path.join(stylesDir, "base.scss"), {});
    console.log(GREEN + "✅ Added styleguide.scss" + RESET);

    if (state.framework === "vite") {
      const legacyPath = path.join(stylesDir, "style.scss");
      const stylePath = path.join(stylesDir, "styles.scss");
      const targetPath = fs.existsSync(legacyPath) ? legacyPath : stylePath;
      if (!fs.existsSync(targetPath)) {
        copyTemplate("vite/styles.scss", targetPath, {});
      } else {
        let content = fs.readFileSync(targetPath, "utf8");
        if (!content.includes("@use './styleguide'") && !content.includes('@use "./styleguide"')) {
          fs.writeFileSync(targetPath, "@use './styleguide';\n" + content);
          console.log(YELLOW + "✏️  Added @use './styleguide' to styles.scss" + RESET);
        }
      }
    }

    if (state.framework === "react") {
      const legacyPath = path.join(stylesDir, "index.scss");
      const stylesPath = path.join(stylesDir, "styles.scss");
      const targetPath = fs.existsSync(legacyPath) ? legacyPath : stylesPath;
      if (!fs.existsSync(targetPath)) {
        copyTemplate("react/styles.scss", targetPath, {});
      } else {
        let content = fs.readFileSync(targetPath, "utf8");
        if (!content.includes("@use './styleguide'") && !content.includes('@use "./styleguide"')) {
          fs.writeFileSync(targetPath, "@use './styleguide';\n" + content);
          console.log(YELLOW + "✏️  Added @use './styleguide' to styles.scss" + RESET);
        }
      }
    }
  }

  const styleguideContentAfter = fs.existsSync(styleguidePath) ? fs.readFileSync(styleguidePath, "utf8") : null;
  const styleguideChanged = styleguideContentAfter !== null && styleguideContentAfter !== styleguideContentBefore;

  if (styleguideChanged) {
    console.log(YELLOW + "🤖 Running styleguide adoption via Claude CLI..." + RESET);
    const styleguideOk = runClaudeCli("STYLEGUIDE_PROMPT.md");
    if (!styleguideOk) {
      const promptPath = path.join(state.scriptDir, "prompts", "STYLEGUIDE_PROMPT.md");
      console.log(RED + "❌ Styleguide adoption via Claude CLI failed. Apply it manually." + RESET);
      console.log(YELLOW + `💡 Run it manually: claude < "${promptPath}"` + RESET);
    }
  }
}

module.exports = upgradePatch;
