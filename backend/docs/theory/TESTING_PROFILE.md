# Testing Profile Management API

## Quick Start

### Automated Testing

1. **Start the server:**
```bash
cd backend
node src/app.js
```

2. **Run test script (in another terminal):**
```bash
cd backend
node test-profile.js
```

### Expected Output

```
👤 Testing Profile Management API
============================================================

1. Registering test user...
   ✓ User registered successfully

2. Testing Get Profile (GET /api/users/me)...
   ✓ Get profile successful
   ✓ Profile found: Profile Test User

3. Testing Update Profile - Basic Fields...
   ✓ Profile updated successfully
   ✓ Display Name: Updated Name
   ✓ Bio: This is my updated bio...
   ✓ Radius: 30 miles

4. Testing Update Profile - Skills...
   ✓ Skills updated successfully
   ✓ Skills count: 3

5. Testing Update Profile - Location...
   ✓ Location updated successfully
   ✓ Coordinates: [-122.4194, 37.7749]
   ✓ City: San Francisco

... (more tests)

📊 Results: 11 passed, 0 failed
✅ All profile tests passed!
```

---

## Manual Testing with cURL

### Step 1: Register and Get Token

```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "displayName": "Test User"
  }' | python3 -m json.tool

# Save the accessToken from response
export ACCESS_TOKEN="YOUR_TOKEN_HERE"
tokens": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODI5OTgzYzU5MDNmZDA5Y2IwMjU0OCIsImVtYWlsIjoiZHVtbXlAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIl0sInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzAxNjY2NjAsImV4cCI6MTc3MDE2NzU2MCwiYXVkIjoic2tpbGxleGNoYW5nZS1jbGllbnQiLCJpc3MiOiJza2lsbGV4Y2hhbmdlLWFwaSJ9.-HY9DyPvJmHk_E3RTObbjc4R5L02SoNRG1l99MNlVno",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ODI5OTgzYzU5MDNmZDA5Y2IwMjU0OCIsImVtYWlsIjoiZHVtbXlAZXhhbXBsZS5jb20iLCJ0eXBlIjoicmVmcmVzaCIsInRva2VuVmVyc2lvbiI6MSwiaWF0IjoxNzcwMTY2NjYwLCJleHAiOjE3NzA3NzE0NjAsImF1ZCI6InNraWxsZXhjaGFuZ2UtY2xpZW50IiwiaXNzIjoic2tpbGxleGNoYW5nZS1hcGkifQ.nuILg1uYnTeG7MfHf9uO-34tAGaVrwk4iXwiwAkJeHM"
        }
    },
```

### Step 2: Get Profile

```bash
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "...",
      "displayName": "Test User",
      "bio": null,
      "skills": [],
      "location": {
        "coordinates": [0, 0],
        "address": {}
      },
      "radius": 25,
      "avatarUrl": null,
      ...
    }
  }
}
```

### Step 3: Update Basic Profile

```bash
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated Name",
    "bio": "I love coding and helping others!",
    "radius": 30
  }' | python3 -m json.tool
```

### Step 4: Update Skills

```bash
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [
      {
        "name": "JavaScript",
        "level": "advanced",
        "category": "Programming"
      },
      {
        "name": "React",
        "level": "intermediate",
        "category": "Frontend"
      }
    ]
  }' | python3 -m json.tool
```

### Step 5: Update Location

```bash
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "coordinates": [-122.4194, 37.7749],
      "address": {
        "city": "San Francisco",
        "state": "CA",
        "country": "USA"
      }
    }
  }' | python3 -m json.tool
```

### Step 6: Update Preferences

```bash
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "notifications": {
        "email": true,
        "newMessages": true,
        "newMatches": false
      },
      "privacy": {
        "showLocation": true,
        "showEmail": false
      }
    }
  }' | python3 -m json.tool
```

### Step 7: Update Availability

```bash
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availability": {
      "monday": [{"start": "09:00", "end": "17:00"}],
      "wednesday": [{"start": "09:00", "end": "17:00"}],
      "friday": [{"start": "10:00", "end": "15:00"}]
    }
  }' | python3 -m json.tool
```

---

## Test Cases Covered

### ✅ Success Cases
1. Get profile (with existing profile)
2. Get profile (no profile yet)
3. Update basic fields (displayName, bio, radius)
4. Update skills array
5. Update location with coordinates and address
6. Update preferences (notifications, privacy)
7. Update availability schedule
8. Partial updates (only some fields)

### ✅ Validation Tests
1. Invalid coordinates (longitude > 180 or < -180)
2. Invalid coordinates (latitude > 90 or < -90)
3. Empty update body
4. Invalid skill level
5. Invalid time format
6. Radius out of range

### ✅ Security Tests
1. Unauthenticated request (should return 401)
2. Invalid token (should return 401)
3. Expired token (should return 401)

---

## API Endpoints

### GET /api/users/me
Get current user's profile

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "...",
      "displayName": "...",
      "bio": "...",
      "skills": [...],
      "location": {...},
      "radius": 25,
      "avatarUrl": "...",
      "reputation": 0,
      "rating": {...},
      "availability": {...},
      "preferences": {...},
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### PUT /api/users/me
Update current user's profile

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body (all fields optional, but at least one required):**
```json
{
  "displayName": "string (2-50 chars)",
  "bio": "string (max 500 chars)",
  "skills": [
    {
      "name": "string",
      "level": "beginner|intermediate|advanced|expert",
      "category": "string"
    }
  ],
  "location": {
    "coordinates": [longitude, latitude],
    "address": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string"
    }
  },
  "radius": "number (1-100)",
  "avatarUrl": "string (URL)",
  "availability": {
    "monday": [{"start": "HH:MM", "end": "HH:MM"}],
    ...
  },
  "preferences": {
    "notifications": {
      "email": "boolean",
      "push": "boolean",
      "newMessages": "boolean",
      "newMatches": "boolean"
    },
    "privacy": {
      "showLocation": "boolean",
      "showEmail": "boolean"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {...}
  },
  "message": "Profile updated successfully"
}
```

---

## Common Issues

### Issue: 401 Unauthorized
**Solution:** Make sure you're sending a valid access token in the Authorization header.

### Issue: 400 Validation Error
**Solution:** Check the error details in the response. Common issues:
- Invalid coordinates (must be between -180 to 180 for longitude, -90 to 90 for latitude)
- Empty update body (at least one field required)
- Invalid skill level (must be: beginner, intermediate, advanced, expert)
- Invalid time format (must be HH:MM format like "09:00")

### Issue: Profile Not Found
**Solution:** This is normal if you just registered. Update your profile once and it will be created.

---

## Next Steps

After testing profile endpoints:
1. ✅ Profile management working
2. ⏭️ Implement listings CRUD
3. ⏭️ Implement messaging system
4. ⏭️ Add file uploads (S3)

---

**Happy Testing! 🚀**