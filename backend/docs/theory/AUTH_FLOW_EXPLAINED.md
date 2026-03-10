# Complete Authentication Flow Explained

## 📋 Table of Contents
1. [User Registration Flow](#1-user-registration-flow)
2. [User Login Flow](#2-user-login-flow)
3. [JWT Token Authorization Flow](#3-jwt-token-authorization-flow)
4. [Code Flow Diagrams](#code-flow-diagrams)

---

## 1. User Registration Flow

### Step-by-Step Code Flow

```
Client Request
    ↓
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
    ↓
```

### Step 1: Route Handler (`src/routes/auth.js`)

```javascript
router.post('/register', authLimiter, validate(registerSchema), register);
```

**What happens:**
1. **Rate Limiter** (`authLimiter`) - Checks if user exceeded 5 requests per 15 minutes
2. **Validator** (`validate(registerSchema)`) - Validates request body
3. **Controller** (`register`) - Processes registration

**Code Location:** `src/routes/auth.js:30`

---

### Step 2: Input Validation (`src/validators/authValidator.js`)

```javascript
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  displayName: Joi.string().min(2).max(50).required()
});
```

**What happens:**
- Validates email format
- Checks password length (min 6, max 128)
- Validates displayName length
- If validation fails → Returns 400 error with details
- If validation passes → Continues to controller

**Code Location:** `src/validators/authValidator.js:4-20`

---

### Step 3: Registration Controller (`src/controllers/authController.js`)

```javascript
const register = async (req, res, next) => {
  // Step 3.1: Extract data from validated request
  const { email, password, displayName } = req.body;

  // Step 3.2: Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // Step 3.3: Create new User document
  const user = new User({
    email: email.toLowerCase(),
    password, // Plain text password
    emailVerified: false
  });

  // Step 3.4: Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = emailVerificationToken;

  // Step 3.5: Save user (password gets hashed automatically)
  await user.save();
```

**What happens:**
1. **Extract data** - Gets email, password, displayName from request
2. **Check duplicates** - Queries database for existing email
3. **Create user** - Creates new User document
4. **Generate token** - Creates random hex string for email verification
5. **Save user** - Triggers User model's pre-save middleware

**Code Location:** `src/controllers/authController.js:11-32`

---

### Step 4: Password Hashing (`src/models/User.js`)

```javascript
// Pre-save middleware runs automatically when user.save() is called
userSchema.pre('save', async function(next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  try {
    // Hash password with bcrypt (12 rounds = very secure)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

**What happens:**
- **Pre-save hook** runs automatically before saving
- **Generates salt** - Random salt for hashing
- **Hashes password** - Converts plain text to bcrypt hash
- **Saves hashed password** - Original password never stored

**Code Location:** `src/models/User.js:68-81`

---

### Step 5: Create User Profile (`src/controllers/authController.js`)

```javascript
  // Step 5.1: Create profile linked to user
  const profile = new Profile({
    userId: user._id,
    displayName,
    skills: [],
    location: {
      type: 'Point',
      coordinates: [0, 0] // Default location
    }
  });

  // Step 5.2: Save profile
  await profile.save();
```

**What happens:**
- Creates Profile document linked to User
- Sets default values (empty skills, default location)
- Saves to database

**Code Location:** `src/controllers/authController.js:34-45`

---

### Step 6: Generate JWT Tokens (`src/utils/jwt.js`)

```javascript
  // Step 6.1: Generate token pair
  const { accessToken, refreshToken } = generateTokenPair(user);
```

**Inside `generateTokenPair()`:**

```javascript
const generateTokenPair = (user) => {
  // Step 6.2: Prepare payload
  const payload = {
    id: user._id || user.id,
    email: user.email,
    roles: user.roles || ['user'],
    tokenVersion: user.tokenVersion || 1
  };

  // Step 6.3: Generate access token (15 minutes)
  const accessToken = jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      roles: payload.roles,
      type: 'access'  // Token type identifier
    },
    process.env.JWT_SECRET,  // Secret key
    {
      expiresIn: '15m',  // Expires in 15 minutes
      issuer: 'skillexchange-api',
      audience: 'skillexchange-client'
    }
  );

  // Step 6.4: Generate refresh token (7 days)
  const refreshToken = jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      type: 'refresh',
      tokenVersion: payload.tokenVersion
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',  // Expires in 7 days
      issuer: 'skillexchange-api',
      audience: 'skillexchange-client'
    }
  );

  return { accessToken, refreshToken };
};
```

**What happens:**
1. **Prepare payload** - User data to encode in token
2. **Sign access token** - Creates JWT with 15min expiry
3. **Sign refresh token** - Creates JWT with 7 day expiry
4. **Return both tokens** - Client stores these

**Code Location:** `src/utils/jwt.js:67-79`

---

### Step 7: Send Response (`src/controllers/authController.js`)

```javascript
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        roles: user.roles
      },
      profile: {
        displayName: profile.displayName
      },
      tokens: {
        accessToken,  // Client stores this
        refreshToken  // Client stores this
      }
    },
    message: 'Registration successful. Please verify your email.',
    requestId: req.requestId
  });
