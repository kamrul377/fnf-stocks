# ISP Inventory (Next.js + Firebase)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Firebase web config.
3. In Firebase console: enable Authentication (Email/Password) and create a Firestore database.
4. Deploy rules: `npx firebase-tools deploy --only firestore:rules`
5. `npm run dev`, open `/setup` once to create the first admin, then use `/login`.
6. Create `settings/role_permissions` in Firestore (a map: role -> permission -> boolean) so non-admin roles get access.

Ready: login, setup, dashboard, services, rules.
Pending pages: items, purchases, withdraw, devices, rma, ledger, requisitions, users, settings/permissions.
