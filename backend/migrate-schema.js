/**
 * Migration Script: Old Schema → Production-Grade Normalized Schema
 * 
 * This script migrates data from the old single-table design to the new normalized schema.
 * 
 * Usage:
 *   node migrate-schema.js [--dry-run] [--batch-size=10]
 * 
 * Options:
 *   --dry-run: Preview changes without writing to database
 *   --batch-size: Number of items to process per batch (default: 10)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { createHash } = require('crypto');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-1' }));

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 10;

const OLD_TABLE = 'devcontext-analyses';
const NEW_TABLE = 'devcontext-main';

console.log('='.repeat(80));
console.log('DevContext AI Schema Migration');
console.log('='.repeat(80));
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
console.log(`Batch Size: ${batchSize}`);
console.log(`Source Table: ${OLD_TABLE}`);
console.log(`Target Table: ${NEW_TABLE}`);
console.log('='.repeat(80));
console.log('');

async function migrateAnalysis(oldAnalysis) {
  const analysisId = oldAnalysis.analysisId;
  const userId = oldAnalysis.userId || 'demo-user';
  const createdAt = oldAnalysis.createdAt;
  const repositoryUrl = oldAnalysis.repositoryUrl;
  
  // Generate keys
  const repoHash = createHash('sha256').update(repositoryUrl).digest('hex').substring(0, 16);
  
  const items = [];
  
  // 1. Analysis Metadata
  items.push({
    PK: `ANALYSIS#${analysisId}`,
    SK: 'METADATA',
    GSI1PK: `USER#${userId}`,
    GSI1SK: `ANALYSIS#${createdAt}`,
    GSI2PK: `REPO#${repoHash}`,
    GSI2SK: `ANALYSIS#${createdAt}`,
    analysisId,
    userId,
    repositoryUrl,
    repositoryName: oldAnalysis.repositoryName,
    status: oldAnalysis.status === 'processing' ? 'processing' : oldAnalysis.status === 'completed' ? 'completed' : 'failed',
    createdAt,
    updatedAt: oldAnalysis.updatedAt,
    completedAt: oldAnalysis.status === 'completed' ? oldAnalysis.updatedAt : undefined,
    version: 1,
    stages: {
      project_review: {
        status: oldAnalysis.completedStages?.includes('project_review') ? 'completed' : 'pending'
      },
      intelligence_report: {
        status: oldAnalysis.completedStages?.includes('intelligence_report') ? 'completed' : 'pending'
      },
      interview_simulation: {
        status: oldAnalysis.completedStages?.includes('interview_simulation') ? 'completed' : 'pending'
      }
    },
    cost: {
      bedrockTokensIn: 0,
      bedrockTokensOut: 0,
      bedrockCostUsd: 0,
      lambdaCostUsd: 0,
      totalCostUsd: 0
    },
    errorMessage: oldAnalysis.errorMessage,
    retryCount: 0,
    ttl: oldAnalysis.ttl
  });
  
  // 2. Project Review (if exists)
  if (oldAnalysis.projectReview) {
    const review = oldAnalysis.projectReview;
    
    items.push({
      PK: `ANALYSIS#${analysisId}`,
      SK: 'PROJECT_REVIEW',
      codeQuality: {
        overall: review.codeQuality?.score || 0,
        readability: review.codeQuality?.readability || 0,
        maintainability: review.codeQuality?.maintainability || 0,
        testCoverage: 0,
        documentation: 0,
        errorHandling: 0,
        security: 0,
        performance: 0,
        justification: review.codeQuality?.justification || ''
      },
      architectureClarity: {
        score: 0,
        componentOrganization: '',
        separationOfConcerns: '',
        designPatterns: [],
        antiPatterns: []
      },
      employabilitySignal: {
        overall: review.employabilitySignal?.score || 0,
        productionReadiness: 0,
        professionalStandards: 0,
        complexity: 'moderate',
        companyTierMatch: {
          bigTech: 0,
          productCompanies: 0,
          startups: 0,
          serviceCompanies: 0
        },
        justification: review.employabilitySignal?.justification || ''
      },
      strengths: (review.strengths || []).map((s, idx) => ({
        strengthId: `strength-${idx}`,
        pattern: s.pattern || '',
        description: s.description || '',
        impact: 'medium',
        fileReferences: (s.fileReferences || []).map(f => ({ file: f })),
        groundingConfidence: 'inferred'
      })),
      weaknesses: (review.improvementAreas || []).map((w, idx) => ({
        weaknessId: `weakness-${idx}`,
        issue: w.issue || '',
        severity: w.priority || 'medium',
        impact: w.actionableSuggestion || '',
        fileReferences: []
      })),
      criticalIssues: [],
      projectAuthenticity: {
        score: review.projectAuthenticity?.score || 0,
        confidence: 'medium',
        signals: {
          commitDiversity: 0,
          timeSpread: 0,
          messageQuality: 0,
          codeEvolution: 0
        },
        warnings: review.projectAuthenticity?.warning ? [review.projectAuthenticity.warning] : []
      },
      modelMetadata: {
        modelId: 'global.amazon.nova-2-lite-v1:0',
        tokensIn: 0,
        tokensOut: 0,
        inferenceTimeMs: 0,
        temperature: 0.7
      },
      generatedAt: oldAnalysis.updatedAt
    });
  }
  
  // 3. Intelligence Report (if exists)
  if (oldAnalysis.intelligenceReport) {
    const report = oldAnalysis.intelligenceReport;
    
    items.push({
      PK: `ANALYSIS#${analysisId}`,
      SK: 'INTELLIGENCE_REPORT',
      systemArchitecture: {
        overview: report.architectureOverview?.description || '',
        layers: [],
        componentDiagram: '',
        dataFlowDiagram: report.architectureOverview?.dataFlow || '',
        architecturalPatterns: (report.architectureOverview?.patterns || []).map(p => ({
          name: p,
          description: '',
          implementation: '',
          fileReferences: []
        })),
        technologyStack: {
          languages: {},
          frameworks: [],
          databases: [],
          libraries: {},
          devTools: [],
          infrastructure: []
        }
      },
      designDecisions: (report.designDecisions || []).map((d, idx) => ({
        decisionId: `decision-${idx}`,
        title: d.decision || '',
        context: '',
        decision: d.decision || '',
        rationale: d.rationale || '',
        consequences: {
          positive: [],
          negative: [],
          mitigations: []
        },
        alternativesConsidered: [],
        fileReferences: (d.fileReferences || []).map(f => ({ file: f })),
        confidence: d.confidence || 'medium',
        groundingEvidence: []
      })),
      technicalTradeoffs: (report.technicalTradeoffs || []).map((t, idx) => ({
        tradeoffId: `tradeoff-${idx}`,
        aspect: t.tradeoff || '',
        chosenApproach: t.chosenApproach || '',
        tradeoffRationale: '',
        pros: t.pros || [],
        cons: t.cons || [],
        impact: {
          performance: 'neutral',
          maintainability: 'neutral',
          scalability: 'neutral',
          cost: 'neutral'
        },
        fileReferences: []
      })),
      scalabilityAnalysis: {
        currentCapacity: {
          estimatedUsers: 0,
          estimatedRPS: 0,
          dataVolumeGB: 0
        },
        bottlenecks: (report.scalabilityAnalysis?.bottlenecks || []).map((b, idx) => ({
          bottleneckId: `bottleneck-${idx}`,
          area: b.area || '',
          description: b.description || '',
          severity: b.severity || 'medium',
          estimatedImpact: '',
          fileReferences: (b.fileReferences || []).map(f => ({ file: f }))
        })),
        scalabilityLimitations: report.scalabilityAnalysis?.currentLimitations || [],
        recommendedImprovements: (report.scalabilityAnalysis?.recommendations || []).map((r, idx) => ({
          improvementId: `improvement-${idx}`,
          recommendation: r,
          impact: 'medium',
          effort: 'medium',
          priority: idx + 1,
          implementation: '',
          estimatedGain: ''
        })),
        architecturalConstraints: []
      },
      securityPosture: {
        overallScore: 0,
        vulnerabilities: [],
        bestPractices: {
          followed: [],
          missing: []
        },
        sensitiveDataHandling: '',
        authenticationMechanism: '',
        authorizationPattern: ''
      },
      resumeBullets: (report.resumeBullets || []).map((b, idx) => ({
        bulletId: `bullet-${idx}`,
        text: b,
        category: 'technical',
        keywords: [],
        verified: false
      })),
      groundingReport: {
        totalClaims: 0,
        verifiedClaims: 0,
        inferredClaims: 0,
        ungroundedClaims: 0,
        overallConfidence: 'medium',
        flaggedClaims: []
      },
      modelMetadata: {
        modelId: 'global.amazon.nova-2-lite-v1:0',
        tokensIn: 0,
        tokensOut: 0,
        inferenceTimeMs: 0,
        temperature: 0.7
      },
      generatedAt: oldAnalysis.updatedAt
    });
  }
  
  // 4. Interview Simulation (if exists)
  if (oldAnalysis.interviewSimulation) {
    const simulation = oldAnalysis.interviewSimulation;
    
    items.push({
      PK: `ANALYSIS#${analysisId}`,
      SK: 'INTERVIEW_SIMULATION',
      questions: (simulation.questions || []).map(q => ({
        questionId: q.questionId,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        context: {
          fileReferences: (q.fileReferences || []).map(f => ({ file: f })),
          codeSnippet: '',
          relatedConcepts: q.expectedTopics || []
        },
        expectedAnswer: {
          keyPoints: q.expectedTopics || [],
          acceptableApproaches: [],
          redFlags: []
        },
        followUpQuestions: [],
        evaluationCriteria: {
          technicalAccuracy: 0.4,
          completeness: 0.3,
          clarity: 0.2,
          depthOfUnderstanding: 0.1
        },
        tags: [],
        groundingValidation: {
          allFilesExist: true,
          confidence: 'inferred',
          validationErrors: []
        }
      })),
      categoryCounts: simulation.categoryCounts || {
        architecture: 0,
        implementation: 0,
        tradeoffs: 0,
        scalability: 0,
        designPatterns: 0,
        debugging: 0
      },
      difficultyDistribution: simulation.difficultyDistribution || {
        junior: 0,
        midLevel: 0,
        senior: 0,
        staff: 0
      },
      questionSetMetadata: {
        totalQuestions: simulation.questions?.length || 0,
        targetRole: 'Full Stack',
        companyTier: 'productCompany',
        estimatedInterviewDuration: 60
      },
      selfCorrectionReport: {
        iterations: 1,
        converged: true,
        initialScore: 0,
        finalScore: 0,
        correctionsFeedback: []
      },
      modelMetadata: {
        modelId: 'apac.amazon.nova-micro-v1:0',
        tokensIn: 0,
        tokensOut: 0,
        inferenceTimeMs: 0,
        temperature: 0.7
      },
      generatedAt: oldAnalysis.updatedAt
    });
  }
  
  return items;
}

async function migrate() {
  try {
    console.log('Step 1: Scanning old table...\n');
    
    // Scan old table
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: OLD_TABLE
    }));
    
    const oldAnalyses = scanResult.Items || [];
    console.log(`Found ${oldAnalyses.length} analyses to migrate\n`);
    
    if (oldAnalyses.length === 0) {
      console.log('No data to migrate. Exiting.');
      return;
    }
    
    console.log('Step 2: Transforming data...\n');
    
    let totalItems = 0;
    const allNewItems = [];
    
    for (const oldAnalysis of oldAnalyses) {
      const newItems = await migrateAnalysis(oldAnalysis);
      allNewItems.push(...newItems);
      totalItems += newItems.length;
      
      console.log(`  ✓ Migrated analysis ${oldAnalysis.analysisId} (${newItems.length} items)`);
    }
    
    console.log(`\nTotal items to write: ${totalItems}\n`);
    
    if (isDryRun) {
      console.log('DRY RUN MODE - Showing sample of transformed data:\n');
      console.log(JSON.stringify(allNewItems[0], null, 2));
      console.log('\n... and', allNewItems.length - 1, 'more items');
      console.log('\nNo changes were made to the database.');
      return;
    }
    
    console.log('Step 3: Writing to new table...\n');
    
    // Batch write to new table
    for (let i = 0; i < allNewItems.length; i += batchSize) {
      const batch = allNewItems.slice(i, i + batchSize);
      
      await dynamoClient.send(new BatchWriteCommand({
        RequestItems: {
          [NEW_TABLE]: batch.map(item => ({
            PutRequest: { Item: item }
          }))
        }
      }));
      
      console.log(`  ✓ Wrote batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Migration completed successfully!');
    console.log('='.repeat(80));
    console.log(`Total analyses migrated: ${oldAnalyses.length}`);
    console.log(`Total items written: ${totalItems}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
