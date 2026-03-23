"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const state = require("../state");
const { YELLOW, RESET } = require("./colors");

function downloadThemes(destDir) {
  const themes = ["void", "glacier", "cosmo", "nebula"];
  for (const theme of themes) {
    const localPath = path.join(state.scriptDir, "themes", `theme-${theme}.css`);
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
        console.log(YELLOW + `⚠️  Could not download theme-${theme}.css` + RESET);
      }
    }
  }
}

module.exports = { downloadThemes };
