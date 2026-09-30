# Curl auth: save, load, and refresh tokens

Run all commands from the **`backend/`** directory unless noted.

Token file: **`backend/.dev-tokens.sh`** (gitignored — never commit it).

Default API: `http://localhost:3001`

---

## 1. First login — save access + refresh

Replace email/password if yours differ.

```bash
cd backend

RESP=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"Test123!"}')

echo "$RESP" | jq -e '.success' >/dev/null || { echo "$RESP" | jq; exit 1; }

cat > .dev-tokens.sh <<EOF
export ACCESS='$(echo "$RESP" | jq -r '.data.tokens.accessToken')'
export REFRESH='$(echo "$RESP" | jq -r '.data.tokens.refreshToken')'
export AUTH="Authorization: Bearer \$ACCESS"
EOF

chmod 600 .dev-tokens.sh
source .dev-tokens.sh

echo "ACCESS length: ${#ACCESS}"
echo "REFRESH length: ${#REFRESH}"
```

Success: both lengths are large numbers (JWT strings), not `0`.

---

## 2. New terminal — load saved tokens

```bash
cd backend
source .dev-tokens.sh
```

Use **`$AUTH`** on protected routes:

```bash
curl -s http://localhost:3001/api/auth/me -H "$AUTH" | jq
curl -s http://localhost:3001/api/users/me -H "$AUTH" | jq
curl -s http://localhost:3001/api/listings/me -H "$AUTH" | jq
```

---

## 3. Access token expired (`TOKEN_EXPIRED`)

Access tokens default to **~15 minutes** (`JWT_ACCESS_TTL`). Refresh with the saved refresh token (~7 days).

```bash
cd backend
source .dev-tokens.sh

RESP=$(curl -s -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}")

echo "$RESP" | jq -e '.success' >/dev/null || { echo "$RESP" | jq; exit 1; }

cat > .dev-tokens.sh <<EOF
export ACCESS='$(echo "$RESP" | jq -r '.data.tokens.accessToken')'
export REFRESH='$(echo "$RESP" | jq -r '.data.tokens.refreshToken')'
export AUTH="Authorization: Bearer \$ACCESS"
EOF

chmod 600 .dev-tokens.sh
source .dev-tokens.sh

curl -s http://localhost:3001/api/listings/me -H "$AUTH" | jq
```

**Important:** After refresh, always update **both** `ACCESS` and `REFRESH` in `.dev-tokens.sh` (the API may rotate the refresh token).

---

## 4. Refresh failed — log in again

Use when `REFRESH` is empty, refresh returns `TOKEN_EXPIRED` / `INVALID_TOKEN`, or you hit auth rate limits and must wait.

Same as section 1 (login + rewrite `.dev-tokens.sh`).

---

## 5. Register instead of login (new user)

```bash
cd backend

RESP=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Test123!","displayName":"Your Name"}')

echo "$RESP" | jq -e '.success' >/dev/null || { echo "$RESP" | jq; exit 1; }

cat > .dev-tokens.sh <<EOF
export ACCESS='$(echo "$RESP" | jq -r '.data.tokens.accessToken')'
export REFRESH='$(echo "$RESP" | jq -r '.data.tokens.refreshToken')'
export AUTH="Authorization: Bearer \$ACCESS"
EOF

chmod 600 .dev-tokens.sh
source .dev-tokens.sh
```

---

## 6. Longer access TTL for local testing (optional)

In `backend/.env`:

```env
JWT_ACCESS_TTL=24h
```

Restart the backend, then run **section 1** again (old JWTs keep their old expiry).

---

## Troubleshooting

| Symptom | Cause | Fix |
|--------|--------|-----|
| `REFRESH` / `ACCESS` empty after export | `RESP` never set | Use `RESP=$(curl -s ...)` **without** `\| jq` on the curl line |
| `Authentication required` | Wrong header | `AUTH="Authorization: Bearer $ACCESS"`, then `-H "$AUTH"` |
| Used refresh token in `Authorization` | Wrong token type | Body: refresh on `/api/auth/refresh`; header: access only |
| `cat > backend/.dev-tokens.sh` fails | Already in `backend/` | Use `cat > .dev-tokens.sh` |
| Too many auth attempts | Rate limit on login/register | Wait 15 minutes or use refresh (section 3) |

---

## Token lifetimes (defaults)

| Token | Env var | Default |
|-------|---------|---------|
| Access | `JWT_ACCESS_TTL` | `15m` |
| Refresh | `JWT_REFRESH_TTL` | `7d` |

Defined in `src/utils/jwt.js`.
