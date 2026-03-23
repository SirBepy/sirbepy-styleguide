"use strict";

const inquirer = require("inquirer");

function prompt(label, defaultVal, validator) {
  return inquirer.prompt([{
    type: "input",
    name: "value",
    message: label,
    default: (defaultVal !== undefined && defaultVal !== "") ? defaultVal : undefined,
    validate: validator ? (input) => {
      const val = (input === "" || input === undefined) ? (defaultVal || "") : input;
      const result = validator(val);
      return result === true ? true : (typeof result === "string" ? result : " ");
    } : undefined,
  }]).then(a => {
    const val = a.value;
    if (val === undefined || val === null || val === "") return defaultVal || "";
    return val;
  });
}

function select(message, choices) {
  return inquirer.prompt([{
    type: "list",
    name: "value",
    message,
    choices,
  }]).then(a => a.value);
}

module.exports = { prompt, select };
