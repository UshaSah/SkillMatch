# SkillMatch MongoDB Database Structure

## Database Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    skillmatch-1 Database                     │
│                  (MongoDB Atlas Cluster)                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   users      │    │  listings   │    │   threads    │
│  (6 docs)   │    │  (8 docs)   │    │  (N docs)   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  profiles    │    │   messages   │    │  (indexes)   │
│  (6 docs)   │    │  (N docs)    │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Collection: `users`

### Document Structure
```javascript
{
  _id: ObjectId("..."),                    // Primary key
  email: String,                           // Unique, indexed
  password: String,                        // Hashed with bcrypt
  isEmailVerified: Boolean,                // Default: false
  emailVerificationToken: String,          // Optional
  tokenVersion: Number,                    // For JWT invalidation
  accountLocked: Boolean,                  // Default: false
  lockUntil: Date,                         // Optional
  loginAttempts: Number,                   // Default: 0
  createdAt: Date,                         // Auto-generated
  updatedAt: Date                          // Auto-generated
}
```

### Indexes
- `email`: Unique index
- `emailVerificationToken`: Index (for verification lookups)

### Relationships
```
users (1) ──────< (1) profiles
users (1) ──────< (N) listings (ownerId)
users (N) ──────< (N) threads (participants.userId)
users (N) ──────< (N) messages (senderId, recipientId)
```

---

## Collection: `profiles`

