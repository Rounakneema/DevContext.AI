import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import * as DB from './db-utils';
import { v4 as uuidv4 } from 'uuid';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const s3Client = new S3Client({});

const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// Using Amazon Nova 2 Lite (Global) - cost-effective for deep analysis
const MODEL_ID = 'global.amazon.nova-2-lite-v1:0';

interface Stage1Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
  codeContext?: string;
}

interface Stage1Response {
  success: boolean;
  analysisId: string;
  projectReview?: any;
  error?: string;
}

export const handler: Handler<Stage1Event, Stage1Response> = async (event) => {
  const { analysisId, projectContextMap, s3Key, codeContext } = event;
  
  try {
    console.log(`Starting Stage 1 analysis for: ${analysisId}`);
    
    // Use pre-loaded code context if available, otherwise load from S3
    const code = codeContext || await loadCodeContext(s3Key, projectContextMap);
    
    // CRITICAL: Fail if no code was loaded
    if (!code || code.length < 100) {
      throw new Error('Failed to load code context from S3. Cannot generate review without code.');
    }
    
    // Generate project review using enhanced industry-standard prompt
    const projectReview = await generateProjectReview(projectContextMap, code);
    
    // Validate grounding
    const groundingChecker = new GroundingChecker();
    const groundingResult = groundingChecker.validateProjectReview(projectReview, projectContextMap);
    
    console.log('Grounding validation:', groundingResult);
    console.log(groundingChecker.generateReport(groundingResult));
    
    if (groundingResult.confidence === 'insufficient') {
      console.warn('⚠️ Insufficient grounding detected. Invalid references:', groundingResult.invalidReferences);
    }
    
    // Save to DynamoDB
    await DB.saveProjectReview(analysisId, projectReview);
    
    console.log(`Stage 1 completed for: ${analysisId}`);
    
    return {
      success: true,
      analysisId,
      projectReview
    };
    
  } catch (error) {
    console.error('Stage 1 failed:', error);
    
    return {
      success: false,
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
  const filesToLoad = [
    ...contextMap.entryPoints.slice(0, 3),
    ...contextMap.coreModules.slice(0, 7)
  ].slice(0, 10);
  
  const fileContents: string[] = [];
  
  for (const file of filesToLoad) {
    try {
      const command = new GetObjectCommand({
        Bucket: CACHE_BUCKET,
        Key: `${s3KeyPrefix}${file}`
      });
      
      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();
      
      if (content) {
        const truncated = content.length > 5000 ? content.substring(0, 5000) + '\n... (truncated)' : content;
        fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
      }
    } catch (err: any) {
      if (err.Code === 'NoSuchKey') {
        console.warn(`File not found in S3: ${file}`);
      } else {
        console.error(`Error loading ${file}:`, err);
      }
    }
  }
  
  // CRITICAL: Throw error if no files loaded
  if (fileContents.length === 0) {
    throw new Error('No code files could be loaded from S3. Repository processing may have failed.');
  }
  
  return fileContents.join('\n\n');
}

async function generateProjectReview(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<any> {
  const prompt = `You are a Principal Software Engineer at a FAANG company conducting a comprehensive code review for hiring purposes. Your analysis will determine if this candidate gets an interview.

═══════════════════════════════════════════════════════════════════════════
REPOSITORY CONTEXT
═══════════════════════════════════════════════════════════════════════════
Total Files: ${contextMap.totalFiles}
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${contextMap.frameworks.join(', ') || 'None detected'}
Entry Points: ${contextMap.entryPoints.slice(0, 5).join(', ') || 'None'}
Core Modules: ${contextMap.coreModules.length} files

═══════════════════════════════════════════════════════════════════════════
CODE SAMPLE (User-Written Code)
═══════════════════════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════════════════════
ANALYSIS FRAMEWORK - USE INDUSTRY STANDARDS
═══════════════════════════════════════════════════════════════════════════

## 1. CODE QUALITY ASSESSMENT (0-100 scale)

Evaluate against industry benchmarks from Google's Code Review Guidelines, Microsoft's Engineering Practices, and Meta's Code Quality Standards.

### 1.1 READABILITY (0-100)
- Variable naming: descriptive, follows conventions (camelCase, snake_case, UPPER_CASE)
- Function/method naming: verb-based, clear intent
- Code organization: logical grouping, proper file structure
- Comments: necessary only, no obvious comments, explain "why" not "what"
- Consistent formatting: indentation, spacing, line breaks
- **Benchmark**: Google-level = 90+, Startup-level = 70-80, Beginner = <60

### 1.2 MAINTAINABILITY (0-100)
- DRY principle: no significant code duplication
- Function length: <50 lines ideal, <100 acceptable, >150 problematic
- File size: <500 lines ideal, <1000 acceptable
- Cyclomatic complexity: <10 ideal, <15 acceptable, >20 problematic
- Modularity: clear separation of concerns, single responsibility
- **Benchmark**: Production-grade = 85+, Acceptable = 70-84, Needs work = <70

### 1.3 TEST COVERAGE (0-100)
- Unit tests present: score heavily if absent
- Test quality: proper assertions, edge cases, mocking
- Integration tests: API/database interactions tested
- Test organization: mirrors source structure
- **Benchmark**: Google requires 80%+, Acceptable = 60%+, Poor = <40%

### 1.4 DOCUMENTATION (0-100)
- README exists and is comprehensive
- API documentation: endpoints, parameters, responses
- Code comments: complex logic explained
- Architecture docs: system design documented
- Setup instructions: clear, reproducible
- **Benchmark**: Open-source quality = 85+, Acceptable = 60-84, Poor = <60

### 1.5 ERROR HANDLING (0-100)
- Try-catch blocks: proper exception handling
- Error messages: descriptive, actionable
- Graceful degradation: fallbacks for failures
- Logging: structured, appropriate levels
- Input validation: all user inputs validated
- **Benchmark**: Production-ready = 85+, Acceptable = 65-84, Risky = <65

### 1.6 SECURITY (0-100)
- OWASP Top 10 compliance:
  * SQL Injection: parameterized queries used
  * XSS: output sanitization
  * CSRF: tokens implemented for state-changing operations
  * Authentication: proper password hashing (bcrypt, argon2)
  * Authorization: role-based access control
  * Sensitive data: no secrets in code, environment variables used
- **Benchmark**: Enterprise-grade = 85+, Acceptable = 70-84, Vulnerable = <70

### 1.7 PERFORMANCE (0-100)
- Algorithm complexity: appropriate data structures, O(n) vs O(n²)
- Database queries: indexed, no N+1 problems
- Caching: used where appropriate
- Lazy loading: resources loaded on-demand
- Memory leaks: proper cleanup, no circular references
- **Benchmark**: Optimized = 85+, Acceptable = 65-84, Inefficient = <65

### 1.8 BEST PRACTICES (0-100)
- Language idioms: follows community standards (PEP 8, Airbnb style, etc.)
- Design patterns: appropriate use of patterns (no over-engineering)
- Dependency management: proper version locking
- Git practices: meaningful commits, .gitignore proper
- Configuration: environment-based, not hardcoded
- **Benchmark**: Professional = 85+, Learning = 65-84, Beginner = <65

**CRITICAL**: Reference specific files and line numbers for ALL claims.

═══════════════════════════════════════════════════════════════════════════
## 2. ARCHITECTURE QUALITY (0-100 scale)
═══════════════════════════════════════════════════════════════════════════

### 2.1 COMPONENT ORGANIZATION
- Layered architecture: presentation, business logic, data access separated
- Cohesion: related functionality grouped
- Coupling: minimal dependencies between components
- **Score based on**: Clear layers = 90+, Some separation = 70-89, Monolithic = <70

### 2.2 DESIGN PATTERNS USAGE
Identify patterns used (with file references):
- Creational: Singleton, Factory, Builder
- Structural: Adapter, Decorator, Facade
- Behavioral: Observer, Strategy, Command
**Score**: Appropriate use = 90+, Over-engineered = 60-70, No patterns = <60

### 2.3 ANTI-PATTERNS DETECTED
Flag any of these with severity:
- God Object: class doing too much
- Spaghetti Code: tangled dependencies
- Golden Hammer: one solution for everything
- Copy-Paste Programming: duplicated code
- Hard Coding: magic numbers, strings in code

═══════════════════════════════════════════════════════════════════════════
## 3. EMPLOYABILITY SIGNAL (0-100 scale)
═══════════════════════════════════════════════════════════════════════════

### 3.1 PRODUCTION READINESS
- Deployment ready: Docker, CI/CD, environment configs
- Monitoring: logging, metrics, error tracking
- Testing: comprehensive test suite
- Documentation: onboarding possible
- **Score**: Production-ready = 85+, MVP-ready = 65-84, Prototype = <65

### 3.2 PROFESSIONAL STANDARDS
- Code review ready: clear, reviewable code
- Collaboration: team-friendly structure
- Industry practices: follows modern standards
- Scalability awareness: growth considered
- **Score**: Senior-level = 85+, Mid-level = 65-84, Junior = <65

### 3.3 COMPLEXITY LEVEL
Classify as: trivial, simple, moderate, complex, advanced
- trivial: Todo app, calculator
- simple: CRUD API, basic dashboard
- moderate: E-commerce, social media MVP
- complex: Real-time systems, distributed architecture
- advanced: High-scale systems, novel algorithms

### 3.4 COMPANY TIER MATCH (0-100 each)
Calibrate against actual hiring bars:
- **BigTech (FAANG)**: Google/Meta/Amazon standards
  * Requires: 85+ code quality, proper architecture, testing, documentation
  * Scalability awareness, production readiness
  * Typical bar: 75-100 = interview, <75 = reject
  
- **Product Companies**: Startups unicorns, mid-size tech
  * Requires: 70+ code quality, decent architecture, some testing
  * MVP-ready, growth potential
  * Typical bar: 65-100 = interview, <65 = reject
  
- **Startups**: Early-stage, fast-moving
  * Requires: 60+ code quality, working product, any testing
  * Scrappy but functional
  * Typical bar: 60-100 = interview, <60 = maybe
  
- **Service Companies**: Agencies, outsourcing
  * Requires: 50+ code quality, follows templates
  * Gets job done, maintainable
  * Typical bar: 50-100 = interview, <50 = junior only

═══════════════════════════════════════════════════════════════════════════
## 4. CRITICAL ISSUES (Security/Performance/Reliability)
═══════════════════════════════════════════════════════════════════════════

For EACH critical issue found:
1. Category: security / performance / reliability / maintainability
2. Severity: critical (blocks production) / high (risky) / medium (tech debt)
3. Description: what is wrong
4. Location: exact file and line numbers
5. Impact: what could happen
6. Remediation:
   - Priority (1-5, where 1 = fix immediately)
   - Effort (low: <1 hour, medium: 1-4 hours, high: 1+ days)
   - Step-by-step fix
   - Code example of correct implementation
   - Resources: links to OWASP, documentation

═══════════════════════════════════════════════════════════════════════════
## 5. PROJECT AUTHENTICITY (0-100 scale)
═══════════════════════════════════════════════════════════════════════════

Assess if this is genuinely the candidate's work:
- Code style consistency: similar patterns across files
- Commit pattern: gradual development vs bulk upload
- Comment style: consistent voice
- Complexity progression: builds up over time
- **Red flags**: 
  * Single commit with complete codebase
  * Drastically different coding styles
  * Professional-level code but no tests
  * Copy-paste from tutorials (check common patterns)

═══════════════════════════════════════════════════════════════════════════
RESPONSE FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════════════════

{
  "codeQuality": {
    "overall": 78,
    "readability": 82,
    "maintainability": 75,
    "testCoverage": 0,
    "documentation": 65,
    "errorHandling": 70,
    "security": 60,
    "performance": 85,
    "bestPractices": 78,
    "justification": "Clean code with good naming conventions. Lacks test coverage (0%). Security concerns with input validation. Performance is solid with appropriate data structures. Follows most JavaScript best practices but missing ESLint configuration."
  },
  "architectureClarity": {
    "score": 72,
    "componentOrganization": "Three-tier architecture with React frontend, Express API, and PostgreSQL. Separation is present but could be improved - business logic leaks into controllers.",
    "separationOfConcerns": "Moderate. Routes handle both validation and business logic. Recommend extracting to service layer.",
    "designPatterns": [
      {
        "name": "MVC",
        "implementation": "Partial - has models and controllers but views are in separate React app",
        "fileReferences": [{"file": "src/controllers/userController.js"}, {"file": "src/models/User.js"}]
      },
      {
        "name": "Repository Pattern",
        "implementation": "Models act as repositories for database access",
        "fileReferences": [{"file": "src/models/User.js", "lineStart": 15, "lineEnd": 45}]
      }
    ],
    "antiPatterns": [
      {
        "name": "God Object",
        "severity": "medium",
        "description": "UserController handles too many responsibilities - authentication, CRUD, validation",
        "fileReferences": [{"file": "src/controllers/userController.js"}]
      }
    ]
  },
  "employabilitySignal": {
    "overall": 68,
    "productionReadiness": 55,
    "professionalStandards": 72,
    "complexity": "moderate",
    "companyTierMatch": {
      "bigTech": 45,
      "productCompanies": 68,
      "startups": 82,
      "serviceCompanies": 88
    },
    "justification": "Solid fundamentals but not production-ready. Missing tests, incomplete error handling, no CI/CD. Code quality suggests mid-level developer. Best fit for startup or product company willing to mentor. Would likely be rejected at BigTech due to missing tests and security gaps. Service companies would hire for mid-level positions."
  },
  "strengths": [
    {
      "strengthId": "uuid-1",
      "pattern": "Clean API Design",
      "description": "RESTful endpoints follow best practices. Proper HTTP verbs, status codes, and error responses. Routes are well-organized and intuitive.",
      "impact": "high",
      "fileReferences": [
        {"file": "src/routes/api.js", "lineStart": 15, "lineEnd": 45, "snippet": "router.post('/users', validateUser, createUser);"},
        {"file": "src/controllers/userController.js", "lineStart": 23, "lineEnd": 35}
      ],
      "groundingConfidence": "verified"
    },
    {
      "strengthId": "uuid-2",
      "pattern": "Proper Database Schema",
      "description": "PostgreSQL schema is well-normalized (3NF), uses appropriate data types, and includes indexes on foreign keys.",
      "impact": "high",
      "fileReferences": [
        {"file": "db/schema.sql", "lineStart": 1, "lineEnd": 50}
      ],
      "groundingConfidence": "verified"
    },
    {
      "strengthId": "uuid-3",
      "pattern": "JWT Authentication",
      "description": "Implements stateless authentication with JWT tokens. Proper password hashing with bcrypt (12 rounds). Tokens expire after 24 hours.",
      "impact": "high",
      "fileReferences": [
        {"file": "src/middleware/auth.js", "lineStart": 10, "lineEnd": 35}
      ],
      "groundingConfidence": "verified"
    }
  ],
  "weaknesses": [
    {
      "weaknessId": "uuid-4",
      "issue": "Zero Test Coverage",
      "severity": "high",
      "impact": "Cannot verify correctness, regression risk, not production-ready. This alone would block hiring at most professional organizations.",
      "category": "quality",
      "fileReferences": []
    },
    {
      "weaknessId": "uuid-5",
      "issue": "Missing Input Validation",
      "severity": "high",
      "impact": "Security vulnerability - potential SQL injection, XSS, or data corruption from malformed inputs.",
      "category": "security",
      "fileReferences": [
        {"file": "src/routes/api.js", "lineStart": 23}
      ]
    }
  ],
  "criticalIssues": [
    {
      "issueId": "uuid-6",
      "category": "security",
      "title": "SQL Injection Vulnerability",
      "description": "User input is directly concatenated into SQL queries without parameterization or sanitization.",
      "severity": "critical",
      "cwe": "CWE-89",
      "cvssScore": 9.8,
      "remediation": {
        "priority": 1,
        "effort": "low",
        "estimatedHours": 2,
        "actionableSuggestion": "Use parameterized queries for all database operations. Never concatenate user input into SQL strings.",
        "codeExample": "// VULNERABLE\nconst query = \\`SELECT * FROM users WHERE email = '\\${userEmail}'\\`;\n\n// SECURE\nconst query = 'SELECT * FROM users WHERE email = $1';\nconst result = await pool.query(query, [userEmail]);",
        "resources": [
          "https://owasp.org/www-community/attacks/SQL_Injection",
          "https://node-postgres.com/features/queries#parameterized-query"
        ]
      },
      "fileReferences": [
        {"file": "src/models/User.js", "lineStart": 34, "lineEnd": 36, "snippet": "const query = \\`SELECT * FROM users WHERE email = '\\${email}'\\`;"}
      ],
      "affectedEndpoints": ["/api/users/login", "/api/users/search"]
    }
  ],
  "improvementAreas": [
    {
      "areaId": "uuid-7",
      "issue": "Add Comprehensive Test Suite",
      "priority": "critical",
      "estimatedImpact": "high",
      "estimatedEffort": "high",
      "category": "quality",
      "actionableSuggestion": "Implement unit tests with Jest and integration tests with Supertest. Aim for 70%+ coverage. Start with critical paths (authentication, payment processing).",
      "codeExample": "// tests/auth.test.js\nconst request = require('supertest');\nconst app = require('../src/app');\n\ndescribe('POST /api/auth/login', () => {\n  it('should return token for valid credentials', async () => {\n    const res = await request(app)\n      .post('/api/auth/login')\n      .send({ email: 'test@example.com', password: 'password123' });\n    expect(res.status).toBe(200);\n    expect(res.body).toHaveProperty('token');\n  });\n});",
      "fileReferences": []
    },
    {
      "areaId": "uuid-8",
      "issue": "Implement Rate Limiting",
      "priority": "high",
      "estimatedImpact": "high",
      "estimatedEffort": "low",
      "category": "security",
      "actionableSuggestion": "Add express-rate-limit to prevent brute force attacks on authentication endpoints.",
      "codeExample": "const rateLimit = require('express-rate-limit');\n\nconst authLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 5, // 5 requests per window\n  message: 'Too many login attempts, please try again later'\n});\n\napp.post('/api/auth/login', authLimiter, loginHandler);",
      "fileReferences": [{"file": "src/app.js"}]
    }
  ],
  "projectAuthenticity": {
    "score": 85,
    "confidence": "high",
    "signals": {
      "commitDiversity": 85,
      "timeSpread": 80,
      "messageQuality": 85,
      "codeEvolution": 90
    },
    "warnings": [],
    "assessment": "Genuine work. Code shows consistent style and gradual development. Commit history spans 3 months with regular updates. No red flags detected."
  },
  "modelMetadata": {
    "modelId": "${MODEL_ID}",
    "tokensIn": 0,
    "tokensOut": 0,
    "inferenceTimeMs": 0,
    "temperature": 0.3
  },
  "generatedAt": "${new Date().toISOString()}"
}`;

  const requestBody = {
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }]
      }
    ],
    inferenceConfig: {
      max_new_tokens: 4000,
      temperature: 0.3
    }
  };
  
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  });
  
  const startTime = Date.now();
  const response = await bedrockClient.send(command);
  const inferenceTimeMs = Date.now() - startTime;
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  const content = responseBody.output?.message?.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Bedrock response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Add UUIDs where missing
  if (parsed.strengths) {
    parsed.strengths = parsed.strengths.map((s: any) => ({
      ...s,
      strengthId: s.strengthId || uuidv4()
    }));
  }
  
  if (parsed.weaknesses) {
    parsed.weaknesses = parsed.weaknesses.map((w: any) => ({
      ...w,
      weaknessId: w.weaknessId || uuidv4()
    }));
  }
  
  if (parsed.criticalIssues) {
    parsed.criticalIssues = parsed.criticalIssues.map((c: any) => ({
      ...c,
      issueId: c.issueId || uuidv4()
    }));
  }
  
  if (parsed.improvementAreas) {
    parsed.improvementAreas = parsed.improvementAreas.map((a: any) => ({
      ...a,
      areaId: a.areaId || uuidv4()
    }));
  }
  
  // Add metadata
  parsed.modelMetadata = {
    modelId: MODEL_ID,
    tokensIn: requestBody.inferenceConfig.max_new_tokens,
    tokensOut: Math.ceil(content.length / 4),
    inferenceTimeMs,
    temperature: requestBody.inferenceConfig.temperature
  };
  
  parsed.generatedAt = new Date().toISOString();
  
  return parsed;
}
