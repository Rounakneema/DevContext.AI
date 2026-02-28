# DevContext AI - Documentation Index

## 📚 Documentation Overview

This directory contains all documentation for DevContext AI Schema V2 - a production-grade system for GitHub repository analysis and interview preparation.

## 🚀 Quick Start

1. **API Overview**: Start with [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md)
2. **Schema Design**: Read [../backend/SCHEMA-V2-README.md](../backend/SCHEMA-V2-README.md)
3. **Implementation**: Check [../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md](../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md)

## 📖 Documentation Files

### API Documentation

#### [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md) ⭐ **START HERE**
Complete API reference for Schema V2 including:
- 17 REST endpoints with examples
- Request/response schemas
- Error handling
- Pagination
- Rate limiting
- Migration guide from V1
- Testing instructions

#### [api-contract-v2.yaml](api-contract-v2.yaml)
OpenAPI 3.0 specification (partial - see summary for complete docs)

#### [api-contract.yaml](api-contract.yaml) *(Legacy V1)*
Original API contract - kept for reference

#### [../API-SCHEMA.md](../API-SCHEMA.md)
Quick reference guide with common endpoints

### Schema Documentation

#### [../backend/SCHEMA-V2-README.md](../backend/SCHEMA-V2-README.md) ⭐ **IMPORTANT**
Comprehensive schema documentation:
- 10 normalized entities
- Single table design patterns
- Database operations guide
- Performance optimizations
- Security & privacy
- Cost tracking
- Deployment guide

#### [../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md](../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md)
Implementation summary:
- Files created
- Key features
- Schema comparison (V1 vs V2)
- Usage examples
- Migration path

### Integration Guides

#### [cognito-react-integration.md](cognito-react-integration.md)
Frontend authentication setup:
- AWS Cognito configuration
- React integration
- Token management
- Protected routes

#### [cognito-setup-guide.md](cognito-setup-guide.md)
Backend authentication setup:
- Cognito User Pool creation
- App Client configuration
- Lambda authorizers
- Testing authentication

### Legacy Documentation

#### [API-CONTRACT-SUMMARY.md](API-CONTRACT-SUMMARY.md) *(V1)*
Original API contract summary

#### [websocket-protocol.md](websocket-protocol.md) *(Future)*
WebSocket protocol for real-time updates (planned)

#### [mock-api-responses.json](mock-api-responses.json) *(V1)*
Mock data for frontend development

#### [api-contract-checklist.md](api-contract-checklist.md) *(V1)*
API review checklist

#### [quick-reference.md](quick-reference.md) *(V1)*
Quick reference guide

## 🎯 Documentation by Role

### For Frontend Developers

1. **Start**: [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md)
2. **Authentication**: [cognito-react-integration.md](cognito-react-integration.md)
3. **Quick Reference**: [../API-SCHEMA.md](../API-SCHEMA.md)
4. **Testing**: Use test scripts in `backend/`

**Key Endpoints to Implement:**
- `POST /analyze` - Start analysis
- `GET /analyses` - List analyses (paginated)
- `GET /analysis/{id}` - Get results
- `GET /analysis/{id}/status` - Poll progress
- `POST /interview/sessions` - Create session
- `POST /interview/sessions/{id}/answer` - Submit answer
- `GET /user/progress` - Show progress

### For Backend Developers

1. **Start**: [../backend/SCHEMA-V2-README.md](../backend/SCHEMA-V2-README.md)
2. **Implementation**: [../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md](../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md)
3. **API Contract**: [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md)
4. **Database Utils**: `backend/src/db-utils.ts`
5. **Types**: `backend/src/types-v2.ts`

**Key Files to Use:**
- `backend/src/db-utils.ts` - Database operations
- `backend/src/types-v2.ts` - TypeScript types
- `backend/template-v2.yaml` - Infrastructure
- `backend/migrate-schema.js` - Migration script

### For DevOps/Infrastructure

1. **Infrastructure**: [../backend/SCHEMA-V2-README.md](../backend/SCHEMA-V2-README.md) (Deployment section)
2. **Template**: `backend/template-v2.yaml`
3. **Migration**: `backend/migrate-schema.js`
4. **Monitoring**: CloudWatch alarms in template

**Deployment Steps:**
```bash
cd backend
sam build
sam deploy --template-file template-v2.yaml
node migrate-schema.js --dry-run
node migrate-schema.js
```

### For Product Managers

1. **Overview**: [../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md](../SCHEMA-V2-IMPLEMENTATION-SUMMARY.md)
2. **API Capabilities**: [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md)
3. **Cost Tracking**: See "Cost Tracking" section in schema docs

**Key Features:**
- 10 analyses per day (free tier)
- Real-time progress tracking
- Interview session management
- User progress analytics
- Cost tracking per analysis
- Complete audit trail

## 🔄 Schema V2 vs V1

### What's New in V2

