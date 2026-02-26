/**
 * Token Budget Manager
 * 
 * Manages token allocation for Bedrock API calls to stay within 50K token limit.
 * Implements intelligent file prioritization and truncation.
 * 
 * Budget Allocation:
 * - Structure: 5K tokens (project context, file list)
 * - User Code: 35K tokens (actual source code)
 * - Context: 10K tokens (framework detection, dependencies)
 */

import { ProjectContextMap } from './types';
import * as fs from 'fs';
import * as path from 'path';

export interface TokenBudget {
  maxTokens: number;
  structureTokens: number;
  userCodeTokens: number;
  contextTokens: number;
}

export interface FilePriority {
  file: string;
  tier: 1 | 2 | 3 | 4;
  estimatedTokens: number;
  priority: number; // Higher = more important
}

export interface BudgetAllocation {
  selectedFiles: string[];
  totalTokens: number;
  truncatedFiles: string[];
  skippedFiles: string[];
}

export class TokenBudgetManager {
  private budget: TokenBudget = {
    maxTokens: 50000,
    structureTokens: 5000,
    userCodeTokens: 35000,
    contextTokens: 10000
  };

  /**
   * Estimate tokens from text content
   * Rule: 4 characters ≈ 1 token
   */
  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Prioritize files into tiers based on importance
   * 
   * Tier 1 (Highest): Entry points, main user code
   * Tier 2: API routes, controllers, services
   * Tier 3: Utilities, helpers, configs
   * Tier 4 (Lowest): Library code, generated files
   */
  prioritizeFiles(
    files: string[],
    contextMap: ProjectContextMap,
    rootDir: string
  ): FilePriority[] {
    const priorities: FilePriority[] = [];

    for (const file of files) {
      const fullPath = path.join(rootDir, file);
      
      // Skip if file doesn't exist
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const estimatedTokens = this.estimateTokens(content);
      const tier = this.determineTier(file, contextMap);
      const priority = this.calculatePriority(file, tier, contextMap);

      priorities.push({
        file,
        tier,
        estimatedTokens,
        priority
      });
    }

    // Sort by priority (highest first)
    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Determine tier for a file
   */
  private determineTier(file: string, contextMap: ProjectContextMap): 1 | 2 | 3 | 4 {
    const fileName = path.basename(file);
    const ext = path.extname(file);
    const dirPath = path.dirname(file);

    // Tier 1: Entry points and core user code
    if (contextMap.entryPoints.includes(file)) {
      return 1;
    }

    if (contextMap.coreModules.includes(file)) {
      return 1;
    }

    // Entry point patterns
    const entryPatterns = [
      'main.py', 'app.py', 'index.js', 'index.ts',
      'App.tsx', 'App.jsx', 'server.js', 'server.ts',
      'main.java', 'Main.java', 'Program.cs', 'main.go'
    ];
    if (entryPatterns.includes(fileName)) {
      return 1;
    }

    // Tier 2: API routes, controllers, services
    const tier2Patterns = [
      /routes?/i, /controllers?/i, /services?/i,
      /api/i, /handlers?/i, /endpoints?/i
    ];
    if (tier2Patterns.some(pattern => dirPath.match(pattern))) {
      return 2;
    }

    if (fileName.match(/route|controller|service|api|handler/i)) {
      return 2;
    }

    // Tier 3: Utilities, helpers, configs
    const tier3Patterns = [
      /utils?/i, /helpers?/i, /lib/i, /common/i,
      /config/i, /constants?/i
    ];
    if (tier3Patterns.some(pattern => dirPath.match(pattern))) {
      return 3;
    }

    if (fileName.match(/util|helper|config|constant/i)) {
      return 3;
    }

    // Config files
    if (['.json', '.yaml', '.yml', '.toml', '.ini'].includes(ext)) {
      return 3;
    }

    // Tier 4: Library code, generated files, tests
    if (dirPath.includes('node_modules') || dirPath.includes('vendor')) {
      return 4;
    }

    if (fileName.match(/\.test\.|\.spec\.|_test\.|_spec\./)) {
      return 4;
    }

    if (fileName.match(/\.generated\.|\.g\.|\.min\./)) {
      return 4;
    }

    // Default: Tier 2 for source files, Tier 3 for others
    const sourceExtensions = ['.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.cs'];
    return sourceExtensions.includes(ext) ? 2 : 3;
  }

  /**
   * Calculate priority score for a file
   * Higher score = higher priority
   */
  private calculatePriority(
    file: string,
    tier: number,
    contextMap: ProjectContextMap
  ): number {
    let priority = 0;

    // Base priority from tier (inverted: Tier 1 = 1000, Tier 4 = 100)
    priority += (5 - tier) * 250;

    // Bonus for entry points
    if (contextMap.entryPoints.includes(file)) {
      priority += 500;
    }

    // Bonus for core modules
    if (contextMap.coreModules.includes(file)) {
      priority += 300;
    }

    // Bonus for user code files
    if (contextMap.userCodeFiles.includes(file)) {
      priority += 200;
    }

    // Bonus for shorter paths (likely more important)
    const depth = file.split(path.sep).length;
    priority += Math.max(0, 50 - (depth * 10));

    // Bonus for specific important files
    const fileName = path.basename(file);
    if (fileName.match(/^(main|app|index|server)\./i)) {
      priority += 400;
    }

    return priority;
  }

  /**
   * Select files within budget, applying truncation if needed
   */
  selectFilesWithinBudget(
    priorities: FilePriority[],
    rootDir: string
  ): BudgetAllocation {
    const selectedFiles: string[] = [];
    const truncatedFiles: string[] = [];
    const skippedFiles: string[] = [];
    let totalTokens = 0;

    // Reserve tokens for structure
    const availableTokens = this.budget.userCodeTokens;

    for (const filePriority of priorities) {
      const { file, estimatedTokens, tier } = filePriority;

      // Skip Tier 4 files if budget is tight
      if (tier === 4 && totalTokens > availableTokens * 0.7) {
        skippedFiles.push(file);
        continue;
      }

      // If file fits within budget, include it
      if (totalTokens + estimatedTokens <= availableTokens) {
        selectedFiles.push(file);
        totalTokens += estimatedTokens;
        continue;
      }

      // If Tier 1 or 2, try to truncate and include
      if (tier <= 2) {
        const remainingTokens = availableTokens - totalTokens;
        
        if (remainingTokens > 500) { // Only truncate if we have reasonable space
          selectedFiles.push(file);
          truncatedFiles.push(file);
          totalTokens += remainingTokens;
          break; // Budget exhausted
        }
      }

      // Otherwise, skip the file
      skippedFiles.push(file);
    }

    return {
      selectedFiles,
      totalTokens,
      truncatedFiles,
      skippedFiles
    };
  }

  /**
   * Truncate file content to fit within token limit
   * Preserves important parts: imports, class/function definitions, key logic
   */
  truncateFile(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;

    if (content.length <= maxChars) {
      return content;
    }

    // Strategy: Keep beginning (imports, definitions) and end (main logic)
    const keepStart = Math.floor(maxChars * 0.6);
    const keepEnd = Math.floor(maxChars * 0.3);
    const truncationMarker = '\n\n... [TRUNCATED FOR TOKEN BUDGET] ...\n\n';

    const start = content.substring(0, keepStart);
    const end = content.substring(content.length - keepEnd);

    return start + truncationMarker + end;
  }

  /**
   * Load and prepare code context within token budget
   */
  async loadCodeContext(
    priorities: FilePriority[],
    rootDir: string
  ): Promise<string> {
    const allocation = this.selectFilesWithinBudget(priorities, rootDir);
    const codeContext: string[] = [];

    for (const file of allocation.selectedFiles) {
      try {
        const fullPath = path.join(rootDir, file);
        let content = fs.readFileSync(fullPath, 'utf-8');

        // Truncate if needed
        if (allocation.truncatedFiles.includes(file)) {
          const filePriority = priorities.find(p => p.file === file);
          if (filePriority) {
            const remainingTokens = this.budget.userCodeTokens - allocation.totalTokens;
            content = this.truncateFile(content, remainingTokens);
          }
        }

        codeContext.push(`\n--- File: ${file} ---\n${content}`);
      } catch (error) {
        console.error(`Error loading file ${file}:`, error);
      }
    }

    // Add summary of skipped files
    if (allocation.skippedFiles.length > 0) {
      codeContext.push(
        `\n--- Skipped Files (${allocation.skippedFiles.length}) ---\n` +
        allocation.skippedFiles.slice(0, 20).join('\n') +
        (allocation.skippedFiles.length > 20 ? '\n... and more' : '')
      );
    }

    return codeContext.join('\n\n');
  }

  /**
   * Get budget statistics for logging/monitoring
   */
  getBudgetStats(allocation: BudgetAllocation): {
    utilization: number;
    filesIncluded: number;
    filesTruncated: number;
    filesSkipped: number;
  } {
    return {
      utilization: (allocation.totalTokens / this.budget.userCodeTokens) * 100,
      filesIncluded: allocation.selectedFiles.length,
      filesTruncated: allocation.truncatedFiles.length,
      filesSkipped: allocation.skippedFiles.length
    };
  }
}