```

**What happens:**
- Returns 201 Created status
- Sends user data (without password)
- Sends profile data
- Sends both JWT tokens
- Client stores tokens for future requests

**Code Location:** `src/controllers/authController.js:60-79`

---

## 2. User Login Flow

### Step-by-Step Code Flow

```
Client Request
    ↓
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
    ↓
```

### Step 1: Route Handler (`src/routes/auth.js`)

```javascript
router.post('/login', authLimiter, validate(loginSchema), login);
```

**What happens:**
- Rate limiter checks (5 requests per 15min)
- Validates email and password format
- Calls login controller

**Code Location:** `src/routes/auth.js:31`

---

### Step 2: Input Validation (`src/validators/authValidator.js`)

```javascript
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
```

**What happens:**
- Validates email format
- Ensures password is provided
- Continues if valid

**Code Location:** `src/validators/authValidator.js:22-35`

---

### Step 3: Login Controller (`src/controllers/authController.js`)

```javascript
const login = async (req, res, next) => {
  // Step 3.1: Extract credentials
  const { email, password } = req.body;

  // Step 3.2: Find user (include password field)
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password');  // Include password (normally excluded)

  if (!user) {
    logger.warn('Login attempt with non-existent email');
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Step 3.3: Check if account is locked
  if (user.isLocked) {
    throw new AppError('Account is temporarily locked', 401, 'ACCOUNT_LOCKED');
  }

  // Step 3.4: Check if account is active
  if (!user.isActive) {
    throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
  }

  // Step 3.5: Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Increment failed login attempts
    await user.incLoginAttempts();
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Step 3.6: Reset login attempts on success
  await user.resetLoginAttempts();

  // Step 3.7: Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  // Step 3.8: Send response
  res.json({
    success: true,
    data: {
      user: { ... },
      tokens: { accessToken, refreshToken }
    }
  });
};
```

**What happens:**
1. **Extract credentials** - Gets email and password
2. **Find user** - Queries database (includes password field)
3. **Check account status** - Verifies not locked or inactive
4. **Verify password** - Compares plain text with hashed password
5. **Handle failures** - Increments login attempts, locks after 5
6. **Reset attempts** - Clears lockout on success
7. **Generate tokens** - Creates new JWT pair
8. **Send response** - Returns user data and tokens

**Code Location:** `src/controllers/authController.js:88-150`

---

### Step 4: Password Verification (`src/models/User.js`)

```javascript
// Instance method on User model
userSchema.methods.comparePassword = async function(candidatePassword) {
  // bcrypt.compare() hashes candidatePassword and compares with stored hash
  return await bcrypt.compare(candidatePassword, this.password);
};
```

**What happens:**
- Takes plain text password from request
- Hashes it with same salt
- Compares with stored hash
- Returns true if match, false otherwise

**Code Location:** `src/models/User.js:83-86`

---

### Step 5: Account Lockout Logic (`src/models/User.js`)

```javascript
// When login fails
userSchema.methods.incLoginAttempts = function() {
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 
      lockUntil: Date.now() + 2 * 60 * 60 * 1000  // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// When login succeeds
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};
```

**What happens:**
- **On failure:** Increments attempts, locks after 5
- **On success:** Resets attempts and lockout

**Code Location:** `src/models/User.js:88-114`

---

## 3. JWT Token Authorization Flow

### Step-by-Step Code Flow

```
Client Request
    ↓
GET /api/auth/me
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
    ↓
```

### Step 1: Route with Auth Middleware (`src/routes/auth.js`)

```javascript
router.get('/me', authenticate, getMe);
```

**What happens:**
- Route requires `authenticate` middleware
- Middleware runs BEFORE controller
- If auth fails → Error response, controller never runs
- If auth succeeds → Controller executes

**Code Location:** `src/routes/auth.js:36`

---

### Step 2: Authentication Middleware (`src/middleware/auth.js`)

```javascript
const authenticate = async (req, res, next) => {
  try {
    // Step 2.1: Extract token from Authorization header
    const authHeader = req.headers.authorization;
    // authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    
    const token = extractTokenFromHeader(authHeader);
    // token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

    if (!token) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    // Step 2.2: Verify token (decodes and validates)
    const decoded = verifyToken(token, 'access');
    // decoded = { id: "...", email: "...", roles: [...], type: "access", iat: ..., exp: ... }

    // Step 2.3: Fetch user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    // Step 2.4: Check account status
    if (!user.isActive) {
      throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
    }

    if (user.isLocked) {
      throw new AppError('Account is locked', 401, 'ACCOUNT_LOCKED');
    }

    // Step 2.5: Attach user to request object
    req.user = user;
    req.userId = user._id;

    // Step 2.6: Continue to next middleware/controller
    next();
  } catch (error) {
    // Step 2.7: Handle errors
    next(error);  // Passes to error handler middleware
  }
};
```

**What happens:**
1. **Extract token** - Gets Bearer token from header
2. **Verify token** - Decodes and validates JWT
3. **Find user** - Queries database for user
4. **Check status** - Verifies account is active and not locked
5. **Attach user** - Adds user to request object
6. **Continue** - Calls next() to proceed to controller

**Code Location:** `src/middleware/auth.js:10-60`

---

### Step 3: Token Extraction (`src/utils/jwt.js`)

```javascript
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  // Split "Bearer TOKEN" into ["Bearer", "TOKEN"]
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];  // Return just the token
};
```

**What happens:**
- Splits header string
- Validates "Bearer" prefix
- Returns token string

**Code Location:** `src/utils/jwt.js:120-133`

---

### Step 4: Token Verification (`src/utils/jwt.js`)

```javascript
const verifyToken = (token, expectedType = 'access') => {
  const secret = process.env.JWT_SECRET;

  try {
    // Step 4.1: Decode and verify token
    const decoded = jwt.verify(token, secret, {
      issuer: 'skillexchange-api',
      audience: 'skillexchange-client'
    });
    // jwt.verify() checks:
    // - Signature is valid
    // - Token hasn't expired
    // - Issuer matches
    // - Audience matches

    // Step 4.2: Verify token type
    if (decoded.type !== expectedType) {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
    throw error;
  }
};
```

**What happens:**
1. **Verify signature** - Ensures token wasn't tampered with
2. **Check expiration** - Verifies token hasn't expired
3. **Validate issuer/audience** - Ensures token is from our API
4. **Check type** - Verifies it's an access token (not refresh)
5. **Return decoded** - Returns user data from token

**Code Location:** `src/utils/jwt.js:90-118`

---

### Step 5: Controller Execution (`src/controllers/authController.js`)

```javascript
const getMe = async (req, res, next) => {
  try {
    // req.user is available here (set by authenticate middleware)
    const user = await User.findById(req.user._id).select('-password');
    const profile = await Profile.findOne({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          emailVerified: user.emailVerified,
          roles: user.roles
        },
        profile: profile || null
      }
    });
  } catch (error) {
    next(error);
  }
};
```

**What happens:**
- `req.user` is already set by middleware
- Fetches user and profile data
- Returns response

**Code Location:** `src/controllers/authController.js:248-270`

---

## Code Flow Diagrams

### Registration Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ POST /api/auth/register
       │ { email, password, displayName }
       ↓
┌──────────────────────┐
│  Express Router      │
│  src/routes/auth.js  │
└──────┬───────────────┘
       │
       ├─→ Rate Limiter (5 req/15min)
       │
       ├─→ Validator (Joi schema)
       │   └─→ Validates email, password, displayName
       │
       ↓
┌──────────────────────┐
│  Register Controller │
│  authController.js   │
└──────┬───────────────┘
       │
       ├─→ Check duplicate email
       │   └─→ User.findOne({ email })
       │
       ├─→ Create User document
       │   └─→ new User({ email, password })
       │
       ├─→ Save User
       │   └─→ Pre-save hook hashes password
       │       └─→ bcrypt.hash(password, salt)
       │
       ├─→ Create Profile
       │   └─→ new Profile({ userId, displayName })
       │
       ├─→ Generate JWT Tokens
       │   └─→ generateTokenPair(user)
       │       ├─→ Access Token (15min)
       │       └─→ Refresh Token (7 days)
       │
       ↓
┌──────────────────────┐
│   Response (201)     │
│   { user, tokens }   │
└──────────────────────┘
```

