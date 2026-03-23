#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const state = require("./src/state");
const { GREEN, RED, YELLOW, RESET } = require("./src/shared/colors");
const { cleanup, snapshotPreExisting } = require("./src/shared/files");
const { resolveFromArgs, promptMissing } = require("./src/args");

const preflight = require("./src/steps/preflight");
const stepProjectName = require("./src/steps/projectName");
const { stepFramework, isWebFramework } = require("./src/steps/framework");
const stepScaffold = require("./src/steps/scaffold/scaffoldVite");
const stepScaffoldHtml = require("./src/steps/scaffold/scaffoldHtml");
const stepScaffoldNonWeb = require("./src/steps/scaffold/scaffoldNonWeb");
const stepStyleguide = require("./src/steps/styleguide");
const stepPwa = require("./src/steps/pwa");
const stepFinalize = require("./src/steps/finalize");
const stepAiSetup = require("./src/steps/aiSetup");
const stepHtmlAiSetup = require("./src/steps/htmlAiSetup");
const stepPublish = require("./src/steps/publish");

const upgradeAssertGitRepo = require("./src/upgrade/assertGitRepo");
const upgradeCheckWebEligibility = require("./src/upgrade/checkEligibility");
const upgradeHandleDirtyTree = require("./src/upgrade/handleDirtyTree");
const { upgradeDetect } = require("./src/upgrade/detect");
const upgradePatch = require("./src/upgrade/patch");
const upgradeFinalize = require("./src/upgrade/finalize");

async function main() {
  let version = "";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(state.scriptDir, "package.json"), "utf8"));
    if (pkg.version) version = " v" + pkg.version;
  } catch (e) {}
  console.log(GREEN + "🚀 SirBepy's Project Initializer" + version + RESET);

  await resolveFromArgs();
  await promptMissing();

  if (state.upgradeMode) {
    try {
      upgradeAssertGitRepo();
      upgradeCheckWebEligibility();
      await upgradeHandleDirtyTree();
      await upgradeDetect();
      await upgradePatch();
      upgradeFinalize();
      await stepAiSetup();
    } catch (err) {
      console.error(RED + "❌ Error during upgrade: " + err.message + RESET);
      console.log(YELLOW + "💡 To undo: git reset --hard HEAD~1 (or HEAD~2 if cleanup commit was made)" + RESET);
      process.exit(1);
    }
    return;
  }

  // Init / setup path
  await stepProjectName();
  snapshotPreExisting();
  await stepFramework();
  if (isWebFramework(state.framework)) {
    await preflight();
    stepScaffold();
    await stepStyleguide();
    await stepPwa();
    stepFinalize();
    await stepAiSetup();
    await stepPublish();
  } else if (state.framework === "html") {
    await stepScaffoldHtml();
    await stepHtmlAiSetup();
    await stepPublish();
  } else {
    stepScaffoldNonWeb();
    await stepAiSetup();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(RED + "❌ Error: " + err.message + RESET);
    cleanup();
    process.exit(1);
  });
