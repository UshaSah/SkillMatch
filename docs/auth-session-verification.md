# Auth session verification (Step 6)

Validates bootstrap, classified errors, retry banner, and interceptor ↔ `AuthProvider` alignment.

**Prerequisites**

- MongoDB up
- Backend: `cd backend && npm run dev` (or `node src/app.js`) on `:3001`
- Frontend: `cd frontend && npm run dev` on `:3000`
- Test user: `dev@example.com` / `Test123!` (or register a new one)

**API smoke (no browser)** — with server running:

```bash
cd backend && node tests/test-auth.js
node tests/test-auth-session-restore.js
```

---

## Checklist

| # | Scenario | Steps | Expected | Pass |
|---|----------|--------|----------|------|
| 1 | **Happy path** | Login → open `/dashboard` → hard refresh (Cmd+Shift+R) | Still on dashboard; Network: `GET /api/auth/me` → 200; nav shows email | ☐ |
| 2 | **Expired access** | Stop backend. In `backend/.env` set `JWT_ACCESS_TTL=1m`, restart backend. Login, wait **2+ min**, hard refresh | Still logged in; Network: 401 on `/auth/me` → `POST /auth/refresh` → retry `/auth/me` → 200 | ☐ |
| 3 | **Dead session** | Login → Logout → hard refresh (or open `/dashboard`) | `localStorage` has no `accessToken`/`refreshToken`; redirected to `/login`; `POST /auth/refresh` with old refresh → 401 | ☐ |
| 4 | **Transient (offline)** | Login → stop backend → hard refresh | Amber **Retry** banner; tokens **still** in Application → Local Storage; start backend → **Retry** → logged in without re-entering password | ☐ |
| 5 | **Refresh-only bootstrap** | Login → DevTools → Application → Local Storage → delete **`accessToken` only** → hard refresh | Session restores; Network: `/auth/me` 401 → `/auth/refresh` → retry `/auth/me` 200 | ☐ |
| 6 | **Session expired event** | Login → DevTools → delete **`refreshToken`** only → click Browse Listings | Tokens cleared; client navigates to `/login` (no full white-screen reload); React state empty | ☐ |

---

## Detailed notes

### 1 — Happy path

Confirms: tokens saved on login, mount calls `getMe`, `AuthSession` in context.

### 2 — Expired access

Revert `JWT_ACCESS_TTL` to `15m` (or remove from `.env`) after testing.

### 4 — Transient

Protected pages must **not** send you to login while `sessionError` is set (banner visible). If you land on `/login` with tokens still present, retry from banner on a protected route or fix redirect guards.

### 6 — Interceptor + Step 5

Simulates refresh missing while access still present: next API call 401 → no refresh → `notifySessionExpired` → `/login`.

---

## Optional: curl revoked refresh (supports checklist #3)

```bash
cd backend
source .dev-tokens.sh   # after login flow in curl-auth-tokens.md

curl -s -X POST http://localhost:3001/api/auth/logout -H "$AUTH" | jq

curl -s -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}" | jq
# expect success: false, 401, TOKEN_REVOKED or similar
```

---

## Sign-off

- [ ] All six rows checked  
- [ ] `cd frontend && npm run build` passes  
- [ ] `cd backend && npm test` passes  

Date: __________  Branch: __________
