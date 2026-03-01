/**
 * Grounding Checker
 * 
 * Validates that AI-generated content references actual files from the repository.
 * Prevents hallucination by ensuring all file references exist in UserCodeFiles.
 * 
 * Key Functions:
 * - Validate file references in ProjectReview
 * - Validate file references in DesignDecisions
 * - Validate file references in InterviewQuestions
 * - Calculate grounding confidence scores
 */

import { ProjectContextMap } from './types';

export interface GroundingResult {
  isValid: boolean;
  invalidReferences: string[];
  validReferences: string[];
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  warnings: string[];
}

export interface DesignDecision {
  decision: string;
  rationale: string;
  fileReferences: Array<{
    file: string;
    lineNumbers?: string;
    snippet?: string;
  }>;
  groundingConfidence?: 'high' | 'medium' | 'low' | 'insufficient';
}

export class GroundingChecker {
  /**
   * Validate file references against user code files
   */
  validateFileReferences(
    references: string[],
    userCodeFiles: string[]
  ): GroundingResult {
    const invalidReferences: string[] = [];
    const validReferences: string[] = [];
    const warnings: string[] = [];

    // Safety check: ensure userCodeFiles contains only strings
    const safeUserCodeFiles = userCodeFiles.filter(f => typeof f === 'string');
    
    if (safeUserCodeFiles.length !== userCodeFiles.length) {
      console.warn(`⚠️ Filtered out ${userCodeFiles.length - safeUserCodeFiles.length} non-string entries from userCodeFiles`);
    }

    // Normalize file paths for comparison
    const normalizedUserFiles = safeUserCodeFiles.map(f => this.normalizePath(f));

    for (const ref of references) {
      // Safety check: ensure ref is a string
      if (typeof ref !== 'string') {
        console.warn(`⚠️ Skipping non-string reference:`, ref);
        continue;
      }
      
      const normalizedRef = this.normalizePath(ref);
      
      // Check if file exists in user code
      if (normalizedUserFiles.includes(normalizedRef)) {
        validReferences.push(ref);
      } else {
        // Check if it's a partial match (e.g., "main.py" vs "src/main.py")
        const partialMatch = normalizedUserFiles.find(f => 
          f.endsWith('/' + normalizedRef) || f === normalizedRef
        );
        
        if (partialMatch) {
          validReferences.push(ref);
          warnings.push(`Partial match: "${ref}" matched to "${partialMatch}"`);
        } else {
          invalidReferences.push(ref);
        }
      }
    }

    const confidence = this.calculateConfidence(
      validReferences.length,
      invalidReferences.length,
      references.length
    );

    return {
      isValid: invalidReferences.length === 0,
      invalidReferences,
      validReferences,
      confidence,
      warnings
    };
  }

  /**
   * Validate ProjectReview grounding
   */
  validateProjectReview(
    review: any,
    contextMap: ProjectContextMap
  ): GroundingResult {
    const allReferences: string[] = [];

    // Collect file references from strengths
    if (review.strengths) {
      for (const strength of review.strengths) {
        if (strength.fileReferences) {
          // Handle both string arrays and FileReference objects
          const refs = strength.fileReferences.map((ref: any) => 
            typeof ref === 'string' ? ref : ref.file
          );
          allReferences.push(...refs);
        }
      }
    }

    // Collect file references from weaknesses
    if (review.weaknesses) {
      for (const weakness of review.weaknesses) {
        if (weakness.fileReferences) {
          const refs = weakness.fileReferences.map((ref: any) => 
            typeof ref === 'string' ? ref : ref.file
          );
          allReferences.push(...refs);
        }
      }
    }

    return this.validateFileReferences(allReferences, contextMap.userCodeFiles);
  }

  /**
   * Validate DesignDecision grounding
   */
  validateDesignDecision(
    decision: DesignDecision,
    userCodeFiles: string[]
  ): GroundingResult {
    const references = decision.fileReferences.map(ref => ref.file);
    return this.validateFileReferences(references, userCodeFiles);
  }

  /**
   * Validate InterviewQuestion grounding
   */
  validateInterviewQuestion(
    question: any,
    userCodeFiles: string[]
  ): GroundingResult {
    const references = question.context?.fileReferences?.map((ref: any) => 
      typeof ref === 'string' ? ref : ref.file
    ) || [];
    
    // Also check if question text mentions files
    const mentionedFiles = this.extractFileReferences(question.question);
    const allReferences = [...references, ...mentionedFiles];

    return this.validateFileReferences(allReferences, userCodeFiles);
  }

