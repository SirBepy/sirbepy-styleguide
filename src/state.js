"use strict";

const path = require("path");

module.exports = {
  scriptDir: path.dirname(process.argv[1]),
  projectName: "",
  framework: "",
  setupStyleguide: false,
  setupPwa: false,
  themeColor: "",
  projectDescription: "",
  createdFiles: [],
  preExistingFiles: new Set(),
  upgradeMode: null, // null = not yet determined
};
