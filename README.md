# FIT Stats

[![Deploy](https://github.com/iGroza/fit-stats/actions/workflows/deploy.yml/badge.svg)](https://github.com/iGroza/fit-stats/actions/workflows/deploy.yml)

View and analyze `.fit/.gpx` files right in the browser: bulk-load tracks, see all
routes on a map, a combined summary, plus metrics and charts for every parameter.
Files never leave your device — everything is computed locally.

🔗 **Live site:** https://fit.igroza.su

## Stack

- React 18 + TypeScript
- Vite 5
- Leaflet (maps), Recharts (charts), anime.js (animations)
- `fit-file-parser` for parsing `.fit`, `exceljs` for export

## Local development

```bash
yarn install
yarn dev        # start the dev server
yarn build      # production build into dist/
yarn preview    # preview the built bundle
yarn typecheck  # type checking
```
