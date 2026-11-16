# ScanHop

ScanHop is a browser extension that shows a QR code for the page you are looking at. Scan it with your phone's camera and the same page opens on your phone. If the page is a YouTube video, the scan opens the video in the YouTube app.

No account, no server: the QR code is generated inside your browser and the page address never leaves your computer.

> **Status:** early development. The project builds and loads, but the QR popup is not implemented yet. This README grows with the code.

## Requirements

- [Node.js](https://nodejs.org) 22 or newer (the repo pins Node 24 in `.nvmrc`; run `nvm use` if you use nvm)
- npm (ships with Node)
- Chrome, Edge or Firefox

## Getting started

```bash
git clone git@github.com:shashikant-k/scanhop.git
cd scanhop
npm install
npm run dev
```

`npm run dev` builds the extension, opens a fresh Chrome window with it already installed, and reloads it whenever you save a file. For Firefox, use `npm run dev:firefox`.

### Loading a build by hand

1. Run `npm run build` (Chrome and Edge) or `npm run build:firefox`.
2. **Chrome / Edge:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose `.output/chrome-mv3`.
3. **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and choose `.output/firefox-mv3/manifest.json`.

## Scripts

| Command                 | What it does                                         |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Run the extension in Chrome with live reload         |
| `npm run dev:firefox`   | Same, in Firefox                                     |
| `npm run build`         | Production build for Chrome and Edge                 |
| `npm run build:firefox` | Production build for Firefox                         |
| `npm run zip`           | Build and package a store-ready zip                  |
| `npm run typecheck`     | Check types with TypeScript                          |
| `npm run lint`          | Check code with ESLint                               |
| `npm run format`        | Format all files with Prettier                       |
| `npm run format:check`  | Fail if any file is not formatted (used by CI later) |

## Tech stack

- [WXT](https://wxt.dev) — extension framework; one codebase builds for Chrome, Edge and Firefox (Manifest V3)
- [React](https://react.dev) + TypeScript — popup UI
- ESLint + Prettier — code quality and formatting
