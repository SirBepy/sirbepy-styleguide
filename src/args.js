"use strict";

const fs = require("fs");
const state = require("./state");
const { GREEN, YELLOW, RESET } = require("./shared/colors");

async function resolveFromArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) return;

  const [first, second] = args;

  const webFrameworks = ["react", "vite"];
  const allFrameworks = ["react", "vite", "roblox", "general", "html"];

  if (first === "update" || first === "upgrade") {
    state.upgradeMode = true;
    if (webFrameworks.includes(second)) state.framework = second;
    return;
  }

  if (first === "init" || first === "create") {
    state.upgradeMode = false;
    if (allFrameworks.includes(second)) state.framework = second;
    return;
  }

  if (allFrameworks.includes(first)) {
    state.upgradeMode = false;
    state.framework = first;
    return;
  }

  if (first === "update-react") {
    state.upgradeMode = true;
    state.framework = "react";
    return;
  }
  if (first === "update-vite") {
    state.upgradeMode = true;
    state.framework = "vite";
    return;
  }

  console.log(YELLOW + `⚠️  Unknown argument "${first}".` + RESET);
  console.log(`Usage: init [init|update] [react|vite]`);
}

async function promptMissing() {
  const files = fs.readdirSync(".");

  if (state.framework === "") {
    const hasViteConfig = files.some(f => /^vite\.config\.[jt]s$/.test(f));
    if (hasViteConfig) {
      const hasTsx = fs.existsSync("src") &&
        fs.readdirSync("src").some(f => f.endsWith(".tsx") || f.endsWith(".jsx"));
      state.framework = hasTsx ? "react" : "vite";
    } else if (files.some(f => f.endsWith(".html"))) {
      state.framework = "html";
    }
  }

  if (state.upgradeMode === null) {
    if (state.framework === "vite" || state.framework === "react") {
      state.upgradeMode = true;
      console.log(GREEN + `🔍 Detected ${state.framework} project — running update.` + RESET);
    } else {
      state.upgradeMode = false;
      if (state.framework === "html") {
        console.log(GREEN + "🔍 Detected HTML project." + RESET);
      }
    }
  }
}

module.exports = { resolveFromArgs, promptMissing };
