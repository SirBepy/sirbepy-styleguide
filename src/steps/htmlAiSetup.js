"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
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

  const setupPromptPath = path.resolve(".bepy-setup.md");
  const scriptPath = path.join(os.tmpdir(), "bepy-setup.ps1");

  const promptContent = fs.readFileSync(templatePath, "utf8")
    .replaceAll("{{SVG_TO_PNG_PATH}}", svgToPngPath);
  fs.writeFileSync(setupPromptPath, promptContent);

  const promptPathEscaped = setupPromptPath.replace(/'/g, "''");
  fs.writeFileSync(scriptPath,
    `$prompt = Get-Content -Raw '${promptPathEscaped}'\n` +
    `claude --dangerously-skip-permissions -p $prompt\n`
  );

  console.log(YELLOW + "🤖 Running AI setup..." + RESET);
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: "inherit" });
    fs.rmSync(setupPromptPath, { force: true });
    const committed = commitIfDirty("CHORE: AI project setup");
    if (!committed) console.log(YELLOW + "⚠️  Nothing to commit after AI setup." + RESET);
    console.log(GREEN + "✅ AI setup complete." + RESET);
  } catch (e) {
    console.log(YELLOW + "⚠️  AI setup failed: " + e.message + RESET);
  } finally {
    fs.rmSync(setupPromptPath, { force: true });
    fs.rmSync(scriptPath, { force: true });
  }
}

module.exports = stepHtmlAiSetup;
