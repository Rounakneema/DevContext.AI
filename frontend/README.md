# DevContext Frontend

React-based frontend for the DevContext AI code analysis platform.

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
REACT_APP_API_URL=https://your-api-gateway-url.amazonaws.com/prod
REACT_APP_COGNITO_USER_POOL_ID=your-user-pool-id
REACT_APP_COGNITO_CLIENT_ID=your-client-id
REACT_APP_COGNITO_REGION=ap-southeast-1
```

## Authentication

The frontend uses AWS Cognito for authentication. See `SETUP.md` for detailed setup instructions.

### Common Issues

#### "Failed to fetch" Error

This error occurs when the backend API requires authentication but no valid token is provided.

**Solutions:**

1. **Test Backend Directly** (Recommended for development):
```bash
cd backend
node test-api.js
```

2. **Get a Cognito Token**:
```bash
cd backend
node set-password.js  # Set password for your user
node get-token.js     # Get ID token
```

3. **Temporarily Disable Auth** (Development only):
   - Comment out the `Auth` section in `backend/template.yaml`
   - Use `api-no-auth.ts` in the frontend
   - Redeploy: `cd backend && npm run build && sam deploy`
   - **Remember to re-enable auth after testing!**

## Project Structure

```
frontend/
├── public/          # Static files
├── src/
│   ├── components/  # Reusable components
│   │   └── dashboard/  # Dashboard tabs
│   ├── contexts/    # React contexts (Auth)
│   ├── pages/       # Page components
│   ├── services/    # API services
│   └── App.tsx      # Main app component
```

## Testing

### Backend Testing (No Frontend Required)

```bash
cd backend
node test-api.js           # Test full API
node check-dynamodb.js     # Check analysis status
node view-results.js       # View detailed results
```

### Frontend UI Testing

Use mock data in `src/mock-api-responses.json` for UI testing without backend calls.

## API Integration

The frontend communicates with the backend API using these endpoints:

- `POST /analyze` - Start new analysis
- `GET /analysis/{id}` - Get full analysis results
- `GET /analysis/{id}/status` - Get analysis status
- `GET /analyses` - List user's analyses
- `GET /analysis/{id}/events` - Get analysis events
- `GET /analysis/{id}/cost` - Get cost breakdown
- `DELETE /analysis/{id}` - Delete analysis

All requests require `Authorization: Bearer <token>` header.

## Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)
- [AWS Cognito documentation](https://docs.aws.amazon.com/cognito/)
