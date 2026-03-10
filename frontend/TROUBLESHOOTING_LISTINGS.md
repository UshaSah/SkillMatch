# Troubleshooting Listings Page Not Loading

## Common Issues and Solutions

### 1. Backend Not Running
**Symptom**: Page shows "Loading..." indefinitely or network error

**Solution**:
```bash
cd backend
npm run dev
# Or
npm start
```

Verify backend is running:
```bash
curl http://localhost:3001/api/health
```

### 2. API URL Not Configured
**Symptom**: Requests going to wrong URL

**Check**: Create `.env.local` in `frontend/` directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For production:
```bash
NEXT_PUBLIC_API_URL=https://your-alb-url.com
```

### 3. CORS Issues
**Symptom**: Network error in browser console, CORS error message

**Solution**: Check backend `CORS_ALLOWED_ORIGINS` in `.env`:
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4. Type Mismatch (Fixed)
**Symptom**: Page loads but crashes when displaying listings

**Status**: ✅ Fixed - Updated `Listing` type to match backend structure

### 5. Check Browser Console
Open browser DevTools (F12) and check:
- **Console tab**: Look for errors
- **Network tab**: Check if `/api/listings` request is being made and what the response is

### 6. Verify Backend Response Format
The backend should return:
```json
{
  "success": true,
  "data": {
    "listings": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0
    }
  }
}
```

### 7. Test API Directly
```bash
# Test without auth (public endpoint)
curl http://localhost:3001/api/listings

# Test with auth
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/listings
```

### 8. Check MongoDB Connection
If backend is running but returning empty results:
```bash
cd backend
npm run check:db
```

### 9. Verify Listings Exist in Database
```bash
cd backend
node -e "require('./src/config/database'); const Listing = require('./src/models/Listing'); Listing.find().then(listings => console.log('Found', listings.length, 'listings'))"
```

## Quick Debug Steps

1. **Check if backend is running**: `curl http://localhost:3001/api/health`
2. **Check browser console** for errors
3. **Check network tab** for failed requests
4. **Verify API URL** in frontend `.env.local`
5. **Check CORS settings** in backend `.env`
6. **Verify listings exist** in database

## Expected Behavior

- Page should show "Loading..." initially
- Then either:
  - Display listings in a grid
  - Show "No listings found" message
  - Show error message with "Try Again" button

If it's stuck on "Loading...", the API call is likely failing silently.
