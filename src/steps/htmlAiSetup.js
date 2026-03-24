"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { commitIfDirty } = require("../shared/git");
const { GREEN, YELLOW, RESET } = require("../shared/colors");

async function stepHtmlAiSetup() {
  const templatePath = path.join(state.scriptDir, "prompts", "HTML_SETUP_PROMPT.md");
  const svgToPngPath = path.join(state.scriptDir, "svg-to-png.js");

  const answer = await prompt("Run AI setup now? (y/n)", "y");
  if (answer.toLowerCase() !== "y") {
    console.log(YELLOW + `💡 Run it later: claude --dangerously-skip-permissions -p < "${templatePath}"` + RESET);
    return;
  }

  const promptContent = fs.readFileSync(templatePath, "utf8")
    .replaceAll("{{SVG_TO_PNG_PATH}}", svgToPngPath);

  console.log(YELLOW + "🤖 Running AI setup..." + RESET);
  const result = spawnSync("claude", ["--dangerously-skip-permissions", "-p"], {
    input: promptContent,
    stdio: ["pipe", "inherit", "inherit"],
  });

  if (result.status === 0) {
    const committed = commitIfDirty("CHORE: AI project setup");
    if (!committed) console.log(YELLOW + "⚠️  Nothing to commit after AI setup." + RESET);
    console.log(GREEN + "✅ AI setup complete." + RESET);
  } else {
    console.log(YELLOW + "⚠️  AI setup failed." + RESET);
  }
}

module.exports = stepHtmlAiSetup;
