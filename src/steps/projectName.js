"use strict";

const fs = require("fs");
const path = require("path");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { GREEN, RESET } = require("../shared/colors");

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
  state.projectName = name;
}

module.exports = stepProjectName;