  /**
   * Validate multiple interview questions
   */
  validateInterviewQuestions(
    questions: any[],
    userCodeFiles: string[]
  ): {
    validQuestions: any[];
    invalidQuestions: any[];
    overallResult: GroundingResult;
  } {
    const validQuestions: any[] = [];
    const invalidQuestions: any[] = [];
    const allReferences: string[] = [];
    const allInvalidRefs: string[] = [];

    for (const question of questions) {
      const result = this.validateInterviewQuestion(question, userCodeFiles);
      
      allReferences.push(...result.validReferences);
      allInvalidRefs.push(...result.invalidReferences);

      if (result.isValid || result.confidence !== 'insufficient') {
        validQuestions.push(question);
      } else {
        invalidQuestions.push(question);
      }
    }

    const overallResult = this.validateFileReferences(
      [...allReferences, ...allInvalidRefs],
      userCodeFiles
    );

    return {
      validQuestions,
      invalidQuestions,
      overallResult
    };
  }

  /**
   * Extract file references from text
   * Looks for patterns like: "in main.py", "file.ts", "src/app.js"
   */
  private extractFileReferences(text: string): string[] {
    const references: string[] = [];
    
    // Pattern 1: Explicit file mentions with extensions
    const filePattern = /\b[\w\-\/\.]+\.(py|js|ts|tsx|jsx|java|go|rs|cs|cpp|c|h|rb|php)\b/gi;
    const matches = text.match(filePattern);
    
    if (matches) {
      references.push(...matches);
    }

    // Pattern 2: Quoted file paths (handles ", ', and `)
    const quotedPattern = /["`']([^"`']+\.(py|js|ts|tsx|jsx|java|go|rs|cs|cpp|c|h|rb|php))["`']/gi;
    const quotedMatches = text.matchAll(quotedPattern);
    
    for (const match of quotedMatches) {
      if (match[1]) {
        references.push(match[1]);
      }
    }

    // Remove duplicates
    return [...new Set(references)];
  }

  /**
   * Normalize file path for comparison
   */
  private normalizePath(filePath: string): string {
    return filePath
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/^\.\//, '') // Remove leading ./
      .replace(/^\//, '') // Remove leading /
      .toLowerCase()
      .trim();
  }

  /**
   * Calculate confidence score based on validation results
   */
  private calculateConfidence(
    validCount: number,
    invalidCount: number,
    totalCount: number
  ): 'high' | 'medium' | 'low' | 'insufficient' {
    if (totalCount === 0) {
      return 'insufficient';
    }

    const validRatio = validCount / totalCount;

    if (validRatio >= 0.9 && invalidCount === 0) {
      return 'high';
    } else if (validRatio >= 0.7) {
      return 'medium';
    } else if (validRatio >= 0.5) {
      return 'low';
    } else {
      return 'insufficient';
    }
  }

  /**
   * Check if a file reference is likely library code
   */
  isLibraryCode(filePath: string): boolean {
    const libraryPatterns = [
      /node_modules/i,
      /vendor/i,
      /\.min\./i,
      /\.bundle\./i,
      /dist\//i,
      /build\//i,
      /\.generated\./i,
      /site-packages/i,
      /venv/i,
      /env/i
    ];

    return libraryPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Filter out library code references
   */
  filterLibraryReferences(references: string[]): {
    userCode: string[];
    libraryCode: string[];
  } {
    const userCode: string[] = [];
    const libraryCode: string[] = [];

    for (const ref of references) {
      if (this.isLibraryCode(ref)) {
        libraryCode.push(ref);
      } else {
        userCode.push(ref);
      }
    }

    return { userCode, libraryCode };
  }

  /**
   * Generate grounding report for logging/debugging
   */
  generateReport(result: GroundingResult): string {
    const lines: string[] = [];
    
    lines.push('=== Grounding Validation Report ===');
    lines.push(`Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
    lines.push(`Confidence: ${result.confidence.toUpperCase()}`);
    lines.push('');
    
    if (result.validReferences.length > 0) {
      lines.push(`Valid References (${result.validReferences.length}):`);
      result.validReferences.forEach(ref => lines.push(`  ✓ ${ref}`));
      lines.push('');
    }
    
    if (result.invalidReferences.length > 0) {
      lines.push(`Invalid References (${result.invalidReferences.length}):`);
      result.invalidReferences.forEach(ref => lines.push(`  ✗ ${ref}`));
      lines.push('');
    }
    
    if (result.warnings.length > 0) {
      lines.push(`Warnings (${result.warnings.length}):`);
      result.warnings.forEach(warning => lines.push(`  ⚠ ${warning}`));
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Validate Intelligence Report grounding
   */
  validateIntelligenceReport(
    report: any,
    userCodeFiles: string[]
  ): GroundingResult {
    const allReferences: string[] = [];

    // Collect file references from design decisions
    if (report.designDecisions) {
      for (const decision of report.designDecisions) {
        if (decision.fileReferences) {
          allReferences.push(...decision.fileReferences);
        }
      }
    }

    // Collect file references from scalability bottlenecks
    if (report.scalabilityAnalysis?.bottlenecks) {
      for (const bottleneck of report.scalabilityAnalysis.bottlenecks) {
        if (bottleneck.fileReferences) {
          allReferences.push(...bottleneck.fileReferences);
        }
      }
    }

    return this.validateFileReferences(allReferences, userCodeFiles);
  }
}