| Feature | V1 | V2 |
|---------|----|----|
| **Database Design** | 4 separate tables | 1 unified table (normalized) |
| **Entities** | 3 entities | 10 entities |
| **Pagination** | Offset-based | Cursor-based |
| **Cost Tracking** | ❌ None | ✅ Per-stage tracking |
| **Audit Log** | ❌ None | ✅ Complete event log |
| **File References** | Strings | Objects with line numbers |
| **Interview Flow** | Direct Q&A | Session-based |
| **User Progress** | ❌ None | ✅ Comprehensive tracking |
| **Company Matching** | ❌ None | ✅ 4-tier matching |
| **Grounding** | Basic | Confidence scores |

### Breaking Changes

1. **Response Structure**: Analysis data split into separate entities
2. **File References**: Now objects instead of strings
3. **Pagination**: Different cursor format
4. **Interview**: Session-based instead of direct

### Migration Guide

See [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md) - "Migration from V1" section

## 📊 Architecture Overview

```
┌─────────────┐
│   Frontend  │ (React + Cognito Auth)
└──────┬──────┘
       │ HTTPS + JWT
       ↓
┌─────────────────┐
│  API Gateway    │ (Cognito Authorizer)
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│  Orchestrator   │ (Lambda)
└──────┬──────────┘
       │
       ├─→ RepoProcessor (Lambda + GitHub API)
       ├─→ Stage1 (Lambda + Bedrock)
       ├─→ Stage2 (Lambda + Bedrock)
       └─→ Stage3 (Lambda + Bedrock)
       
       ↓
┌─────────────────┐
│   DynamoDB      │ (Single Table Design)
│   devcontext-   │
│   main          │
└─────────────────┘
       
       ↓
┌─────────────────┐
│   S3 Bucket     │ (Repository Cache)
└─────────────────┘
```

## 🔐 Security

- **Authentication**: AWS Cognito JWT tokens
- **Authorization**: User-scoped queries (row-level security)
- **Encryption**: KMS encryption at rest
- **Data Retention**: 90-day TTL
- **CORS**: Configured for web apps
- **Rate Limiting**: Per-tier quotas

## 💰 Cost Tracking

Every analysis tracks:
- Bedrock tokens (input/output)
- Bedrock cost (USD)
- Lambda cost (USD)
- Total cost (USD)

Average cost per analysis: **$0.10 - $0.15**

## 📈 Monitoring

- **CloudWatch Alarms**: Errors, throttles
- **Audit Logs**: Complete event trail
- **Cost Tracking**: Per-analysis breakdown
- **User Progress**: Analytics dashboard

## 🧪 Testing

### Get Authentication Token
```bash
node backend/get-token.js user@example.com password123
```

### Test API
```bash
export TOKEN="<your-token>"
curl -X POST https://api.devcontext.ai/prod/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/user/repo"}'
```

### Test Scripts
```bash
node backend/test-api.js           # Test all endpoints
node backend/check-dynamodb.js     # Check database
node backend/view-results.js <id>  # View results
```

## 🚀 Deployment

### Prerequisites
- AWS CLI configured
- SAM CLI installed
- Node.js 18+
- Cognito User Pool created

### Deploy Steps
```bash
# 1. Build
cd backend
npm install
npm run build

# 2. Deploy infrastructure
sam deploy --template-file template-v2.yaml

# 3. Migrate data (if upgrading from V1)
node migrate-schema.js --dry-run
node migrate-schema.js

# 4. Test
node test-api.js
```

## 📞 Support

- **Documentation Issues**: Create GitHub issue
- **API Questions**: See [API-CONTRACT-V2-SUMMARY.md](API-CONTRACT-V2-SUMMARY.md)
- **Schema Questions**: See [../backend/SCHEMA-V2-README.md](../backend/SCHEMA-V2-README.md)
- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions

## 📝 Contributing

When updating documentation:

1. **API Changes**: Update both `API-CONTRACT-V2-SUMMARY.md` and `api-contract-v2.yaml`
2. **Schema Changes**: Update `backend/SCHEMA-V2-README.md` and `backend/src/types-v2.ts`
3. **Breaking Changes**: Document in migration guide
4. **New Features**: Add examples to summary docs

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Normalized schema
- ✅ Cost tracking
- ✅ Audit logs
- ✅ User progress

### Phase 2 (Next)
- [ ] DynamoDB Streams
- [ ] ElastiCache integration
- [ ] WebSocket real-time updates
- [ ] Advanced analytics

### Phase 3 (Future)
- [ ] Multi-region replication
- [ ] Team/organization support
- [ ] ML-powered question generation
- [ ] Advanced security features

## 📚 Additional Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **DynamoDB Best Practices**: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- **API Gateway**: https://docs.aws.amazon.com/apigateway/
- **Cognito**: https://docs.aws.amazon.com/cognito/
- **Bedrock**: https://docs.aws.amazon.com/bedrock/

---

**Last Updated**: February 28, 2026
**Schema Version**: 2.0
**API Version**: 2.0
