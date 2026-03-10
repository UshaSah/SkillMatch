# Database Seeding Guide

## Overview

The seeding script populates your database with sample data for testing and development.

## Quick Start

### Basic Seeding (Adds data without clearing)

```bash
cd backend
node src/scripts/seedDatabase.js
```

### Clear and Seed (Removes all existing data first)

```bash
cd backend
node src/scripts/seedDatabase.js --clear
```

## What Gets Created

### Users (5 users)
1. **john@example.com** - Full-stack developer (San Francisco)
2. **sarah@example.com** - UI/UX designer (New York)
3. **mike@example.com** - DevOps engineer (Chicago)
4. **emily@example.com** - Data scientist (Seattle)
5. **david@example.com** - Mobile developer (Los Angeles)

**All passwords:** `password123`

### Profiles
- Each user gets a complete profile with:
  - Display name and bio
  - Skills (3-4 skills per user)
  - Location (coordinates + address)
  - Preferences
  - Radius settings

### Listings (5 listings)
- Mix of offers and requests
- Different skill categories
- Various compensation types (free, paid, trade)
- Different locations

### Messages
- Sample conversation thread
- 3 messages between users
- Demonstrates read/unread status

## Test Credentials

After seeding, you can login with:

```
Email: john@example.com
Password: password123

Email: sarah@example.com
Password: password123

Email: mike@example.com
Password: password123

Email: emily@example.com
Password: password123

Email: david@example.com
Password: password123
```

## Manual Data Addition

### Option 1: Through API (Recommended)

Use the API endpoints to add data:

```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "displayName": "New User"
  }'

# Update profile
curl -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "My bio",
    "skills": [...]
  }'
```

### Option 2: MongoDB Shell

```bash
# Connect to MongoDB
mongosh

# Use database
use skillexchange

# Insert user manually
db.users.insertOne({
  email: "test@example.com",
  password: "$2a$12$...", // Hashed password
  emailVerified: true,
  roles: ["user"]
})
```

### Option 3: Modify Seed Script

Edit `src/scripts/seedDatabase.js` to add your own data:

```javascript
const users = [
  {
    email: 'your@email.com',
    password: await hashPassword('yourpassword'),
    displayName: 'Your Name',
    // ... add more fields
  }
];
```

## Customizing Seed Data

### Add More Users

Edit the `users` array in `seedUsers()` function:

```javascript
const users = [
  // ... existing users
  {
    email: 'newuser@example.com',
    password: await hashPassword('password123'),
    displayName: 'New User',
    bio: 'Bio here',
    skills: [...],
    location: {
      coordinates: [-122.4194, 37.7749],
      address: { city: 'San Francisco', state: 'CA' }
    }
  }
];
```

### Add More Listings

Edit the `listings` array in `seedListings()` function:

```javascript
const listings = [
  // ... existing listings
  {
    ownerEmail: 'john@example.com',
    type: 'offer',
    title: 'Your Listing Title',
    description: 'Description here',
    // ... more fields
  }
];
```

## Verifying Seeded Data

### Check Users

```bash
mongosh
use skillexchange
db.users.find().pretty()
```

### Check Profiles

```bash
db.profiles.find().pretty()
```

### Check Listings

```bash
db.listings.find().pretty()
```

### Check Messages

```bash
db.threads.find().pretty()
db.messages.find().pretty()
```

## Troubleshooting

### Issue: "User already exists"
**Solution:** The script skips existing users. Use `--clear` flag to remove all data first.

### Issue: "Database connection failed"
**Solution:** 
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env` file
- Verify connection string is correct

### Issue: "Cannot find module"
**Solution:** Make sure you're running from the `backend` directory:
```bash
cd backend
node src/scripts/seedDatabase.js
```

## Best Practices

1. **Use `--clear` flag carefully** - It deletes ALL data
2. **Backup before clearing** - Export data if needed
3. **Use seed script for development** - Not for production
4. **Customize seed data** - Add your own test scenarios
5. **Run after schema changes** - Re-seed when models change

## Integration with Tests

The seeded data can be used in your test scripts:

```javascript
// In test files
const testEmail = 'john@example.com';
const testPassword = 'password123';

// Login with seeded user
const response = await makeRequest('/api/auth/login', {
  method: 'POST',
  body: { email: testEmail, password: testPassword }
});
```

## Next Steps

After seeding:
1. ✅ Test authentication with seeded users
2. ✅ Test profile endpoints
3. ✅ Test listings (once implemented)
4. ✅ Test messaging (once implemented)

---

**Happy Seeding! 🌱**