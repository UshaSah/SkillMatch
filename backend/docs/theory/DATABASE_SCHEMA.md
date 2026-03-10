# SkillMatch Database Schema

## Overview

SkillMatch uses **MongoDB** (NoSQL document database) with **Mongoose ODM**. The database consists of 6 main collections that work together to support the skill exchange platform.

---

## Database Collections

### 1. **users** Collection
Stores user authentication and account information.

#### Schema Structure
```javascript
{
  _id: ObjectId,                    // Auto-generated
  email: String,                    // Unique, lowercase, required
  password: String,                 // Hashed with bcrypt (12 rounds)
  emailVerified: Boolean,           // Default: false
  emailVerificationToken: String,   // For email verification
  passwordResetToken: String,       // For password reset
  passwordResetExpires: Date,       // Token expiration
  roles: [String],                  // ['user', 'admin', 'moderator']
  isActive: Boolean,                // Default: true
  lastLogin: Date,
  loginAttempts: Number,            // Default: 0
  lockUntil: Date,                  // Account lockout timestamp
  tokenVersion: Number,             // For JWT token revocation
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-generated
}
```

#### Indexes
- `email` (unique)
- `emailVerificationToken`
- `passwordResetToken`

#### Sample Document
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5",
  "emailVerified": true,
  "roles": ["user"],
  "isActive": true,
  "tokenVersion": 1,
  "createdAt": "2026-01-22T10:00:00.000Z",
  "updatedAt": "2026-01-22T10:00:00.000Z"
}
```

---

### 2. **profiles** Collection
Stores user profile information (1:1 relationship with users).

#### Schema Structure
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                 // Reference to User (unique)
  displayName: String,              // Required, max 50 chars
  bio: String,                      // Max 500 chars
  skills: [{
    name: String,                   // Required
    level: String,                  // 'beginner'|'intermediate'|'advanced'|'expert'
    category: String                // Required
  }],
  location: {
    type: String,                   // 'Point'
    coordinates: [Number, Number],  // [longitude, latitude]
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  radius: Number,                   // Miles (1-100, default: 25)
  avatarUrl: String,
  reputation: Number,               // Default: 0
  rating: {
    average: Number,                // 0-5
    count: Number
  },
  availability: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    // ... other days
  },
  preferences: {
    notifications: {
      email: Boolean,
      push: Boolean,
      newMessages: Boolean,
      newMatches: Boolean
    },
    privacy: {
      showLocation: Boolean,
      showEmail: Boolean
    }
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
- `userId` (unique)
- `location.coordinates` (2dsphere - geospatial)
- `skills.name`
- `skills.category`
- `reputation` (descending)
- `rating.average` (descending)

#### Sample Document
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "displayName": "John Doe",
  "bio": "Full-stack developer with 5 years of experience",
  "skills": [
    {
      "name": "JavaScript",
      "level": "expert",
      "category": "Programming"
    },
    {
      "name": "React",
      "level": "advanced",
      "category": "Frontend"
    }
  ],
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749],
    "address": {
      "city": "San Francisco",
      "state": "CA",
      "country": "USA"
    }
  },
  "radius": 25,
  "avatarUrl": "https://s3.amazonaws.com/bucket/avatar.jpg",
  "reputation": 150,
  "rating": {
    "average": 4.5,
    "count": 10
  },
  "preferences": {
    "notifications": {
      "email": true,
      "newMessages": true
    },
    "privacy": {
      "showLocation": true,
      "showEmail": false
    }
  },
  "createdAt": "2026-01-22T10:00:00.000Z",
  "updatedAt": "2026-01-22T10:00:00.000Z"
}
```

---

### 3. **listings** Collection
Stores skill offers and requests.

