# MahaSetu project notes

- This is a Vite + React + TypeScript frontend with a local Express demo auth API. Follow the existing app structure and MahaSetu visual conventions.
- The OTP inbox, users, sessions, IDs, citizen records, integrations, and audit events are local demo behavior. Never present them as production SMS, persistence, authentication assurance, or government connections.
- Do not expose the admin invitation value in frontend code. Admin registration is invitation-gated by a server environment variable.
- Keep the single mobile OTP login, automatic role routing, citizen consent-required application flow, application status, activity, and audit entries synchronized.
- Validate changes with `npm run build` and `node --check server/auth.js` when changing the API.
