"use strict";

const fs = require("fs");
const { prompt } = require("../shared/prompt");
const { RED, RESET } = require("../shared/colors");

async function preflight() {
  const entries = fs.readdirSync(".");
  if (entries.length > 0) {
    console.log(RED + "⚠️  Folder is not empty:" + RESET);
    for (const entry of entries) {
      console.log("  " + entry);
    }
    const answer = await prompt("Folder is not empty. Continue anyway? (y/n)", "n");
    if (answer !== "y") {
      console.log("Aborting.");
      process.exit(0);
    }
  }
}

module.exports = preflight;
