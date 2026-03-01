# DevContext AI - End-to-End Test Suite

Complete test suite for validating the entire DevContext AI workflow from repository submission to interview evaluation.

## Quick Start

```bash
# 1. Set environment variables
export API_BASE_URL="https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod"
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="TestPassword123!"
export TEST_REPO_URL="https://github.com/facebook/react"

# 2. Run tests
node test-complete-flow.js
```

## What Gets Tested

| # | Test | Validates | Endpoint |
|---|------|-----------|----------|
| 1 | Authentication | User login works | Mock (replace with Cognito) |
| 2 | Submit Analysis | Repository accepted | `POST /analyze` |
| 3 | Stage 1 Wait | Project review completes | `GET /analysis/{id}/status` |
| 4 | Stage 1 Results | All scores present | `GET /analysis/{id}` |
| 5 | Trigger Stage 2 | Intelligence report starts | `POST /analysis/{id}/continue-stage2` |
| 6 | Stage 2 Results | Design decisions generated | `GET /analysis/{id}` |
| 7 | Trigger Stage 3 | Question bank generation | `POST /analysis/{id}/continue-stage3` |
| 8 | Stage 3 Results | 50 questions created | `GET /analysis/{id}` |
| 9 | Start Interview | Session created | `POST /interview/sessions` |
| 10 | Answer Evaluation | FAANG-calibrated scoring | `POST /interview/sessions/{id}/answer` |
| 11 | Data Integrity | All data valid | `GET /analysis/{id}` |

## Configuration

### Environment Variables

- `API_BASE_URL` - Your API Gateway URL (required)
- `TEST_EMAIL` - Test user email (required)
- `TEST_PASSWORD` - Test user password (required)
- `TEST_REPO_URL` - GitHub repository to analyze (default: facebook/react)

### Timeouts

Edit in `test-complete-flow.js`:

```javascript
const CONFIG = {
  STAGE1_TIMEOUT: 180000,  // 3 minutes
  STAGE2_TIMEOUT: 300000,  // 5 minutes
  STAGE3_TIMEOUT: 300000,  // 5 minutes
  POLL_INTERVAL: 5000,     // 5 seconds
};
```

## Expected Output

```
================================================================================
DevContext AI - Complete End-to-End Test Suite
================================================================================

[0.00s] ℹ️  API Base URL: https://your-api.execute-api...
[0.00s] ℹ️  Test Repository: https://github.com/facebook/react
[0.00s] ℹ️  Starting tests...

[0.12s] 🔄 TEST 1: User Authentication
[1.23s] ✅ Authentication successful! User ID: test-user-123

[2.34s] 🔄 TEST 2: Submit Analysis Request
[3.12s] ✅ Analysis submitted! ID: abc-123-def-456

[5.23s] 🔄 TEST 3: Waiting for Stage 1 (Project Review)
[15.68s] ✅ Stage 1 completed in 10.44s!

[... continues through all tests ...]

================================================================================
TEST SUMMARY
================================================================================

Total Test Duration: 452.34s
Analysis ID: abc-123-def-456
Session ID: session-789-xyz

📊 Stage Timings:
  Stage 1 (Project Review): 10.44s
  Stage 2 (Intelligence): 161.11s
  Stage 3 (Questions): 158.23s
  Answer Evaluation: 3.45s

✅ Test Results:
  ✓ auth: PASSED
  ✓ analyze: PASSED
  ✓ stage1: PASSED
  ✓ stage2: PASSED
  ✓ stage3: PASSED
  ✓ interview: PASSED
  ✓ evaluation: PASSED

Total: 7 passed, 0 failed

🎯 Answer Score: 72/100

================================================================================
🎉 ALL TESTS PASSED! 🎉
================================================================================
```

## Troubleshooting

### Authentication Issues

The current script uses mock authentication. To use real Cognito:

1. Install AWS SDK: `npm install @aws-sdk/client-cognito-identity-provider`
2. Replace the `testAuthentication()` function with actual Cognito calls

### Stage Timeouts

If stages are timing out:

1. Increase timeout values in CONFIG
2. Check CloudWatch logs for Lambda errors
3. Verify Bedrock model access

### Missing Data

If Stage 2 or Stage 3 data is missing:

1. Check that save functions are being called (see CRITICAL-FIXES-APPLIED.md)
2. Verify DynamoDB permissions
3. Check CloudWatch logs for save errors

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Run E2E Tests
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: node test-complete-flow.js
```

## Performance Benchmarks

Typical timings for facebook/react repository:

- Stage 1 (Project Review): 10-15 seconds
- Stage 2 (Intelligence Report): 2-3 minutes
- Stage 3 (Interview Questions): 2-3 minutes
- Answer Evaluation: 3-5 seconds

Total: ~5-7 minutes

## Cost Estimation

Per test run (using Meta Llama 3.3 70B):

- Stage 1: ~$0.38
- Stage 2: ~$0.42
- Stage 3: ~$0.45
- Answer Evaluation: ~$0.15

Total: ~$1.40 per complete test run

## Next Steps

1. Replace mock authentication with real Cognito
2. Add more test cases for edge cases
3. Add performance assertions
4. Add cost tracking validation
5. Create separate smoke test suite for quick validation
