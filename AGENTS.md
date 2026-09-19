# TeslaDash — convenciones para el agente

Dashboard estático para el navegador del Tesla. Fork personal de [crstian19/tesdash](https://github.com/crstian19/tesdash).
Carpeta local: `C:\Users\maest\tesladash`. Repo: `maestrea76/tesladash`.
GitHub Pages: https://maestrea76.github.io/tesladash/

**No trabajar en `C:\Users\maest\tesdash`.** Es un clone viejo (atrás de `main`, cambios locales). Este árbol es la fuente de verdad.

## Stack (no cambiar sin pedirlo)

- Astro 6 (SSG) + islas Svelte 5 **con runes** (`$state`, `$effect`).
- Tailwind CSS v4 + DaisyUI 5. Runtime: **Bun** (`bun install` / `bun dev` / `bun run build`).
- Config YAML en build (`js-yaml`). Color dominante de logos con `sharp`.
- TypeScript. Sin npm salvo que Bun no baste.

## Páginas y config

| Ruta | Fuente | Notas |
| --- | --- | --- |
| `/` | `src/pages/index.astro` + `src/data/config.yml` | Dashboard público. Apps en nueva pestaña. |
| `/me` | `src/pages/me.astro` + `src/data/config.me.yml` | Resto del fork. No usarlo para apps privadas. |
| `/legal` | `src/pages/legal.astro` | Aviso legal (upstream). |

- Apps **privadas** (HA local, etc.): perfil cifrado, no `config.yml`.
- YAML en claro: `src/data/private-apps.yml` (gitignored). Plantilla: `private-apps.example.yml`.
- Generar blob: `bun run user:profile -- --user <nombre> --apps src/data/private-apps.yml` (contraseña por `TESLADASH_PROFILE_PASSWORD` o prompt).
- El `.enc` en `public/users/` **sí** va a git. Nunca la contraseña ni el YAML en claro.
- Cifrado: Argon2id (32 MiB, 3 pases) + AES-256-GCM. AAD liga el ciphertext al usuario.
- En el dash: botón **Perfil**. Sin login no se ven esas apps. La sesión (no la contraseña) vive en `localStorage` hasta que se cierre a propósito.
- `/me` y `config.me.yml` no son el mecanismo de privacidad.
- Añadir/quitar apps públicas: editar `config.yml`. Logos en `public/logos/` (`/logos/…`) o URL remota.
- `color` opcional (si falta, se extrae del logo). `regions` oculta la app fuera de esos países.

## Build y deploy

- Dev: `bun dev`. Build estático → `/dist`. Preview: `bun run preview`.
- Docker: `docker build -t tesladash .` (Bun build + nginx). Pensado para Proxmox LXC + Docker.
- GitHub Pages: push a `main` dispara `.github/workflows/deploy.yml` (`site` + `base: '/tesladash'`). No quitar `base` o se rompen los assets.
- Docker/GHCR: tag `vX.Y.Z` dispara `.github/workflows/docker.yml` → `ghcr.io/maestrea76/tesladash`.
- `package.json` `name` sigue siendo `tesdash`.
- URLs privadas van en el perfil cifrado (`private-apps.yml` → `public/users/*.enc`), no en `config.yml`.

## Estilo de código

- UI minimalista estilo Tesla; tema claro/oscuro con `prefers-color-scheme`. Táctil (pantalla del coche).
- Zoom por defecto 80% (`tesdash-zoom`). Menú de tarjeta: long-press 600 ms.
- Búsquedas Google Maps (`/maps/search/`) se centran en GPS al pulsar; si falla, URL plana.
- `localStorage` (prefijo `tesdash-`): `lang`, `region`, `zoom`, `category-order`, `cat-visibility`, `custom-apps`, `hidden-static`.
- Comentarios cortos y factuales, en español, solo para invariantes no obvios (perfil cifrado, Tesla browser).
- Commits en español, rama `main`. No incluir `config.me.yml`, `private-apps.yml`, `dist/`, `node_modules/`, `.claude/`.