### Login Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/auth/login
       │ { email, password }
       ↓
┌──────────────────────┐
│  Express Router      │
└──────┬───────────────┘
       │
       ├─→ Rate Limiter
       ├─→ Validator
       ↓
┌──────────────────────┐
│  Login Controller    │
└──────┬───────────────┘
       │
       ├─→ Find User
       │   └─→ User.findOne({ email }).select('+password')
       │
       ├─→ Check Account Status
       │   ├─→ isLocked?
       │   └─→ isActive?
       │
       ├─→ Verify Password
       │   └─→ user.comparePassword(password)
       │       └─→ bcrypt.compare(plain, hash)
       │
       ├─→ Handle Result
       │   ├─→ Success: resetLoginAttempts()
       │   └─→ Failure: incLoginAttempts() → lock after 5
       │
       ├─→ Generate Tokens
       │   └─→ generateTokenPair(user)
       │
       ↓
┌──────────────────────┐
│   Response (200)     │
│   { user, tokens }   │
└──────────────────────┘
```

### Authorization Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/auth/me
       │ Authorization: Bearer TOKEN
       ↓
┌──────────────────────┐
│  Express Router      │
│  router.get('/me')   │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Auth Middleware     │
│  authenticate()      │
└──────┬───────────────┘
       │
       ├─→ Extract Token
       │   └─→ extractTokenFromHeader()
       │       └─→ Split "Bearer TOKEN"
       │
       ├─→ Verify Token
       │   └─→ verifyToken(token, 'access')
       │       ├─→ jwt.verify() checks signature
       │       ├─→ Checks expiration
       │       └─→ Validates issuer/audience
       │
       ├─→ Find User
       │   └─→ User.findById(decoded.id)
       │
       ├─→ Check Status
       │   ├─→ isActive?
       │   └─→ isLocked?
       │
       ├─→ Attach to Request
       │   └─→ req.user = user
       │
       ↓
┌──────────────────────┐
│  Controller          │
│  getMe()             │
└──────┬───────────────┘
       │
       ├─→ Use req.user (already set)
       ├─→ Fetch profile
       │
       ↓
┌──────────────────────┐
│   Response (200)     │
│   { user, profile }  │
└──────────────────────┘
```

