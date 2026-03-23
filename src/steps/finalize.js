"use strict";

const path = require("path");
const { execSync } = require("child_process");
const state = require("../state");
const { copyTemplate, mergeGitignore } = require("../shared/files");
const { GREEN, YELLOW, RESET } = require("../shared/colors");

function stepFinalize() {
  copyTemplate("README.md", path.resolve("README.md"), {
    PROJECT_NAME: state.projectName,
    FRAMEWORK: state.framework === "vite" ? "Vite" : "React",
    PROJECT_DESCRIPTION: state.projectDescription,
  });

  console.log(YELLOW + "🔧 Initializing git..." + RESET);
  execSync("git init", { stdio: "inherit" });
  mergeGitignore(path.resolve(".gitignore"));
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "CHORE: initial project setup"', { stdio: "inherit" });

  console.log(
    GREEN +
      "✅ " + state.projectName + " initialized\n" +
      "\n" +
      "   Framework:   " + (state.framework === "vite" ? "Vite" : "React") + "\n" +
      "   Styleguide:  " + (state.setupStyleguide ? "yes" : "no") + "\n" +
      "   PWA:         " + (state.setupPwa ? "yes" : "no") + "\n" +
      "\n" +
      "Next steps (manual):\n" +
      "  Run when ready: npm run dev\n" +
      "  Add your GitHub remote: git remote add origin <url>" +
      RESET,
  );
}

module.exports = stepFinalize;
