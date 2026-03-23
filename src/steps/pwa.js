"use strict";

const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { track, assertSafeToOverwrite, copyTemplate, injectIntoHtml } = require("../shared/files");
const { GREEN, RED, YELLOW, RESET } = require("../shared/colors");

async function stepPwa() {
  const answer = await prompt("Set up as PWA? [y/N]", "n");
  if (answer.toLowerCase() !== "y") return;

  state.themeColor = await prompt("Theme color?", "#0f0f0f", (v) => {
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
      '<rect width="100" height="100" fill="' + state.themeColor + '"/>' +
      "</svg>";
    assertSafeToOverwrite(iconDestPath);
    fs.writeFileSync(iconDestPath, placeholderSvg);
  }
  if (!iconExisted) track(iconDestPath);

  console.log(YELLOW + "🖼️  Generating PNG icons..." + RESET);

  execFileSync(process.execPath, [
    path.join(state.scriptDir, "svg-to-png.js"),
    "assets/icons/icon.svg",
    "assets/icons/icon-192.png",
    "192",
  ], { stdio: "inherit" });
  track(path.resolve("assets/icons/icon-192.png"));

  execFileSync(process.execPath, [
    path.join(state.scriptDir, "svg-to-png.js"),
    "assets/icons/icon.svg",
    "assets/icons/icon-512.png",
    "512",
  ], { stdio: "inherit" });
  track(path.resolve("assets/icons/icon-512.png"));

  copyTemplate("manifest.json", path.resolve("manifest.json"), {
    PROJECT_NAME: state.projectName,
    THEME_COLOR: state.themeColor,
  });

  injectIntoHtml(path.resolve("index.html"), {
    pwaManifest: true,
    pwaThemeColor: state.themeColor,
  });

  execSync("npm install -D vite-plugin-pwa", { stdio: "inherit" });

  copyTemplate(
    state.framework === "vite" ? "vite/vite.config.ts" : "react/vite.config.ts",
    path.resolve("vite.config.ts"),
    {},
  );

  console.log(GREEN + "✅ PWA configured." + RESET);
  state.setupPwa = true;
}

module.exports = stepPwa;
