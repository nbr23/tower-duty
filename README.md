# Tower Duty

A browser-based air traffic control game. Draw flight paths, guide aircraft to land,
and keep the skies safe. Built with TypeScript, Vite, and Canvas 2D, with offline
support as an installable progressive web app.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

## Checks

```sh
npm run typecheck
npm test
```

## Production build

```sh
npm run build
```

Serve the generated `dist/` directory with a static web server. Use
`npm run preview` to preview the production build locally. Serve production over
HTTPS for service worker and installation support.

Set `SITE_URL` to the public HTTP(S) origin at build time to generate canonical
and absolute social image URLs. It must contain no path, query, fragment, or
credentials.

## Docker

```sh
docker compose up --build -d
```

The app is served on port 8080 by default. Set `PORT` to change the exposed port
and `SITE_URL` to configure the public origin used during the build. The image
builds the app with Node.js and serves it with nginx.

## Assets

Run `npm run icons` to regenerate the favicons, PWA icons, and social card in
`public/`.
