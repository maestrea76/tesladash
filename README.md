<p align="center">
  <img src="public/logos/tesla.svg" alt="Tesla" width="120" />
</p>

<p align="center">
  Personal self-hosted dashboard for the Tesla in-car browser.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Astro-6-FF5D01?style=for-the-badge&logo=astro&logoColor=white" />
  <img src="https://img.shields.io/badge/Svelte-5-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

## About

A static dashboard customized for personal use in the Tesla browser, built on top of [crstian19/tesdash](https://github.com/crstian19/tesdash). Designed to run as a self-hosted container under Proxmox.

App links open directly in a new tab (no YouTube redirect). The UI follows a minimalist Tesla-style aesthetic with automatic day/night theming based on the browser's `prefers-color-scheme`.

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6 (SSG) |
| Interactive islands | Svelte 5 (Clock, URL Launcher) |
| Styling | Tailwind CSS 4 + DaisyUI 5 |
| Config | YAML parsed at build time with `js-yaml` |
| Logo color extraction | `sharp` |
| Runtime | Bun |

## Features

- **Tesla-style theme** — minimalist dark/light UI that auto-adapts to the browser's color scheme
- **Direct URL launching** — apps open straight in a new tab, no YouTube redirect
- **Per-app accent colors** — dominant color is extracted from each logo at build time
- **Spotlight effect** — radial gradient follows cursor/finger across each card
- **Category drag & drop** — reorder categories; order persists in `localStorage`
- **Add custom apps** — tap the `+` button to add any app at runtime
- **URL launcher** — type any URL and open it instantly
- **Language & region** — 13 interface languages; country filter hides regionally-unavailable apps
- **Live clock** — updates every second
- **Touch optimized** — works smoothly on the Tesla touchscreen
- **PWA ready** — web manifest and icons configured for home screen installation

## Getting started

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Build static output → /dist
bun run build

# Preview build
bun run preview
```

## Self-hosting

The build output in `/dist` is fully static — serve it with any static web server (nginx, Caddy, Apache).

A `Dockerfile` is included for container deployments (e.g. Proxmox LXC + Docker).

```bash
docker build -t tesladash .
docker run -p 8080:80 tesladash
```

Or with Docker Compose:

```yaml
services:
  tesladash:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

## Configuration

Edit `src/data/config.yml` to add, remove or reorganize apps. No code changes needed.

```yaml
categories:
  - name: Streaming
    apps:
      - name: Netflix
        url: https://www.netflix.com
        logo: /logos/netflix.svg   # local path or remote URL
        color: "#E50914"           # optional — auto-extracted from logo if omitted
        regions: ['ES', 'GB']      # optional — hide app outside these countries
        fullscreen: false          # optional — visual hint only (all URLs open in a new tab)
```

### Logo sources

- **Local:** place PNG/SVG/WebP files in `public/logos/` and reference them as `/logos/filename.png`
- **Remote:** any direct image URL (fetched at build time)
- **Auto color:** if `color` is omitted, the dominant color is extracted from the logo

## Project structure

```
tesladash/
├── public/
│   └── logos/          ← App logos (PNG, SVG, WebP)
├── src/
│   ├── components/
│   │   ├── Clock.svelte
│   │   └── UrlLauncher.svelte
│   ├── data/
│   │   └── config.yml  ← Edit this to configure your apps
│   └── pages/
│       └── index.astro
├── Dockerfile
├── astro.config.mjs
└── package.json
```

## Credits

Forked and customized from [crstian19/tesdash](https://github.com/crstian19/tesdash).
