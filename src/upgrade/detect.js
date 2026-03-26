"use strict";

const fs = require("fs");
const path = require("path");
const { prompt } = require("../shared/prompt");
const { GREEN, RED, YELLOW, RESET } = require("../shared/colors");

const CONFIG_RE = /\.config\.(js|ts|mjs|cjs)$/;
const SW_RE = /^(sw|service-?worker|firebase-messaging-sw)\.js$/i;
const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const isWorkflow = (f) => f.endsWith(".yml") || f.endsWith(".yaml");

// Convention:
//   src/           — JS and CSS/SCSS
//   assets/images/ — images
//   assets/styles/themes/ — theme CSS (served statically, stays here)
//   root           — .ico files

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
    if (!indexHtml.includes("sirbepy.github.io")) missing.push("widget script tag in index.html");
    if (!indexHtml.includes("active-theme")) missing.push('<style id="active-theme"> in index.html');
    if (!indexHtml.includes("build-info.js")) missing.push("build-info.js script tag in index.html");
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

  if (!fs.existsSync(path.resolve("package.json"))) missing.push("package.json");

  const workflowsDir = path.resolve(".github/workflows");
  if (
    !fs.existsSync(workflowsDir) ||
    fs.readdirSync(workflowsDir).filter(isWorkflow).length === 0
  ) {
    missing.push(".github/workflows/*.yml");
  }

  if (!fs.existsSync(path.resolve(".eslintrc.js"))) missing.push(".eslintrc.js");
  if (!fs.existsSync(path.resolve(".prettierrc"))) missing.push(".prettierrc");
  if (!fs.existsSync(path.resolve("tsconfig.json"))) missing.push("tsconfig.json");

  return missing;
}

function detectMisplaced() {
  const misplaced = [];

  // --- assets/ root-level files ---
  if (fs.existsSync("assets")) {
    for (const entry of fs.readdirSync("assets", { withFileTypes: true })) {
      if (entry.isFile()) {
        const name = entry.name;
        if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".scss")) {
          misplaced.push(`assets/${name} → src/${name}`);
        } else if (name.endsWith(".ico")) {
          misplaced.push(`assets/${name} → ${name}`);
        } else if (IMAGE_RE.test(name)) {
          misplaced.push(`assets/${name} → assets/images/${name}`);
        }
      } else if (entry.isDirectory()) {
        const dirName = entry.name;

        // assets/images/ — only .ico files are misplaced here
        if (dirName === "images") {
          for (const file of fs.readdirSync(path.join("assets", "images"), { withFileTypes: true })) {
            if (file.isFile() && file.name.endsWith(".ico")) {
              misplaced.push(`assets/images/${file.name} → ${file.name}`);
            }
          }
          continue;
        }

        // assets/scripts/ — all JS belongs in src/ now
        if (dirName === "scripts") {
          for (const file of fs.readdirSync(path.join("assets", "scripts"), { withFileTypes: true })) {
            if (!file.isFile()) continue;
            const name = file.name;
            if (name.endsWith(".js")) {
              misplaced.push(`assets/scripts/${name} → src/${name}`);
            }
          }
          continue;
        }

        // assets/styles/ — CSS/SCSS belongs in src/, but themes/ stays here
        if (dirName === "styles") {
          for (const file of fs.readdirSync(path.join("assets", "styles"), { withFileTypes: true })) {
            if (!file.isFile()) continue;
            const name = file.name;
            if (name.endsWith(".css") || name.endsWith(".scss")) {
              misplaced.push(`assets/styles/${name} → src/${name}`);
            }
          }
          continue;
        }

        // other assets/ subdirs
        const subDir = path.join("assets", dirName);
        for (const file of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (!file.isFile()) continue;
          const name = file.name;
          if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".scss")) {
            misplaced.push(`assets/${dirName}/${name} → src/${name}`);
          } else if (name.endsWith(".ico")) {
            misplaced.push(`assets/${dirName}/${name} → ${name}`);
          } else if (IMAGE_RE.test(name)) {
            misplaced.push(`assets/${dirName}/${name} → assets/images/${name}`);
          }
        }
      }
    }
  }

  // --- project root files ---
  for (const entry of fs.readdirSync(".", { withFileTypes: true })) {
    if (entry.isFile()) {
      const name = entry.name;
      if (name.startsWith(".") || CONFIG_RE.test(name) || SW_RE.test(name)) continue;
      if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".scss")) {
        misplaced.push(`${name} → src/${name}`);
      } else if ((name.endsWith(".ts") || name.endsWith(".tsx")) && !name.endsWith(".d.ts")) {
        misplaced.push(`${name} → src/${name}`);
      } else if (IMAGE_RE.test(name)) {
        misplaced.push(`${name} → assets/images/${name}`);
      }
    } else if (entry.isDirectory()) {
      const dirName = entry.name;
      if (dirName !== "images" && dirName !== "img") continue;
      for (const file of fs.readdirSync(path.join(".", dirName), { withFileTypes: true })) {
        if (!file.isFile()) continue;
        misplaced.push(`${dirName}/${file.name} → assets/images/${file.name}`);
      }
    }
  }

  // --- src/ root-level images belong in assets/images/ ---
  if (fs.existsSync("src")) {
    for (const file of fs.readdirSync("src", { withFileTypes: true })) {
      if (!file.isFile()) continue;
      if (IMAGE_RE.test(file.name)) {
        misplaced.push(`src/${file.name} → assets/images/${file.name}`);
      }
    }
  }

  return misplaced;
}

