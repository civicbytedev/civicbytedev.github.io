# CLAUDE.md

Static GitHub Pages site for civicbyte.dev — plain HTML/CSS/JS, no build step.
The `main` branch is production: GitHub Pages deploys it directly.

## Workflow

- After changes are verified (screenshot the affected page with headless
  Chromium), merge the PR into `main` right away — the owner wants every
  change deployed to prod immediately, not left waiting for review.
- Squash-merge to keep main's history to one commit per change.
