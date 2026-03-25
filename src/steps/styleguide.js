"use strict";

const fs = require("fs");
const path = require("path");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { copyTemplate } = require("../shared/files");
const { GREEN, YELLOW, RESET } = require("../shared/colors");

async function stepStyleguide() {
  const answer = await prompt("Set up styleguide? [Y/n]", "y");
  if (answer.toLowerCase() === "n") {
    state.setupStyleguide = false;
    return;
  }
  console.log(YELLOW + "🎨 Setting up styleguide..." + RESET);
  fs.mkdirSync(path.resolve("src/styles/components"), { recursive: true });
  copyTemplate("base.scss", path.resolve("src/styles/base.scss"), {});
  if (state.framework === "vite") {
    copyTemplate("vite/styles.scss", path.resolve("src/styles/styles.scss"), {});
  }
  if (state.framework === "react") {
    copyTemplate("react/styles.scss", path.resolve("src/styles/styles.scss"), {});
  }
  console.log(GREEN + "✅ Styleguide ready." + RESET);
  state.setupStyleguide = true;
}

module.exports = stepStyleguide;
