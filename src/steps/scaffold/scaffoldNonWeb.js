"use strict";

const path = require("path");
const { execSync } = require("child_process");
const state = require("../../state");
const { copyTemplate } = require("../../shared/files");
const { GREEN, YELLOW, RESET } = require("../../shared/colors");

function stepScaffoldNonWeb() {
  console.log(YELLOW + "⚙️  Setting up project..." + RESET);

  const subs = {
    PROJECT_NAME: state.projectName,
    PROJECT_DESCRIPTION: state.projectDescription,
  };

  copyTemplate(`${state.framework}/gitignore`, path.resolve(".gitignore"), subs);
  copyTemplate(`${state.framework}/CLAUDE.md`, path.resolve("CLAUDE.md"), subs);
  copyTemplate(`${state.framework}/README.md`, path.resolve("README.md"), subs);
  copyTemplate(`${state.framework}/skills`, path.resolve("skills"), subs);

  console.log(YELLOW + "🔧 Initializing git..." + RESET);
  execSync("git init", { stdio: "inherit" });
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "CHORE: initial project setup"', { stdio: "inherit" });

  console.log(GREEN + "✅ Project set up." + RESET);
}

module.exports = stepScaffoldNonWeb;