---

## Key Concepts Explained

### 1. **JWT Token Structure**

A JWT has 3 parts separated by dots:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1NiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInR5cGUiOiJhY2Nlc3MifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
│───────────────││──────────────────────────────────────││──────────────────────────│
     Header              Payload (decoded data)                    Signature
```

**Header:** Algorithm and token type
**Payload:** User data (id, email, roles, etc.)
**Signature:** Ensures token hasn't been tampered with

### 2. **Why Two Tokens?**

- **Access Token (15min):** Short-lived, used for API requests
  - If stolen, only valid for 15 minutes
  - Must be refreshed frequently
  
- **Refresh Token (7 days):** Long-lived, used to get new access tokens
  - Stored more securely (httpOnly cookie)
  - Can be revoked (tokenVersion increment)

### 3. **Password Security**

- **Never store plain text passwords**
- **bcrypt hashing:** One-way encryption
  - Same password → Different hash each time (due to salt)
  - Cannot reverse hash to get password
  - Slow by design (prevents brute force)

### 4. **Middleware Chain**

```
Request → Middleware 1 → Middleware 2 → Controller → Response
         (Rate Limit)   (Auth)         (Logic)
```

Each middleware can:
- Modify request (`req`)
- Stop chain (send error response)
- Continue chain (`next()`)

---

## Common Questions

### Q: What happens if token expires?
**A:** Client gets 401 error, must use refresh token to get new access token.

### Q: How does password comparison work?
**A:** bcrypt.compare() hashes the plain text password and compares with stored hash.

### Q: Why check user in database if token is valid?
**A:** Token might be valid but user account could be:
- Deleted
- Deactivated
- Locked

### Q: What's the difference between access and refresh tokens?
**A:** 
- Access: Short-lived (15min), used for API calls
- Refresh: Long-lived (7 days), used to get new access tokens

---

## Summary

1. **Registration:** Validate → Create User → Hash Password → Create Profile → Generate Tokens
2. **Login:** Validate → Find User → Verify Password → Generate Tokens
3. **Authorization:** Extract Token → Verify Token → Find User → Attach to Request → Controller

**Security Layers:**
- Rate limiting
- Input validation
- Password hashing
- Token verification
- Account status checks
- Token expiration

---

**This is the complete flow! Every request goes through these steps.**