### Document Structure
```javascript
{
  _id: ObjectId("..."),                    // Primary key
  userId: ObjectId("..."),                 // Reference to users._id
  displayName: String,                     // Optional
  bio: String,                              // Optional, max 500 chars
  skills: [                                 // Array of skill objects
    {
      name: String,                         // e.g., "JavaScript"
      level: String,                        // beginner|intermediate|advanced|expert
      category: String                      // e.g., "Programming"
    }
  ],
  location: {                              // GeoJSON Point
    type: "Point",
    coordinates: [Number, Number]          // [longitude, latitude]
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  preferences: {
    notifications: {
      email: Boolean,
      push: Boolean,
      inApp: Boolean
    },
    privacy: {
      showEmail: Boolean,
      showLocation: Boolean
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `userId`: Unique index (one profile per user)
- `location.coordinates`: 2dsphere index (geospatial queries)
- `skills.name`: Index (for skill searches)

### Relationships
```
profiles (N) ──────< (1) users (userId)
```

---

## Collection: `listings`

### Document Structure
```javascript
{
  _id: ObjectId("..."),                    // Primary key
  ownerId: ObjectId("..."),                // Reference to users._id
  type: String,                             // "offer" | "request"
  title: String,                            // Max 100 chars
  description: String,                      // Max 1000 chars
  skills: [                                 // Array of skill objects
    {
      name: String,
      level: String,                        // beginner|intermediate|advanced|expert
      category: String
    }
  ],
  location: {                              // GeoJSON Point
    type: "Point",
    coordinates: [Number, Number]          // [longitude, latitude]
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  compensation: {
    type: String,                           // free|paid|trade|negotiable
    amount: Number,                         // Optional
    currency: String,                       // Default: "USD"
    description: String                     // Optional
  },
  timeCommitment: String,                  // one-time|short-term|long-term|ongoing
  estimatedHours: {
    min: Number,
    max: Number
  },
  status: String,                           // active|inactive|completed|cancelled
  tags: [String],                           // Auto-generated from skills
  images: [
    {
      url: String,
      caption: String,
      order: Number
    }
  ],
  requirements: [String],
  benefits: [String],
  contactMethod: String,                    // message|email|phone
  isRemote: Boolean,                        // Default: false
  expiresAt: Date,                         // TTL index (auto-delete expired)
  viewCount: Number,                       // Default: 0
  interestCount: Number,                   // Default: 0
  isActive: Boolean,                        // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `ownerId`: Index
- `type`: Index
- `status`: Index
- `location.coordinates`: 2dsphere index (geospatial search)
- `skills.name`: Index
- `skills.category`: Index
- `tags`: Index
- `createdAt`: Descending index
- `expiresAt`: TTL index (auto-delete)
- Compound: `{type: 1, status: 1, location.coordinates: '2dsphere', createdAt: -1}`

### Relationships
```
listings (N) ──────< (1) users (ownerId)
listings (1) ──────< (N) threads (listingId)
```

---

## Collection: `threads`

### Document Structure
```javascript
{
  _id: ObjectId("..."),                    // Primary key
  participants: [                          // Array of participant objects
    {
      userId: ObjectId("..."),            // Reference to users._id
      joinedAt: Date,
      lastReadAt: Date,
      isActive: Boolean
    }
  ],
  listingId: ObjectId("..."),             // Optional, reference to listings._id
  subject: String,                         // Optional, max 200 chars
  messageCount: Number,                   // Default: 0
  unreadCount: Number,                     // Default: 0
  lastMessage: {                          // Cached last message info
    content: String,
    senderId: ObjectId("..."),
    sentAt: Date
  },
  status: String,                          // active|archived|deleted
  isActive: Boolean,                       // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `participants.userId`: Index (find user's threads)
- `listingId`: Index
- `status`: Index
- `createdAt`: Descending index
- Compound: `{participants.userId: 1, status: 1, updatedAt: -1}`

### Relationships
```
threads (N) ──────< (N) users (participants.userId)
threads (N) ──────< (1) listings (listingId, optional)
threads (1) ──────< (N) messages (threadId)
```

---

## Collection: `messages`

### Document Structure
```javascript
{
  _id: ObjectId("..."),                    // Primary key
  threadId: ObjectId("..."),               // Reference to threads._id
  senderId: ObjectId("..."),               // Reference to users._id
  recipientId: ObjectId("..."),           // Reference to users._id
  content: String,                         // Max 2000 chars
  type: String,                             // text|image|file|system
  attachments: [                           // Optional array
    {
      url: String,
      filename: String,
      mimetype: String,
      size: Number
    }
  ],
  replyTo: ObjectId("..."),               // Optional, reference to messages._id
  isRead: Boolean,                         // Default: false
  readAt: Date,                            // Optional
  isActive: Boolean,                       // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `threadId`: Index
- `senderId`: Index
- `recipientId`: Index
- `isRead`: Index
- `createdAt`: Ascending index (for pagination)
- Compound: `{threadId: 1, createdAt: 1}` (efficient thread message queries)

### Relationships
```
messages (N) ──────< (1) threads (threadId)
messages (N) ──────< (1) users (senderId)
messages (N) ──────< (1) users (recipientId)
messages (N) ──────< (1) messages (replyTo, optional)
```

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
│             │
│ _id (PK)    │
│ email       │
│ password    │
└──────┬──────┘
       │
       │ 1:1
       │
       ▼
┌─────────────┐
│  profiles   │
│             │
│ _id (PK)    │
│ userId (FK) │
│ skills[]    │
│ location    │
└─────────────┘

┌─────────────┐
│    users    │
│             │
│ _id (PK)    │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐
│  listings   │
│             │
│ _id (PK)    │
│ ownerId(FK) │
│ type        │
│ location    │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐
│   threads   │
│             │
│ _id (PK)    │
│ listingId   │
│ participants│
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────┐
│  messages   │
│             │
│ _id (PK)    │
│ threadId(FK)│
│ senderId(FK)│
│ recipientId │
└─────────────┘
```

---

## Data Flow Example: User Creates Listing → Gets Messages

```
1. User creates listing
   users._id ──> listings.ownerId

2. Another user views listing and creates thread
   listings._id ──> threads.listingId
   users._id ──> threads.participants[].userId

3. User sends message
   threads._id ──> messages.threadId
   users._id ──> messages.senderId
   users._id ──> messages.recipientId

4. Thread updates
   messages ──> threads.messageCount
   messages ──> threads.lastMessage
   messages ──> threads.unreadCount
```

---

## Index Summary

### Geospatial Indexes
- `profiles.location.coordinates`: 2dsphere
- `listings.location.coordinates`: 2dsphere

### Unique Indexes
- `users.email`: Unique
- `profiles.userId`: Unique (one profile per user)

### TTL Indexes
- `listings.expiresAt`: Auto-delete expired listings

### Compound Indexes
- `listings`: `{type: 1, status: 1, location.coordinates: '2dsphere', createdAt: -1}`
- `threads`: `{participants.userId: 1, status: 1, updatedAt: -1}`
- `messages`: `{threadId: 1, createdAt: 1}`

---

## Collection Statistics (Expected)

```
Database: skillmatch-1

Collection    │ Documents │ Avg Size │ Indexes │ Relationships
──────────────┼───────────┼──────────┼─────────┼──────────────
users         │     6     │   ~2KB   │    2    │ → profiles (1:1)
              │           │          │         │ → listings (1:N)
              │           │          │         │ → threads (N:M)
              │           │          │         │ → messages (N:M)
──────────────┼─────────── ──┼──────────┼─────────┼──────────────
profiles      │     6     │   ~5KB   │    3    │ → users (N:1)
──────────────┼───────────┼──────────┼─────────┼──────────────
listings      │     8     │  ~10KB   │    9    │ → users (N:1)
              │           │          │         │ → threads (1:N)
──────────────┼───────────┼──────────┼─────────┼──────────────
threads       │     N     │   ~3KB   │    5    │ → users (N:M)
              │           │          │         │ → listings (N:1)
              │           │          │         │ → messages (1:N)
──────────────┼───────────┼──────────┼─────────┼──────────────
messages      │     N     │   ~2KB   │    6    │ → threads (N:1)
              │           │          │         │ → users (N:1, sender)
              │           │          │         │ → users (N:1, recipient)
```

---

## Query Patterns

### Common Queries

1. **Find listings near location**
   ```javascript
   db.listings.find({
     "location.coordinates": {
       $near: {
         $geometry: { type: "Point", coordinates: [lng, lat] },
         $maxDistance: 50000 // meters
       }
     },
     status: "active"
   })
   ```

2. **Get user's threads**
   ```javascript
   db.threads.find({
     "participants.userId": userId,
     status: "active"
   }).sort({ updatedAt: -1 })
   ```

3. **Get thread messages**
   ```javascript
   db.messages.find({
     threadId: threadId
   }).sort({ createdAt: 1 })
   ```

4. **Find listings by skill**
   ```javascript
   db.listings.find({
     "skills.name": "JavaScript",
     status: "active"
   })
   ```

---

## Notes

- All ObjectId references use Mongoose's `ref` for population
- Timestamps are auto-managed by Mongoose (`timestamps: true`)
- Geospatial queries require 2dsphere indexes
- TTL index on `listings.expiresAt` auto-deletes expired listings
- Thread `lastMessage` is cached for performance (updated on new message)
- Message `isRead` status is tracked per message, aggregated in thread `unreadCount`
