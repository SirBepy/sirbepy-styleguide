"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const state = require("../../state");
const { track, copyTemplate } = require("../../shared/files");
const { GREEN, YELLOW, RESET } = require("../../shared/colors");

async function stepScaffoldHtml() {
  console.log(YELLOW + "⚙️  Setting up HTML project..." + RESET);

  fs.mkdirSync("src", { recursive: true });
  track(path.resolve("src"));

  // If no index.html but exactly one .html file exists, treat it as index.html
  if (!fs.existsSync("index.html")) {
    const htmlFiles = fs.readdirSync(".").filter(f => f.endsWith(".html"));
    if (htmlFiles.length === 1) {
      console.log(YELLOW + `Renaming ${htmlFiles[0]} → index.html` + RESET);
      fs.renameSync(htmlFiles[0], "index.html");
    }
  }

  if (fs.existsSync("index.html")) {
    let html = fs.readFileSync("index.html", "utf8");

    // Extract inline <style>
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      fs.writeFileSync("src/styles.css", styleMatch[1].trim() + "\n");
      track(path.resolve("src/styles.css"));
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/i, "");
      html = html.replace("</head>", '  <link rel="stylesheet" href="src/styles.css">\n</head>');
      console.log(GREEN + "✅ Extracted inline styles → src/styles.css" + RESET);
    } else if (!fs.existsSync("src/styles.css")) {
      fs.writeFileSync("src/styles.css", "/* styles */\n");
      track(path.resolve("src/styles.css"));
      html = html.replace("</head>", '  <link rel="stylesheet" href="src/styles.css">\n</head>');
    }

    // Extract inline <script> (no src= attribute)
    const scriptMatch = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      fs.writeFileSync("src/script.js", scriptMatch[1].trim() + "\n");
      track(path.resolve("src/script.js"));
      html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i, "");
      html = html.replace("</body>", '  <script src="src/script.js"></script>\n</body>');
      console.log(GREEN + "✅ Extracted inline scripts → src/script.js" + RESET);
    } else if (!fs.existsSync("src/script.js")) {
      fs.writeFileSync("src/script.js", "// scripts\n");
      track(path.resolve("src/script.js"));
      html = html.replace("</body>", '  <script src="src/script.js"></script>\n</body>');
    }

    fs.writeFileSync("index.html", html);
  } else {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${state.projectName}</title>
  <link rel="stylesheet" href="src/styles.css">
</head>
<body>

  <script src="src/script.js"></script>
</body>
</html>
`;
    fs.writeFileSync("index.html", html);
    track(path.resolve("index.html"));
    fs.writeFileSync("src/styles.css", "/* styles */\n");
    fs.writeFileSync("src/script.js", "// scripts\n");
    track(path.resolve("src/styles.css"));
    track(path.resolve("src/script.js"));
  }

  const workflowDir = path.resolve(".github/workflows");
  fs.mkdirSync(workflowDir, { recursive: true });
  track(path.resolve(".github"));
  copyTemplate("html/deploy.yml", path.join(workflowDir, "deploy.yml"), {});

  copyTemplate("html/gitignore", path.resolve(".gitignore"), {});
  copyTemplate(".prettierrc", path.resolve(".prettierrc"), {});

  if (!fs.existsSync(".git")) {
    console.log(YELLOW + "🔧 Initializing git..." + RESET);
    execSync("git init", { stdio: "inherit" });
  }

  console.log(GREEN + "✅ HTML project structure ready." + RESET);
}

module.exports = stepScaffoldHtml;
