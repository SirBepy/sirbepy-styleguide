"use strict";

const path = require("path");
const state = require("../state");
const { prompt } = require("../shared/prompt");
const { runClaudeCli, commitIfDirty } = require("../shared/git");
const { GREEN, YELLOW, RESET } = require("../shared/colors");

async function stepAiSetup() {
  try {
    const promptPath = path.join(state.scriptDir, "prompts", "SETUP_PROMPT.md");
    const answer = await prompt("Run AI setup now? (y/n)", "y");
    if (answer.toLowerCase() !== "y") {
      console.log(YELLOW + `💡 Run it later: claude < "${promptPath}"` + RESET);
      return;
    }
    console.log(YELLOW + "🤖 Running AI setup via Claude CLI..." + RESET);
    const ok = runClaudeCli("SETUP_PROMPT.md");
    if (ok) {
      const committed = commitIfDirty("CHORE: apply AI setup");
      if (!committed) {
        console.log(YELLOW + "⚠️  AI setup ran but changes could not be committed. Commit them manually." + RESET);
      }
      console.log(GREEN + "✅ AI setup complete." + RESET);
    }
  } catch (e) {
    console.log(YELLOW + "⚠️  AI setup step failed: " + e.message + ". Continuing." + RESET);
  }
}

module.exports = stepAiSetup;