#### Schema Structure
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId,                // Reference to User
  type: String,                     // 'offer' | 'request'
  title: String,                    // Required, max 100 chars
  description: String,              // Required, max 1000 chars
  skills: [{
    name: String,
    level: String,
    category: String
  }],
  location: {
    type: String,                   // 'Point'
    coordinates: [Number, Number],  // [longitude, latitude]
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  compensation: {
    type: String,                   // 'free' | 'paid' | 'trade' | 'negotiable'
    amount: Number,
    currency: String,               // Default: 'USD'
    description: String
  },
  timeCommitment: String,           // 'one-time' | 'short-term' | 'long-term' | 'ongoing'
  estimatedHours: {
    min: Number,
    max: Number
  },
  status: String,                   // 'active' | 'inactive' | 'completed' | 'cancelled'
  tags: [String],                   // Auto-generated from skills
  images: [{
    url: String,
    caption: String,
    order: Number
  }],
  requirements: [String],
  benefits: [String],
  contactMethod: String,            // 'message' | 'email' | 'phone'
  isRemote: Boolean,
  expiresAt: Date,                  // Auto: 30 days from creation
  viewCount: Number,                // Default: 0
  interestCount: Number,            // Default: 0
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
- `ownerId`
- `type`
- `status`
- `location.coordinates` (2dsphere - geospatial)
- `skills.name`
- `skills.category`
- `tags`
- `createdAt` (descending)
- `expiresAt` (TTL index - auto-delete expired)
- Compound: `type + status + location + createdAt`

#### Sample Document
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "ownerId": "507f1f77bcf86cd799439011",
  "type": "offer",
  "title": "JavaScript Tutoring - React & Node.js",
  "description": "Offering one-on-one JavaScript tutoring sessions...",
  "skills": [
    {
      "name": "JavaScript",
      "level": "expert",
      "category": "Programming"
    }
  ],
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749],
    "address": {
      "city": "San Francisco",
      "state": "CA"
    }
  },
  "compensation": {
    "type": "paid",
    "amount": 50,
    "currency": "USD",
    "description": "$50/hour"
  },
  "timeCommitment": "one-time",
  "estimatedHours": {
    "min": 1,
    "max": 2
  },
  "status": "active",
  "tags": ["javascript", "react", "node.js", "programming"],
  "viewCount": 25,
  "interestCount": 3,
  "expiresAt": "2026-02-22T10:00:00.000Z",
  "createdAt": "2026-01-22T10:00:00.000Z"
}
```

---

### 4. **threads** Collection
Stores conversation threads between users.

#### Schema Structure
```javascript
{
  _id: ObjectId,
  participants: [{
    userId: ObjectId,               // Reference to User
    joinedAt: Date,
    lastReadAt: Date,
    isActive: Boolean
  }],
  listingId: ObjectId,              // Optional reference to Listing
  subject: String,                  // Max 200 chars
  lastMessage: {
    content: String,
    senderId: ObjectId,
    sentAt: Date
  },
  messageCount: Number,             // Default: 0
  unreadCount: Number,              // Default: 0
  status: String,                   // 'active' | 'archived' | 'blocked'
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
- `participants.userId`
- `listingId`
- `status`
- `lastMessage.sentAt` (descending)
- Compound: `participants.userId + status + lastMessage.sentAt`

#### Sample Document
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "participants": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "joinedAt": "2026-01-22T10:00:00.000Z",
      "lastReadAt": "2026-01-22T11:00:00.000Z",
      "isActive": true
    },
    {
      "userId": "507f1f77bcf86cd799439015",
      "joinedAt": "2026-01-22T10:00:00.000Z",
      "lastReadAt": "2026-01-22T10:30:00.000Z",
      "isActive": true
    }
  ],
  "listingId": "507f1f77bcf86cd799439013",
  "subject": "Interested in JavaScript Tutoring",
  "lastMessage": {
    "content": "Yes, I'm available!",
    "senderId": "507f1f77bcf86cd799439011",
    "sentAt": "2026-01-22T11:00:00.000Z"
  },
  "messageCount": 5,
  "unreadCount": 1,
  "status": "active",
  "createdAt": "2026-01-22T10:00:00.000Z"
}
```

---

### 5. **messages** Collection
Stores individual messages within threads.

#### Schema Structure
```javascript
{
  _id: ObjectId,
  threadId: ObjectId,               // Reference to Thread
  senderId: ObjectId,               // Reference to User
  recipientId: ObjectId,            // Reference to User
  content: String,                  // Required, max 2000 chars
  type: String,                     // 'text' | 'image' | 'file' | 'system'
  attachments: [{
    url: String,
    filename: String,
    mimetype: String,
    size: Number
  }],
  isRead: Boolean,                   // Default: false
  readAt: Date,
  isEdited: Boolean,                // Default: false
  editedAt: Date,
  replyTo: ObjectId,                 // Optional reference to Message
  reactions: [{
    userId: ObjectId,
    emoji: String,
    createdAt: Date
  }],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
- `threadId + createdAt` (descending) - For thread messages
- `senderId`
- `recipientId`
- `isRead`
- `createdAt` (descending)
- `threadId + isRead` - For unread messages

#### Sample Document
```json
{
  "_id": "507f1f77bcf86cd799439016",
  "threadId": "507f1f77bcf86cd799439014",
  "senderId": "507f1f77bcf86cd799439011",
  "recipientId": "507f1f77bcf86cd799439015",
  "content": "Hi! I saw your JavaScript tutoring listing. Are you still available?",
  "type": "text",
  "attachments": [],
  "isRead": true,
  "readAt": "2026-01-22T10:05:00.000Z",
  "isEdited": false,
  "reactions": [],
  "createdAt": "2026-01-22T10:00:00.000Z"
}
```

---

### 6. **outboxnotifications** Collection
Stores email notifications in outbox pattern for reliable delivery.

#### Schema Structure
```javascript
{
  _id: ObjectId,
  type: String,                     // 'email' | 'push' | 'sms'
  to: String,                       // Recipient email/phone
  subject: String,                  // Max 200 chars
  template: String,                 // Template name
  payload: Object,                  // Template data (Mixed type)
  dedupeKey: String,               // Unique - prevents duplicates
  status: String,                   // 'pending' | 'sent' | 'failed' | 'cancelled'
  attempts: Number,                 // Default: 0, max: 5
  maxAttempts: Number,              // Default: 3
  nextAttemptAt: Date,              // For retry scheduling
  lastAttemptAt: Date,
  lastError: {
    message: String,
    code: String,
    stack: String
  },
  sentAt: Date,
  externalId: String,               // SES message ID, etc.
  priority: String,                 // 'low' | 'normal' | 'high' | 'urgent'
  scheduledFor: Date,
  expiresAt: Date,                  // Auto: 7 days from creation (TTL)
  metadata: {
    userId: ObjectId,
    threadId: ObjectId,
    listingId: ObjectId,
    messageId: ObjectId
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Indexes
- `status + nextAttemptAt` - For worker queries
- `dedupeKey` (unique)
- `type + status`
- `metadata.userId`
- `scheduledFor`
- `expiresAt` (TTL index - auto-delete expired)
- Compound: `status + priority + nextAttemptAt`

#### Sample Document
```json
{
  "_id": "507f1f77bcf86cd799439017",
  "type": "email",
  "to": "sarah@example.com",
  "subject": "New message from John Doe",
  "template": "NEW_MESSAGE",
  "payload": {
    "senderName": "John Doe",
    "messagePreview": "Hi! I saw your listing...",
    "threadId": "507f1f77bcf86cd799439014"
  },
  "dedupeKey": "message:507f1f77bcf86cd799439014:sarah@example.com:507f1f77bcf86cd799439016",
  "status": "pending",
  "attempts": 0,
  "maxAttempts": 3,
  "nextAttemptAt": "2026-01-22T10:00:00.000Z",
  "priority": "normal",
  "scheduledFor": "2026-01-22T10:00:00.000Z",
  "expiresAt": "2026-01-29T10:00:00.000Z",
  "metadata": {
    "userId": "507f1f77bcf86cd799439015",
    "threadId": "507f1f77bcf86cd799439014",
    "messageId": "507f1f77bcf86cd799439016"
  },
  "createdAt": "2026-01-22T10:00:00.000Z"
}
```

---

## Entity Relationships

### Relationship Diagram

```
┌─────────────┐
│   users     │
│             │
│ _id (PK)    │
│ email       │
│ password    │
└──────┬──────┘
       │ 1:1
       │
       ↓
┌─────────────┐
│  profiles   │
│             │
│ _id (PK)    │
│ userId (FK) │
│ displayName │
│ skills[]    │
│ location    │
└─────────────┘

┌─────────────┐
│   users     │
│             │
│ _id (PK)    │
└──────┬──────┘
       │ 1:N
       │
       ↓
┌─────────────┐
│  listings   │
│             │
│ _id (PK)    │
│ ownerId(FK) │
│ type        │
│ skills[]    │
│ location    │
└──────┬──────┘
       │
       │ N:1 (optional)
       ↓
┌─────────────┐
│   threads   │
│             │
│ _id (PK)    │
│ listingId   │
│ participants│
└──────┬──────┘
       │ 1:N
       ↓
┌─────────────┐
│  messages   │
│             │
│ _id (PK)    │
│ threadId(FK)│
│ senderId(FK)│
│ recipientId │
└──────┬──────┘
       │
       │ Triggers
       ↓
┌─────────────────────┐
│ outboxnotifications │
│                     │
│ _id (PK)            │
│ metadata.messageId  │
│ status              │
│ dedupeKey (unique)  │
└─────────────────────┘
```

### Key Relationships

1. **User ↔ Profile**: 1:1 (one user has one profile)
   - `profiles.userId` → `users._id`

2. **User ↔ Listing**: 1:N (one user can have many listings)
   - `listings.ownerId` → `users._id`

3. **User ↔ Thread**: N:M (many users can be in many threads)
   - `threads.participants[].userId` → `users._id`

4. **Thread ↔ Message**: 1:N (one thread has many messages)
   - `messages.threadId` → `threads._id`

5. **Listing ↔ Thread**: 1:N (one listing can have many threads)
   - `threads.listingId` → `listings._id` (optional)

6. **Message → OutboxNotification**: 1:1 (each message triggers one notification)
   - `outboxnotifications.metadata.messageId` → `messages._id`

---

## Index Strategy

### Performance Indexes

1. **Geospatial Indexes** (2dsphere):
   - `profiles.location.coordinates`
   - `listings.location.coordinates`
   - Enables location-based queries (find nearby)

2. **Text Search Indexes**:
   - `listings.skills.name`
   - `listings.tags`
   - `profiles.skills.name`

3. **Compound Indexes**:
   - `listings`: `type + status + location + createdAt`
   - `threads`: `participants.userId + status + lastMessage.sentAt`
   - `outboxnotifications`: `status + priority + nextAttemptAt`

4. **TTL Indexes** (Time-To-Live):
   - `listings.expiresAt` - Auto-delete expired listings
   - `outboxnotifications.expiresAt` - Auto-cleanup old notifications

---

## Sample Database State

### After Seeding (5 users)

```
users:         5 documents
profiles:      5 documents
listings:      5 documents
threads:       1 document
messages:      3 documents
outboxnotifications: 0-3 documents (depending on processing)
```

### Typical Production State

```
users:         1,000-10,000+
profiles:      1,000-10,000+
listings:      500-5,000+
threads:       200-2,000+
messages:      1,000-10,000+
outboxnotifications: 50-500 (pending/sent)
```

---

## Data Flow Examples

### Example 1: User Creates Listing

```
1. User registers → users collection
2. Profile created → profiles collection
3. User creates listing → listings collection
   - ownerId references user._id
   - location.coordinates indexed for geospatial search
```

### Example 2: User Sends Message

```
1. Thread created/found → threads collection
   - participants[] contains both user IDs
2. Message created → messages collection
   - threadId references thread._id
   - senderId and recipientId reference users._id
3. OutboxNotification created → outboxnotifications collection
   - metadata.messageId references message._id
   - status: 'pending'
4. Worker processes notification → status: 'sent'
```

---

## Database Queries Examples

### Find User's Profile
```javascript
Profile.findOne({ userId: user._id })
```

### Find Nearby Listings
```javascript
Listing.find({
  'location.coordinates': {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: 25 * 1609.34 // 25 miles in meters
    }
  },
  status: 'active'
})
```

### Get User's Threads
```javascript
Thread.find({
  'participants.userId': user._id,
  status: 'active'
}).sort({ 'lastMessage.sentAt': -1 })
```

### Get Thread Messages
```javascript
Message.find({ threadId: thread._id })
  .sort({ createdAt: -1 })
  .limit(50)
