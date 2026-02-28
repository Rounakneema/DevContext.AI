import { Handler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ProjectContextMap } from './types';
import { TokenBudgetManager } from './token-budget-manager';

const s3Client = new S3Client({});
const CACHE_BUCKET = process.env.CACHE_BUCKET!;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional: for higher rate limits

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
  commitStats?: {
    totalCount: number;
    firstCommitDate: string;
    lastCommitDate: string;
    commitFrequency: number;
    contributors: number;
    authenticityScore: number;
    authenticityFlags: string[];
  };
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
  
  try {
    console.log(`Processing repository: ${repositoryUrl}`);
    
    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repositoryUrl);
    console.log(`Fetching ${owner}/${repo} via GitHub API`);
    
    // Fetch repository tree via GitHub API
    const files = await fetchRepositoryFiles(owner, repo);
    console.log(`Fetched ${files.length} files from GitHub API`);
    
    // Filter files
    const filteredFiles = filterFilesFromAPI(files);
    console.log(`Filtered to ${filteredFiles.length} files`);
    
    // Generate project context map
    const projectContextMap = generateContextMapFromAPI(filteredFiles);
    
    // Fetch commit stats
    const commitStats = await fetchCommitStats(owner, repo);
    
    // NEW: Apply token budget management
    const tokenManager = new TokenBudgetManager();
    
    // Create priority list without filesystem access
    const priorities = filteredFiles.map(file => {
      const tier = determineTierFromPath(file.path, projectContextMap);
      const priority = calculatePriorityFromPath(file.path, tier, projectContextMap);
      return {
        path: file.path,
        tier,
        priority,
        estimatedTokens: Math.ceil((file.size || 1000) / 4) // Estimate from file size
      };
    }).sort((a, b) => b.priority - a.priority);
    
    // Fetch file contents for prioritized files
    const fileContents = await fetchFileContents(owner, repo, priorities.slice(0, 30));
    
    // Upload to S3
    const s3Key = `repositories/${analysisId}/`;
    await uploadFilesToS3FromAPI(fileContents, s3Key);
    console.log(`Uploaded files to S3: ${s3Key}`);
    
    // Generate code context
    const codeContext = generateCodeContext(fileContents, priorities);
    const allocation = {
      selectedFiles: fileContents.map(f => f.path),
      totalTokens: tokenManager.estimateTokens(codeContext),
      truncatedFiles: [],
      skippedFiles: []
    };
    const budgetStats = tokenManager.getBudgetStats(allocation);
    
    console.log('Token Budget Stats:', budgetStats);
    
    return {
      success: true,
      analysisId,
      projectContextMap,
      s3Key,
      codeContext,
      commitStats: commitStats || undefined,
      budgetStats
    };
    
  } catch (error) {
    console.error('Repository processing failed:', error);
    
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

// GitHub API Helper Functions

async function fetchCommitStats(owner: string, repo: string): Promise<any> {
  try {
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DevContext-AI'
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    
    // Fetch commits (last 100)
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
    const commitsResponse = await fetch(commitsUrl, { headers });
    
    if (!commitsResponse.ok) {
      console.warn(`Failed to fetch commits: ${commitsResponse.status}`);
      return null;
    }
    
    const commits = await commitsResponse.json();
    
    if (!Array.isArray(commits) || commits.length === 0) {
      return null;
    }
    
    // Extract commit data
    const commitDates = commits.map(c => new Date(c.commit.author.date));
    const contributors = new Set(commits.map(c => c.commit.author.email)).size;
    
    const firstCommit = commitDates[commitDates.length - 1];
    const lastCommit = commitDates[0];
    const daysDiff = (lastCommit.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24);
    const commitFrequency = daysDiff > 0 ? commits.length / daysDiff : 0;
    
    // Calculate authenticity score
    let authenticityScore = 100;
    const authenticityFlags: string[] = [];
    
    // Check for bulk uploads (< 3 commits)
    if (commits.length < 3) {
      authenticityScore -= 50;
      authenticityFlags.push('Very few commits detected');
    }
    
    // Check for commit diversity (same author for all commits)
    if (contributors === 1 && commits.length > 10) {
      authenticityScore -= 20;
      authenticityFlags.push('Single contributor');
    }
    
    // Check for time spread (all commits in same day)
    const uniqueDays = new Set(commitDates.map(d => d.toDateString())).size;
    if (uniqueDays < 2 && commits.length > 5) {
      authenticityScore -= 30;
      authenticityFlags.push('All commits in short time period');
    }
    
    return {
      totalCount: commits.length,
      firstCommitDate: firstCommit.toISOString(),
      lastCommitDate: lastCommit.toISOString(),
      commitFrequency: Math.round(commitFrequency * 100) / 100,
      contributors,
      authenticityScore: Math.max(0, authenticityScore),
      authenticityFlags
    };
  } catch (error) {
    console.error('Failed to fetch commit stats:', error);
    return null;
  }
}

function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }
  return { owner: match[1], repo: match[2] };
}

