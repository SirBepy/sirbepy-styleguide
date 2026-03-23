"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { GREEN, RESET } = require("../shared/colors");

function upgradeFinalize() {
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "CHORE: apply bepy-project-init upgrade"', { stdio: "inherit" });

  let devCmd = "  Open index.html in a browser or use a local server";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    if (pkg.scripts && pkg.scripts.dev) devCmd = "  Run when ready: npm run dev";
  } catch (e) {}

  console.log(
    GREEN +
      "✅ Upgrade complete!\n" +
      "\n" +
      "Next steps:\n" +
      devCmd + "\n" +
      "  Push to GitHub to trigger deployment" +
      RESET,
  );
}

module.exports = upgradeFinalize;
