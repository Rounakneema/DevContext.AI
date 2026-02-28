# Frontend Setup Guide

## Prerequisites
- Node.js 16+ installed
- Backend deployed to AWS (API Gateway endpoint)
- Cognito User Pool configured

## Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```
REACT_APP_COGNITO_USER_POOL_ID=your-user-pool-id
REACT_APP_COGNITO_CLIENT_ID=your-client-id
REACT_APP_COGNITO_REGION=ap-southeast-1
REACT_APP_API_ENDPOINT=https://your-api-gateway-url/prod
```

## Running the Frontend

### Development Mode
```bash
npm start
```

The app will open at `http://localhost:3000`

### Production Build
```bash
npm run build
```

The build folder will contain the production-ready files.

## Features

- **Authentication**: AWS Cognito integration for signup/login
- **Repository Analysis**: Submit GitHub URLs for analysis
- **Real-time Progress**: Poll backend for analysis status
- **Dashboard**: View project review, interview questions, and more
- **Mock Interview**: Practice answering project-specific questions

## API Integration

The frontend connects to the backend via:
- `POST /analyze` - Start repository analysis
- `GET /analysis/{id}/status` - Check analysis progress
- `GET /analysis/{id}` - Get full analysis results
- `POST /interview/{id}/answer` - Submit interview answers

## Troubleshooting

### CORS Errors
Make sure your API Gateway has CORS enabled for your frontend domain.

### Authentication Errors
Verify your Cognito User Pool ID and Client ID are correct in `.env`.

### API Errors
Check that your backend is deployed and the API endpoint is accessible.
