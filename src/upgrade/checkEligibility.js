"use strict";

const fs = require("fs");
const path = require("path");
const { RED, RESET } = require("../shared/colors");

function upgradeCheckWebEligibility() {
  const indexPath = path.resolve("index.html");
  if (!fs.existsSync(indexPath)) {
    const htmlFiles = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
    if (htmlFiles.length === 0) {
      console.log(RED + "❌ Upgrade currently supports web projects only (Vite/React). Use create mode for Roblox/General." + RESET);
      process.exit(1);
    }
  }
}

module.exports = upgradeCheckWebEligibility;
