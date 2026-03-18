# Roblox Project — Claude Instructions

This is a Roblox game project managed with Rojo for file-based development.

## Stack

- **Rojo** — syncs files to Roblox Studio
- **Luau** — strictly-typed Lua dialect used throughout
- **Wally** — package manager (if packages are present in `Packages/`)

## Project structure

```
src/
  ServerScriptService/   # Server-side scripts
  ReplicatedStorage/     # Shared modules
  StarterPlayerScripts/  # Client-side scripts
  StarterGui/            # UI scripts
default.project.json     # Rojo project file
wally.toml               # Package manifest (if used)
```

## Conventions

- Use `--!strict` at the top of every Luau file
- Prefer `local` bindings; avoid globals
- Name modules in PascalCase, instances in PascalCase, variables in camelCase
- Use `task.spawn` / `task.defer` instead of deprecated `spawn` / `delay`
- Remote events live in `ReplicatedStorage/Remotes`

## Common commands

```bash
rojo serve          # Start Rojo dev server
rojo build          # Build place file
wally install       # Install Wally packages
```
