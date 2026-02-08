# SkillMatch Database - Quick Reference Diagram

## Database: `skillmatch-1`

```
┌─────────────────────────────────────────────────────────────────┐
│                         skillmatch-1                              │
│                      (MongoDB Atlas)                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     users        │  (6 documents)
│                  │
│ • _id            │
│ • email (unique) │
│ • password       │
│ • tokenVersion   │
└────────┬─────────┘
         │
         │ 1:1
         │
         ▼
┌──────────────────┐
│    profiles      │  (6 documents)
│                  │
│ • _id            │
│ • userId (FK)    │
│ • skills[]       │
│ • location       │
└──────────────────┘

┌──────────────────┐
│     users        │
│                  │
│ • _id            │
└────────┬─────────┘
         │
         │ 1:N (owner)
         │
         ▼
┌──────────────────┐
│    listings      │  (8 documents)
│                  │
│ • _id            │
│ • ownerId (FK)   │
│ • type           │
│ • title          │
│ • location       │
│ • skills[]       │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐
│     threads      │  (N documents)
│                  │
│ • _id            │
│ • listingId (FK) │
│ • participants[] │
│ • messageCount   │
│ • unreadCount    │
└────────┬─────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────┐
│    messages      │  (N documents)
│                  │
│ • _id            │
│ • threadId (FK)  │
│ • senderId (FK)  │
│ • recipientId    │
│ • content        │
│ • isRead         │
└──────────────────┘
```

## Relationships

```
users (1) ──────────────── (1) profiles
  │
  │ (owner)
  │
  ▼
listings (1) ───────────── (N) threads
  │                           │
  │                           │ (participants)
  │                           │
  │                           ▼
  │                        users (N)
  │                           │
  │                           │ (sender/recipient)
  │                           │
  │                           ▼
  │                        messages (N)
  │                           │
  │                           │ (threadId)
  │                           │
  └───────────────────────────┘
```

## Key Fields & Indexes

### users
- **Primary Key**: `_id`
- **Unique**: `email`
- **Indexes**: `email` (unique)

### profiles
- **Primary Key**: `_id`
- **Foreign Key**: `userId` → `users._id` (unique)
- **Indexes**: `userId` (unique), `location.coordinates` (2dsphere)

### listings
- **Primary Key**: `_id`
- **Foreign Key**: `ownerId` → `users._id`
- **Indexes**: 
  - `ownerId`
  - `location.coordinates` (2dsphere - for geospatial search)
  - `type`, `status`
  - `expiresAt` (TTL - auto-delete expired)
  - Compound: `{type, status, location.coordinates, createdAt}`

### threads
- **Primary Key**: `_id`
- **Foreign Keys**: 
  - `listingId` → `listings._id` (optional)
  - `participants[].userId` → `users._id`
- **Indexes**: 
  - `participants.userId`
  - `listingId`
  - Compound: `{participants.userId, status, updatedAt}`

### messages
- **Primary Key**: `_id`
- **Foreign Keys**: 
  - `threadId` → `threads._id`
  - `senderId` → `users._id`
  - `recipientId` → `users._id`
- **Indexes**: 
  - `threadId`
  - `senderId`, `recipientId`
  - Compound: `{threadId, createdAt}` (for pagination)

## Data Flow Example

```
1. User Registration
   → users collection (new document)

2. Create Profile
   → profiles collection (userId references users._id)

3. Create Listing
   → listings collection (ownerId references users._id)

4. User Views Listing & Creates Thread
   → threads collection
     - listingId references listings._id
     - participants[].userId references users._id

5. Send Message
   → messages collection
     - threadId references threads._id
     - senderId references users._id
     - recipientId references users._id
   → threads collection (updates messageCount, lastMessage, unreadCount)
```

## Collection Sizes (Expected)

| Collection | Documents | Relationships |
|------------|-----------|---------------|
| users      | 6         | → profiles (1:1)<br>→ listings (1:N)<br>→ threads (N:M)<br>→ messages (N:M) |
| profiles   | 6         | → users (N:1) |
| listings   | 8         | → users (N:1)<br>→ threads (1:N) |
| threads    | N         | → users (N:M)<br>→ listings (N:1)<br>→ messages (1:N) |
| messages   | N         | → threads (N:1)<br>→ users (N:1) |

## Quick MongoDB Shell Commands

```javascript
// Switch to database
use skillmatch-1

// Count documents
db.users.countDocuments()
db.listings.countDocuments()
db.threads.countDocuments()
db.messages.countDocuments()

// View collections
show collections

// Find all users
db.users.find().pretty()

// Find listings with owner
db.listings.find().populate('ownerId')

// Find threads with participants
db.threads.find().populate('participants.userId')

// Find messages in a thread
db.messages.find({ threadId: ObjectId("...") })
```
