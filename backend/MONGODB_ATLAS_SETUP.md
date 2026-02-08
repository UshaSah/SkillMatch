# MongoDB Atlas Connection Setup

## Your Connection String

Update your `backend/.env` file with:

```
MONGODB_URI=mongodb+srv://db_user1:mac1@cluster0.8ptizjm.mongodb.net/skillmatch-1
```

**Important Notes:**
1. The database name (`skillmatch-1`) goes at the end after the `/`
2. Make sure your Atlas cluster allows connections from your IP address
3. The password might need to be URL-encoded if it contains special characters

## Verify Connection

After updating `.env`, test the connection:

```bash
cd backend
npm run test:connection
```

## Check Collections

To see what collections exist:

```bash
npm run find:collections
```

## Common Issues

### Connection Timeout
- Check your IP is whitelisted in Atlas Network Access
- Check your firewall isn't blocking the connection

### Authentication Failed
- Verify username and password are correct
- Make sure the database user has read/write permissions

### Database Not Found
- Verify the database name is correct (`skillmatch-1`)
- The database will be created automatically on first write if it doesn't exist