function migrateLooseFiles() {
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

  function moveIcoToRoot(src, oldRelPath) {
    const name = path.basename(src);
    const dest = path.resolve(name);
    if (!fs.existsSync(dest)) {
      fs.renameSync(src, dest);
      moves.push({ old: oldRelPath, new: name });
      console.log(YELLOW + `📁 Moved ${oldRelPath} → ${name}` + RESET);
    }
  }

  if (fs.existsSync("assets")) {
    for (const entry of fs.readdirSync("assets", { withFileTypes: true })) {
      if (entry.isFile()) {
        const name = entry.name;
        const src = path.resolve("assets", name);
        if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".scss")) {
          moveFile(src, "src", "assets/" + name);
        } else if (name.endsWith(".ico")) {
          moveIcoToRoot(src, "assets/" + name);
        } else if (IMAGE_RE.test(name)) {
          fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
          moveFile(src, "assets/images", "assets/" + name);
        }
      } else if (entry.isDirectory()) {
        const dirName = entry.name;

        // assets/images/ — only drain .ico files to root
        if (dirName === "images") {
          const imagesDir = path.resolve("assets", "images");
          for (const file of fs.readdirSync(imagesDir, { withFileTypes: true })) {
            if (!file.isFile() || !file.name.endsWith(".ico")) continue;
            moveIcoToRoot(path.join(imagesDir, file.name), `assets/images/${file.name}`);
          }
          continue;
        }

        // assets/scripts/ — drain all JS to src/
        if (dirName === "scripts") {
          const scriptsDir = path.resolve("assets", "scripts");
          for (const file of fs.readdirSync(scriptsDir, { withFileTypes: true })) {
            if (!file.isFile()) continue;
            if (file.name.endsWith(".js")) {
              moveFile(path.join(scriptsDir, file.name), "src", `assets/scripts/${file.name}`);
            }
          }
          if (fs.readdirSync(scriptsDir).length === 0) {
            fs.rmdirSync(scriptsDir);
            console.log(YELLOW + "🗑️  Removed empty folder assets/scripts/" + RESET);
          }
          continue;
        }

        // assets/styles/ — drain root CSS/SCSS to src/, leave themes/ alone
        if (dirName === "styles") {
          const stylesDir = path.resolve("assets", "styles");
          for (const file of fs.readdirSync(stylesDir, { withFileTypes: true })) {
            if (!file.isFile()) continue;
            const name = file.name;
            if (name.endsWith(".css") || name.endsWith(".scss")) {
              moveFile(path.join(stylesDir, file.name), "src", `assets/styles/${name}`);
            }
          }
          // don't remove assets/styles/ — themes/ subdir lives there
          continue;
        }

        // other assets/ subdirs
        const subDir = path.resolve("assets", dirName);
        for (const file of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (!file.isFile()) continue;
          const name = file.name;
          const src = path.join(subDir, name);
          const relPath = `assets/${dirName}/${name}`;
          if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".scss")) {
            moveFile(src, "src", relPath);
          } else if (name.endsWith(".ico")) {
            moveIcoToRoot(src, relPath);
          } else if (IMAGE_RE.test(name)) {
            fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
            moveFile(src, "assets/images", relPath);
          }
        }
        if (fs.readdirSync(subDir).length === 0) {
          fs.rmdirSync(subDir);
          console.log(YELLOW + `🗑️  Removed empty folder assets/${dirName}/` + RESET);
        }
      }
    }
  }

  // --- project root files ---
  for (const entry of fs.readdirSync(".", { withFileTypes: true })) {
    if (entry.isFile()) {
      const name = entry.name;
      if (name.startsWith(".") || CONFIG_RE.test(name) || SW_RE.test(name)) continue;
      const src = path.resolve(name);
      if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".scss")) {
        moveFile(src, "src", name);
      } else if ((name.endsWith(".ts") || name.endsWith(".tsx")) && !name.endsWith(".d.ts")) {
        moveFile(src, "src", name);
      } else if (IMAGE_RE.test(name)) {
        fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
        moveFile(src, "assets/images", name);
      }
    } else if (entry.isDirectory()) {
      const dirName = entry.name;
      if (dirName !== "images" && dirName !== "img") continue;
      const dirPath = path.resolve(dirName);
      fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
      for (const file of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        moveFile(path.join(dirPath, file.name), "assets/images", `${dirName}/${file.name}`);
      }
      if (fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
        console.log(YELLOW + `🗑️  Removed empty folder ${dirName}/` + RESET);
      }
    }
  }

  // --- src/ root-level images belong in assets/images/ ---
  if (fs.existsSync("src")) {
    for (const file of fs.readdirSync("src", { withFileTypes: true })) {
      if (!file.isFile() || !IMAGE_RE.test(file.name)) continue;
      fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
      moveFile(path.resolve("src", file.name), "assets/images", `src/${file.name}`);
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
      console.log(YELLOW + "✏️  Updated sw.js paths and bumped cache version" + RESET);
    }
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
      const choice = await prompt("Which file is your entry point? (number)", "1");
      const chosen = htmlFiles[parseInt(choice, 10) - 1] || htmlFiles[0];
      console.log(YELLOW + `Renaming ${chosen} → index.html` + RESET);
      fs.renameSync(chosen, "index.html");
      renamed = true;
    } else {
      console.log(RED + "❌ Upgrade currently supports web projects only (Vite/React). Use create mode for Roblox/General." + RESET);
      process.exit(1);
    }
  }

  const missing = detectMissing();
  const misplaced = detectMisplaced();

  if (missing.length === 0 && misplaced.length === 0 && !renamed) {
    console.log(GREEN + "✅ Nothing to upgrade — project is up to date." + RESET);
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log(YELLOW + "The following items will be added:" + RESET);
    for (const item of missing) console.log("  • " + item);
  }
  if (misplaced.length > 0) {
    console.log(YELLOW + "The following files will be moved:" + RESET);
    for (const item of misplaced) console.log("  • " + item);
  }
}

module.exports = { upgradeDetect, migrateLooseFiles, isWorkflow };
