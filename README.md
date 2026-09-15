# GoRepYo Rep

Native mobile app for **device representatives** on [GoRepYo](https://gorepyo.com). Providers and company admins stay on the website.

## What it includes

- Rep-only sign-in
- Availability and on-call
- Assignment dashboard with live polling
- Open / accept / decline / forward / en route / arrived / complete
- Calendar, teams, and territory
- Notifications

## Run it

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator or scan the QR code with Expo Go.

The app talks to `https://gorepyo.com` by default. On the login screen, use **Advanced: change server** to point at a local GoRepYo instance (for a physical phone, use your computer’s LAN URL, not `localhost`).

The website needs the mobile auth routes from the `Repyo` repo (`/api/mobile/auth/login` and `/api/mobile/auth/me`). Deploy those before using production.

## Demo

Use a **rep** account such as `rep@demo.com` / `demo123` against a seeded local server.
