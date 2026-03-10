# Quick Fix: Network Error on Listings Page

## Immediate Steps

### 1. Check if Backend is Running

```bash
# In backend directory
cd backend
npm run dev
```

You should see:
```
Server running on port 3001 in development mode
MongoDB Connected: ...
```

### 2. Test Backend Directly

Open a new terminal and test:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","uptime":...}
```

### 3. Check Frontend API URL

Create `frontend/.env.local`:
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

Then restart your Next.js dev server:
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4. Check CORS Settings

In `backend/.env`, make sure you have:
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Then restart the backend.

### 5. Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for error messages
4. Go to **Network** tab
5. Refresh the page
6. Look for the `/api/listings` request
7. Click on it to see the error details

## Common Issues

### Issue: "ECONNREFUSED" or "Network Error"
**Cause**: Backend not running or wrong port
**Fix**: Start backend with `cd backend && npm run dev`

### Issue: CORS Error
**Cause**: Backend CORS not configured for frontend origin
**Fix**: Add `http://localhost:3000` to `CORS_ALLOWED_ORIGINS` in backend `.env`

### Issue: 404 Not Found
**Cause**: Wrong API URL
**Fix**: Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

### Issue: 500 Internal Server Error
**Cause**: Backend error (check backend logs)
**Fix**: Check backend terminal for error messages

## Quick Test Script

Run this to test everything:

```bash
# Test 1: Backend health
echo "Testing backend..."
curl http://localhost:3001/api/health

# Test 2: Listings endpoint (public)
echo -e "\n\nTesting listings endpoint..."
curl http://localhost:3001/api/listings

# Test 3: Check if ports are in use
echo -e "\n\nChecking ports..."
lsof -ti:3001 && echo "Port 3001 is in use" || echo "Port 3001 is NOT in use"
lsof -ti:3000 && echo "Port 3000 is in use" || echo "Port 3000 is NOT in use"
```

## Still Not Working?

1. **Check backend logs** - Look at the terminal where backend is running
2. **Check frontend logs** - Browser console (F12)
3. **Verify MongoDB** - Backend needs MongoDB connection
4. **Check firewall** - Make sure nothing is blocking localhost connections
