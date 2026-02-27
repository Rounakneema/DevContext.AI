# DevContext AI Backend

AI-powered GitHub repository analysis for hiring and code review.

## Features

- **Week 1 Implementation** ✅
  - Token Budget Manager (50K token limit)
  - Grounding Checker (hallucination prevention)
  - Self-Correction Loop (quality assurance)
  - Claude Sonnet 4.5 & Haiku 4.5 integration

## Architecture

- **API Gateway** - REST API endpoints
- **Lambda Functions** - Serverless compute
  - Orchestrator - Workflow coordination
  - Repo Processor - Repository analysis
  - Stage 1 - Project review (Sonnet 4.5)
  - Stage 3 - Interview questions (Haiku 4.5)
  - Answer Eval - Answer evaluation (Sonnet 4.5)
- **DynamoDB** - Data storage
- **S3** - Code cache
- **Cognito** - Authentication

## Prerequisites

- Node.js 18+
- AWS CLI configured
- SAM CLI installed
- AWS Account with Bedrock access

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Cognito

**IMPORTANT: Keep your Cognito IDs private!**

1. Create a Cognito User Pool and App Client (without secret)

2. Copy the example config:
```bash
cp samconfig.toml.example samconfig.toml
```

3. Edit `samconfig.toml` and replace placeholders:
```toml
parameter_overrides = "CognitoUserPoolId=\"ap-southeast-1_XXXXX\" CognitoClientId=\"your-client-id\""
```

**Note:** `samconfig.toml` is in `.gitignore` and will NOT be committed to GitHub.

See [COGNITO_SETUP.md](./COGNITO_SETUP.md) for detailed instructions.

### 3. Build

```bash
npm run build
cp package.json dist/
cp package-lock.json dist/
```

### 4. Deploy

```bash
sam build
sam deploy
```

The deployment will use your Cognito IDs from `samconfig.toml`.

## Configuration

### Environment Variables

Set in `template.yaml`:
- `BEDROCK_REGION` - AWS Bedrock region (default: ap-southeast-1)
- `COGNITO_USER_POOL_ID` - Cognito User Pool ID
- `COGNITO_CLIENT_ID` - Cognito App Client ID

### Models

- **Sonnet 4.5**: `anthropic.claude-sonnet-4-5-20250929-v1:0`
- **Haiku 4.5**: `anthropic.claude-haiku-4-5-20251001-v1:0`

## API Endpoints

### POST /analyze
Start repository analysis

```bash
curl -X POST https://API_ENDPOINT/prod/analyze \
  -H "Authorization: Bearer ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/user/repo"}'
```

### GET /analysis/{id}/status
Check analysis status

### GET /analysis/{id}
Get full analysis results

### POST /interview/{id}/answer
Submit interview answer for evaluation

## Development

### Local Testing

```bash
sam local start-api
```

### View Logs

```bash
sam logs -n OrchestratorFunction --stack-name devcontext-backend --tail
```

## Cost Optimization

- **Sonnet 4.5**: $3/M input, $15/M output
- **Haiku 4.5**: $0.25/M input, $1.25/M output
- **Estimated cost**: ~$0.04 per repository analysis

## Security

- ✅ No hardcoded credentials in code
- ✅ `samconfig.toml` excluded from git (contains your Cognito IDs)
- ✅ Cognito authentication required for API access
- ✅ IAM roles with least privilege
- ✅ Environment variables for configuration
- ✅ Rate limiting via API Gateway
- ✅ S3 bucket lifecycle (auto-delete after 24 hours)

## Monitoring

CloudWatch Logs available for all Lambda functions:
- `/aws/lambda/devcontext-backend-OrchestratorFunction-*`
- `/aws/lambda/devcontext-backend-RepoProcessorFunction-*`
- `/aws/lambda/devcontext-backend-Stage1Function-*`
- `/aws/lambda/devcontext-backend-Stage3Function-*`

## Troubleshooting

### Git not found in Lambda
The repo processor uses a git Lambda layer. If issues occur, check:
```yaml
Layers:
  - arn:aws:lambda:ap-southeast-1:553035198032:layer:git-lambda2:8
```

### Bedrock access denied
Ensure models are enabled in AWS Bedrock console:
- Claude Sonnet 4.5
- Claude Haiku 4.5

### Deployment fails
Check IAM permissions for:
- Lambda
- DynamoDB
- S3
- Bedrock
- API Gateway

## License

MIT
