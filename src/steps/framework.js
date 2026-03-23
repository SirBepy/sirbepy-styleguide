"use strict";

const fs = require("fs");
const state = require("../state");
const { select } = require("../shared/prompt");
const { GREEN, YELLOW, RESET } = require("../shared/colors");

function isWebFramework(fw) {
  return fw === "vite" || fw === "react";
}

function detectRoblox() {
  const markers = ["default.project.json", ".robloxignore"];
  for (const m of markers) {
    if (fs.existsSync(m)) return true;
  }
  return fs.readdirSync(".").some(f => /\.(rbxlx|rbxl|rbxm|rbxmx)$/.test(f));
}

async function stepFramework() {
  if (["vite", "react", "roblox", "general", "html"].includes(state.framework)) return;

  if (detectRoblox()) {
    state.framework = "roblox";
    console.log(GREEN + "🎮 Roblox project detected." + RESET);
    return;
  }

  const projectType = await select("What kind of project?", [
    { name: "Web", value: "web" },
    { name: "Game", value: "game" },
    { name: "Other", value: "other" },
  ]);

  if (projectType === "game") {
    state.framework = "roblox";
    return;
  }

  if (projectType === "other") {
    console.log(YELLOW + "⚠️  Other projects not yet supported." + RESET);
    process.exit(0);
  }

  const hasJsonOrScss = fs.readdirSync(".").some(f => f.endsWith(".json") || f.endsWith(".scss"));
  const webChoices = [
    { name: "Simple Web  (HTML / CSS / JS)", value: "html" },
    { name: "Vite        (vanilla JS + bundler)", value: "vite" },
    { name: "React       (React + Vite)", value: "react" },
  ];
  if (hasJsonOrScss) {
    const simpleWeb = webChoices.shift();
    webChoices.push(simpleWeb);
  }

  state.framework = await select("What kind of web project?", webChoices);
}

module.exports = { stepFramework, isWebFramework };