async function fetchRepositoryFiles(owner: string, repo: string): Promise<any[]> {
  try {
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DevContext-AI'
    };
    
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    
    const data: any = await response.json();
    return data.tree.filter((item: any) => item.type === 'blob');
  } catch (error) {
    console.error('GitHub API error:', error);
    throw new Error(`Failed to fetch repository: ${error}`);
  }
}

function filterFilesFromAPI(files: any[]): any[] {
  return files.filter((file: any) => {
    const path = file.path;
    
    // Check excluded directories
    if (EXCLUDED_DIRS.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) {
      return false;
    }
    
    // Check excluded extensions
    if (EXCLUDED_EXTENSIONS.some(ext => path.endsWith(ext))) {
      return false;
    }
    
    // Check excluded files
    const fileName = path.split('/').pop();
    if (EXCLUDED_FILES.includes(fileName)) {
      return false;
    }
    
    // Check security patterns
    if (SECURITY_PATTERNS.some(pattern => pattern.test(path))) {
      return false;
    }
    
    return true;
  });
}

function generateContextMapFromAPI(files: any[]): ProjectContextMap {
  const userCodeFiles = files.map(f => f.path);
  const entryPoints: string[] = [];
  const coreModules: string[] = [];
  const frameworks: string[] = [];
  const languages: Record<string, number> = {};
  
  // Detect languages by file extensions
  files.forEach(file => {
    const ext = file.path.split('.').pop()?.toLowerCase();
    if (ext) {
      const languageMap: Record<string, string> = {
        'js': 'JavaScript',
        'jsx': 'JavaScript',
        'ts': 'TypeScript',
        'tsx': 'TypeScript',
        'py': 'Python',
        'java': 'Java',
        'go': 'Go',
        'rs': 'Rust',
        'cpp': 'C++',
        'c': 'C',
        'cs': 'C#',
        'rb': 'Ruby',
        'php': 'PHP',
        'swift': 'Swift',
        'kt': 'Kotlin',
        'scala': 'Scala',
        'html': 'HTML',
        'css': 'CSS',
        'scss': 'SCSS',
        'sql': 'SQL'
      };
      
      const language = languageMap[ext];
      if (language) {
        languages[language] = (languages[language] || 0) + 1;
      }
    }
  });
  
  // Convert counts to percentages
  const totalLanguageFiles = Object.values(languages).reduce((sum, count) => sum + count, 0);
  const languagePercentages: Record<string, number> = {};
  Object.entries(languages).forEach(([lang, count]) => {
    languagePercentages[lang] = Math.round((count / totalLanguageFiles) * 100);
  });
  
  // Detect entry points
  const entryPatterns = [
    'main.', 'index.', 'app.', 'server.', '__init__.py',
    'Program.cs', 'Main.java', 'main.go'
  ];
  
  files.forEach(file => {
    const fileName = file.path.split('/').pop();
    if (entryPatterns.some(pattern => fileName.startsWith(pattern))) {
      entryPoints.push(file.path);
    }
  });
  
  // Detect frameworks
  const frameworkFiles = files.map(f => f.path);
  if (frameworkFiles.some(f => f.includes('package.json'))) {
    frameworks.push('Node.js');
  }
  if (frameworkFiles.some(f => f.includes('requirements.txt') || f.includes('setup.py'))) {
    frameworks.push('Python');
  }
  if (frameworkFiles.some(f => f.includes('pom.xml') || f.includes('build.gradle'))) {
    frameworks.push('Java');
  }
  if (frameworkFiles.some(f => f.includes('go.mod'))) {
    frameworks.push('Go');
  }
  
  // Identify core modules (files in src/, lib/, core/)
  files.forEach(file => {
    if (file.path.match(/^(src|lib|core)\//)) {
      coreModules.push(file.path);
    }
  });
  
  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
    userCodeFiles,
    entryPoints,
    coreModules,
    frameworks,
    languages: languagePercentages
  };
}

