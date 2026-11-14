# rob-run-sdk Reference

**Live site: https://alp1x.github.io/rob-run-sdk-docs/**

A browsable SDK reference built from the Il2CppDumper output: 216 assemblies, 38,092 types, every field offset and method address, plus the assembly dependency graph.

## Data

The site reads its data at runtime from `public/data/` (78 MB). It was generated once from the Il2CppDumper output (`dump.cs` and the `DummyDll` folder); those inputs and the generator scripts are not part of this repository.

`public/data/deps.json` (assembly references, read from the dummy DLLs) is optional; without it the dependency sections are hidden.

## Commands

    bun install          # install dependencies
    bun run dev          # dev server: http://localhost:5173
    bun run build        # type-check, then build into dist/

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`).

## Credit
[InsideExploit/rob-run-sdk](https://github.com/InsideExploit/rob-run-sdk)
