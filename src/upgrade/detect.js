"use strict";

const fs = require("fs");
const path = require("path");
const { prompt } = require("../shared/prompt");
const { GREEN, RED, YELLOW, RESET } = require("../shared/colors");

const CONFIG_RE = /\.config\.(js|ts|mjs|cjs)$/;
const SW_RE = /^(sw|service-?worker|firebase-messaging-sw)\.js$/i;
const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
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

  if (fs.existsSync("assets")) {
    for (const entry of fs.readdirSync("assets", { withFileTypes: true })) {
      if (entry.isFile()) {
        const name = entry.name;
        if (name.endsWith(".js")) {
          misplaced.push(`assets/${name} → assets/scripts/${name}`);
        } else if (name.endsWith(".css") || name.endsWith(".scss")) {
          misplaced.push(`assets/${name} → assets/styles/${name}`);
        } else if (IMAGE_RE.test(name)) {
          misplaced.push(`assets/${name} → assets/images/${name}`);
        }
      } else if (entry.isDirectory()) {
        const dirName = entry.name;
        if (dirName === "scripts" || dirName === "styles" || dirName === "images") continue;
        const subDir = path.join("assets", dirName);
        for (const file of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (!file.isFile()) continue;
          const name = file.name;
          if (name.endsWith(".js")) {
            misplaced.push(`assets/${dirName}/${name} → assets/scripts/${name}`);
          } else if (name.endsWith(".css") || name.endsWith(".scss")) {
            misplaced.push(`assets/${dirName}/${name} → assets/styles/${name}`);
          } else if (IMAGE_RE.test(name)) {
            misplaced.push(`assets/${dirName}/${name} → assets/images/${name}`);
          }
        }
      }
    }
  }

  for (const entry of fs.readdirSync(".", { withFileTypes: true })) {
    if (entry.isFile()) {
      const name = entry.name;
      if (name.startsWith(".") || CONFIG_RE.test(name) || SW_RE.test(name)) continue;
      if (name.endsWith(".js")) {
        misplaced.push(`${name} → assets/scripts/${name}`);
      } else if (name.endsWith(".css") || name.endsWith(".scss")) {
        misplaced.push(`${name} → assets/styles/${name}`);
      } else if ((name.endsWith(".ts") || name.endsWith(".tsx")) && !name.endsWith(".d.ts")) {
        misplaced.push(`${name} → src/${name}`);
      } else if (IMAGE_RE.test(name)) {
        misplaced.push(`${name} → assets/images/${name}`);
      }
    } else if (entry.isDirectory()) {
      const dirName = entry.name;
      if (dirName !== "images" && dirName !== "img") continue;
      const dirPath = path.join(".", dirName);
      for (const file of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        misplaced.push(`${dirName}/${file.name} → assets/images/${file.name}`);
      }
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
      if (entry.isFile()) {
        const name = entry.name;
        const src = path.resolve("assets", name);
        if (name.endsWith(".js")) {
          moveFile(src, "assets/scripts", "assets/" + name);
        } else if (name.endsWith(".css") || name.endsWith(".scss")) {
          moveFile(src, "assets/styles", "assets/" + name);
        } else if (IMAGE_RE.test(name)) {
          fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
          moveFile(src, "assets/images", "assets/" + name);
        }
      } else if (entry.isDirectory()) {
        const dirName = entry.name;
        if (dirName === "scripts" || dirName === "styles" || dirName === "images") continue;
        const subDir = path.resolve("assets", dirName);
        for (const file of fs.readdirSync(subDir, { withFileTypes: true })) {
          if (!file.isFile()) continue;
          const name = file.name;
          const src = path.join(subDir, name);
          const relPath = `assets/${dirName}/${name}`;
          if (name.endsWith(".js")) {
            moveFile(src, "assets/scripts", relPath);
          } else if (name.endsWith(".css") || name.endsWith(".scss")) {
            moveFile(src, "assets/styles", relPath);
          } else if (IMAGE_RE.test(name)) {
            fs.mkdirSync(path.resolve("assets/images"), { recursive: true });
            moveFile(src, "assets/images", relPath);
          }
        }
        // remove the subfolder if it's now empty
        if (fs.readdirSync(subDir).length === 0) {
          fs.rmdirSync(subDir);
          console.log(YELLOW + `🗑️  Removed empty folder assets/${dirName}/` + RESET);
        }
      }
    }
  }

  for (const entry of fs.readdirSync(".", { withFileTypes: true })) {
    if (entry.isFile()) {
      const name = entry.name;
      if (name.startsWith(".") || CONFIG_RE.test(name) || SW_RE.test(name)) continue;
      const src = path.resolve(name);
      if (name.endsWith(".js")) {
        moveFile(src, "assets/scripts", name);
      } else if (name.endsWith(".css") || name.endsWith(".scss")) {
        moveFile(src, "assets/styles", name);
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
