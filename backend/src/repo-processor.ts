import { Handler } from 'aws-lambda';
import simpleGit from 'simple-git';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectContextMap } from './types';
import { TokenBudgetManager } from './token-budget-manager';

const s3Client = new S3Client({});
const CACHE_BUCKET = process.env.CACHE_BUCKET!;

// Exclusion patterns
const EXCLUDED_DIRS = [
  'node_modules', 'dist', 'build', '.git', '__pycache__', 
  'venv', 'env', '.venv', 'target', 'bin', 'obj', 'secrets'
];

const EXCLUDED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', 
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3',
  '.zip', '.tar', '.gz', '.pdf', '.exe', '.dll'
];

const EXCLUDED_FILES = [
  'package-lock.json', 'yarn.lock', 'poetry.lock', 
  'Pipfile.lock', '.DS_Store', '.env', '.pem', 
  'id_rsa', 'id_ed25519'
];

const SECURITY_PATTERNS = [
  /\.env/i, /\.pem$/, /\.key$/, /id_rsa/, /secrets\./i, /credentials\./i
];

interface ProcessorEvent {
  analysisId: string;
  repositoryUrl: string;
}

interface ProcessorResponse {
  success: boolean;
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
  codeContext?: string; // NEW: Pre-loaded code context within token budget
  budgetStats?: {
    utilization: number;
    filesIncluded: number;
    filesTruncated: number;
    filesSkipped: number;
  };
  error?: string;
}

export const handler: Handler<ProcessorEvent, ProcessorResponse> = async (event) => {
  const { analysisId, repositoryUrl } = event;
  const tmpDir = `/tmp/${analysisId}`;
  
  try {
    console.log(`Processing repository: ${repositoryUrl}`);
    
    // Clone repository
    const git = simpleGit();
    await git.clone(repositoryUrl, tmpDir, ['--depth', '1']);
    console.log('Repository cloned successfully');
    
    // Filter files
    const filteredFiles = await filterFiles(tmpDir);
    console.log(`Filtered ${filteredFiles.length} files`);
    
    // Generate project context map
    const projectContextMap = generateContextMap(filteredFiles, tmpDir);
    
    // NEW: Apply token budget management
    const tokenManager = new TokenBudgetManager();
    const priorities = tokenManager.prioritizeFiles(filteredFiles, projectContextMap, tmpDir);
    const allocation = tokenManager.selectFilesWithinBudget(priorities, tmpDir);
    const codeContext = await tokenManager.loadCodeContext(priorities, tmpDir);
    const budgetStats = tokenManager.getBudgetStats(allocation);
    
    console.log('Token Budget Stats:', budgetStats);
    
    // Upload filtered files to S3
    const s3Key = `repositories/${analysisId}/`;
    await uploadFilesToS3(filteredFiles, tmpDir, s3Key);
    console.log(`Uploaded files to S3: ${s3Key}`);
    
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    
    return {
      success: true,
      analysisId,
      projectContextMap,
      s3Key,
      codeContext,
      budgetStats
    };
    
  } catch (error) {
    console.error('Repository processing failed:', error);
    
    // Cleanup on error
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    
    return {
      success: false,
      analysisId,
      projectContextMap: {
        entryPoints: [],
        coreModules: [],
        frameworks: [],
        userCodeFiles: [],
        totalFiles: 0,
        totalSize: 0
      },
      s3Key: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

function filterFiles(rootDir: string): string[] {
  const files: string[] = [];
  
  function traverse(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);
      
      // Skip excluded directories
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.includes(entry.name)) continue;
        traverse(fullPath);
        continue;
      }
      
      // Skip excluded files
      if (EXCLUDED_FILES.includes(entry.name)) continue;
      
      // Skip excluded extensions
      const ext = path.extname(entry.name);
      if (EXCLUDED_EXTENSIONS.includes(ext)) continue;
      
      // Skip security-sensitive files
      if (SECURITY_PATTERNS.some(pattern => pattern.test(entry.name))) continue;
      
      // Skip minified files
      if (entry.name.includes('.min.') || entry.name.includes('.bundle.')) continue;
      
      files.push(relativePath);
    }
  }
  
  traverse(rootDir);
  return files;
}

function generateContextMap(files: string[], rootDir: string): ProjectContextMap {
  const entryPoints: string[] = [];
  const coreModules: string[] = [];
  const frameworks: string[] = [];
  const userCodeFiles: string[] = [];
  
  // Entry point patterns
  const entryPatterns = [
    'main.py', 'app.py', 'index.js', 'index.ts', 
    'App.tsx', 'App.jsx', 'server.js', 'server.ts',
    'main.java', 'Main.java'
  ];
  
  // Framework detection patterns
  const frameworkPatterns = {
    'package.json': ['react', 'express', 'next', 'vue', 'angular'],
    'requirements.txt': ['django', 'flask', 'fastapi'],
    'pom.xml': ['spring-boot', 'spring'],
    'build.gradle': ['spring-boot']
  };
  
  let totalSize = 0;
  
  for (const file of files) {
    const fileName = path.basename(file);
    const fullPath = path.join(rootDir, file);
    
    // Check if entry point
    if (entryPatterns.includes(fileName)) {
      entryPoints.push(file);
    }
    
    // Detect frameworks
    if (frameworkPatterns[fileName as keyof typeof frameworkPatterns]) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const patterns = frameworkPatterns[fileName as keyof typeof frameworkPatterns];
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            frameworks.push(pattern);
          }
        }
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
    
    // Categorize as user code (source files)
    const ext = path.extname(file);
    if (['.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs'].includes(ext)) {
      userCodeFiles.push(file);
      
      // Add to core modules if in src/ or app/ directory
      if (file.startsWith('src/') || file.startsWith('app/')) {
        coreModules.push(file);
      }
    }
    
    // Calculate size
    try {
      const stats = fs.statSync(fullPath);
      totalSize += stats.size;
    } catch (err) {
      console.error(`Error getting stats for ${file}:`, err);
    }
  }
  
  return {
    entryPoints,
    coreModules,
    frameworks: [...new Set(frameworks)],
    userCodeFiles,
    totalFiles: files.length,
    totalSize
  };
}

async function uploadFilesToS3(files: string[], rootDir: string, s3KeyPrefix: string): Promise<void> {
  const uploadPromises = files.map(async (file) => {
    const fullPath = path.join(rootDir, file);
    const content = fs.readFileSync(fullPath);
    
    const command = new PutObjectCommand({
      Bucket: CACHE_BUCKET,
      Key: `${s3KeyPrefix}${file}`,
      Body: content
    });
    
    await s3Client.send(command);
  });
  
  await Promise.all(uploadPromises);
}