```

### Get Pending Notifications
```javascript
OutboxNotification.find({
  status: 'pending',
  nextAttemptAt: { $lte: new Date() }
}).sort({ priority: -1, createdAt: 1 })
```

---

## Best Practices

1. **Always use indexes** for frequently queried fields
2. **Geospatial queries** require 2dsphere indexes
3. **TTL indexes** automatically clean up expired data
4. **Compound indexes** optimize multi-field queries
5. **References** use ObjectId for relationships
6. **Validation** happens at schema level (Mongoose)
7. **Virtual fields** computed on-the-fly (not stored)

---

## Database Size Estimates

### Per Document Sizes (approximate)

- **User**: ~500 bytes
- **Profile**: ~2-5 KB (depends on skills count)
- **Listing**: ~3-8 KB (depends on description/images)
- **Thread**: ~500 bytes
- **Message**: ~1-2 KB (depends on content/attachments)
- **OutboxNotification**: ~1-2 KB

### Total Storage (10,000 users)

- Users: ~5 MB
- Profiles: ~30 MB
- Listings: ~50 MB
- Threads: ~5 MB
- Messages: ~20 MB
- Notifications: ~10 MB
- **Total: ~120 MB** (plus indexes ~20-30 MB)

---

## Summary

The SkillMatch database is designed for:
- ✅ **Scalability** - Indexed for performance
- ✅ **Geospatial queries** - Location-based matching
- ✅ **Reliable notifications** - Outbox pattern
- ✅ **Flexible schema** - NoSQL document structure
- ✅ **Data integrity** - Validation and relationships
- ✅ **Auto-cleanup** - TTL indexes for expired data

---

**Database Name**: `skillexchange` (or as configured in MONGODB_URI)