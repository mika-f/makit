# CLI reference

Run Makit commands from the project root as `pnpm exec makit <command>`.

| Command                  | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `makit init`             | Scaffold a new project                  |
| `makit dev`              | Start a development server              |
| `makit build`            | Build a static site                     |
| `makit preview`          | Serve an already built site locally     |
| `makit check`            | Validate configuration and content      |
| `makit clean`            | Remove generated data such as `.makit/` |
| `makit adapter generate` | Generate adapter files individually     |

## Common options

```bash
# Remove the output directory before building
pnpm exec makit build --clean

# Treat warnings as errors
pnpm exec makit build --strict

# Use another configuration file
pnpm exec makit build --config ./makit.config.ts
```

In CI, run `check` and `build --strict` to find broken links and structural issues before publishing.
