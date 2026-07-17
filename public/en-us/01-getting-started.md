# Getting started

This guide walks through creating a Makit site, viewing it locally, and generating static files.

## 1. Install Makit

Add Makit as a development dependency in a project using Node.js 20 or later.

```bash
pnpm add -D @natsuneko-laboratory/makit
```

You can add the package with npm or Yarn as usual, too.

## 2. Create a project

Run `init` in an empty directory.

```bash
pnpm exec makit init
```

It creates a structure like this:

```text
my-docs/
├── docs/
│   └── index.md
├── public/
├── makit.config.ts
└── package.json
```

`docs/index.md` is the site's home page. Start by replacing its heading and text with content for your project.

## 3. Start the development server

```bash
pnpm exec makit dev
```

Open the displayed URL in a browser. Saving a Markdown file automatically refreshes the page.

## 4. Generate a static site

```bash
pnpm exec makit build
```

By default, HTML, CSS, JavaScript, images, and other assets are written to `dist/`. Deploy that directory to a static hosting service.

## Troubleshooting

Run `check` before building to catch configuration and content issues.

```bash
pnpm exec makit check
```

It finds broken links, duplicate URLs, metadata inconsistencies, and similar problems early.