async function fetchFileContents(owner: string, repo: string, priorities: any[]): Promise<any[]> {
  const contents: any[] = [];
  const headers: any = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DevContext-AI'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  // Fetch top priority files (limit to avoid rate limits)
  const filesToFetch = priorities.slice(0, 30);
  
  for (let i = 0; i < filesToFetch.length; i++) {
    const priority = filesToFetch[i];
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${priority.path}`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
          const rateLimitReset = response.headers.get('X-RateLimit-Reset');
          
          if (rateLimitRemaining === '0') {
            console.warn(`GitHub rate limit exceeded. Limit resets at ${rateLimitReset}`);
            break; // Stop fetching files
          }
        }
        
        console.error(`Failed to fetch ${priority.path}: ${response.status}`);
        continue;
      }
      
      const data: any = await response.json();
      
      if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        contents.push({
          path: priority.path,
          content,
          size: data.size
        });
      }
      
      // Add delay every 10 requests to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to fetch ${priority.path}:`, error);
    }
  }
  
  return contents;
}

async function uploadFilesToS3FromAPI(files: any[], s3KeyPrefix: string): Promise<void> {
  for (const file of files) {
    const command = new PutObjectCommand({
      Bucket: CACHE_BUCKET,
      Key: `${s3KeyPrefix}${file.path}`,
      Body: file.content,
      ContentType: 'text/plain'
    });
    
    await s3Client.send(command);
  }
}

function generateCodeContext(files: any[], priorities: any[]): string {
  const contextParts: string[] = [];
  
  files.forEach(file => {
    const truncated = file.content.length > 5000 
      ? file.content.substring(0, 5000) + '\n... (truncated)'
      : file.content;
    
    contextParts.push(`\n--- File: ${file.path} ---\n${truncated}`);
  });
  
  return contextParts.join('\n\n');
}

// Helper functions for prioritization without filesystem
function determineTierFromPath(filePath: string, contextMap: ProjectContextMap): 1 | 2 | 3 | 4 {
  const fileName = filePath.split('/').pop() || '';
  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
  
  // Tier 1: Entry points and core modules
  if (contextMap.entryPoints.includes(filePath) || contextMap.coreModules.includes(filePath)) {
    return 1;
  }
  
  const entryPatterns = ['main.', 'index.', 'app.', 'server.', 'App.', 'Main.', 'Program.'];
  if (entryPatterns.some(p => fileName.startsWith(p))) {
    return 1;
  }
  
  // Tier 2: API routes, controllers, services
  if (filePath.match(/\/(routes?|controllers?|services?|api|handlers?|endpoints?)\//i)) {
    return 2;
  }
  
  // Tier 3: Utilities, configs
  if (filePath.match(/\/(utils?|helpers?|lib|common|config|constants?)\//i)) {
    return 3;
  }
  
  if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) {
    return 3;
  }
  
  // Tier 4: Tests, generated files
  if (fileName.match(/\.(test|spec|min|generated)\./)) {
    return 4;
  }
  
  // Default: Tier 2 for source files
  const sourceExtensions = ['.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.cs'];
  return sourceExtensions.includes(ext) ? 2 : 3;
}

function calculatePriorityFromPath(filePath: string, tier: number, contextMap: ProjectContextMap): number {
  let priority = (5 - tier) * 250;
  
  if (contextMap.entryPoints.includes(filePath)) priority += 500;
  if (contextMap.coreModules.includes(filePath)) priority += 300;
  if (contextMap.userCodeFiles.includes(filePath)) priority += 200;
  
  const depth = filePath.split('/').length;
  priority += Math.max(0, 50 - (depth * 10));
  
  const fileName = filePath.split('/').pop() || '';
  if (fileName.match(/^(main|app|index|server)\./i)) priority += 400;
  
  return priority;
}
