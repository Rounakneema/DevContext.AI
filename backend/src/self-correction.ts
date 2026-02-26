/**
 * Self-Correction Loop
 * 
 * Implements iterative refinement for AI-generated content.
 * Uses validation functions to check quality and retries with feedback.
 * 
 * Key Features:
 * - Max 3 attempts per generation
 * - Track correction history
 * - Return best result based on validation
 * - Provide feedback to AI for improvement
 */

export interface CorrectionAttempt<T> {
  attemptNumber: number;
  result: T;
  validationScore: number;
  validationFeedback: string;
  timestamp: string;
}

export interface CorrectionResult<T> {
  finalResult: T;
  attempts: CorrectionAttempt<T>[];
  totalAttempts: number;
  converged: boolean;
  bestScore: number;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string;
  issues: string[];
}

export type GeneratorFunction<T> = (feedback?: string) => Promise<T>;
export type ValidatorFunction<T> = (result: T) => Promise<ValidationResult>;

export class SelfCorrectionLoop {
  private maxAttempts: number;
  private minAcceptableScore: number;

  constructor(maxAttempts: number = 3, minAcceptableScore: number = 70) {
    this.maxAttempts = maxAttempts;
    this.minAcceptableScore = minAcceptableScore;
  }

  /**
   * Execute generation with self-correction
   * 
   * @param generator Function that generates content (accepts feedback for retries)
   * @param validator Function that validates generated content
   * @returns Best result after correction attempts
   */
  async correctWithRetry<T>(
    generator: GeneratorFunction<T>,
    validator: ValidatorFunction<T>
  ): Promise<CorrectionResult<T>> {
    const attempts: CorrectionAttempt<T>[] = [];
    let bestAttempt: CorrectionAttempt<T> | null = null;
    let feedback: string | undefined = undefined;

    for (let i = 1; i <= this.maxAttempts; i++) {
      console.log(`Self-correction attempt ${i}/${this.maxAttempts}`);

      // Generate content (with feedback from previous attempt)
      const result = await generator(feedback);

      // Validate result
      const validation = await validator(result);

      // Record attempt
      const attempt: CorrectionAttempt<T> = {
        attemptNumber: i,
        result,
        validationScore: validation.score,
        validationFeedback: validation.feedback,
        timestamp: new Date().toISOString()
      };

      attempts.push(attempt);

      // Track best attempt
      if (!bestAttempt || validation.score > bestAttempt.validationScore) {
        bestAttempt = attempt;
      }

      console.log(`Attempt ${i} score: ${validation.score}/100`);

      // Check if we've converged
      if (validation.isValid && validation.score >= this.minAcceptableScore) {
        console.log(`✓ Converged on attempt ${i} with score ${validation.score}`);
        return {
          finalResult: result,
          attempts,
          totalAttempts: i,
          converged: true,
          bestScore: validation.score
        };
      }

      // Prepare feedback for next attempt
      if (i < this.maxAttempts) {
        feedback = this.generateFeedback(validation, i);
        console.log(`Feedback for next attempt: ${feedback}`);
      }
    }

    // Max attempts reached - return best result
    console.warn(`⚠️ Max attempts (${this.maxAttempts}) reached. Best score: ${bestAttempt!.validationScore}`);

    return {
      finalResult: bestAttempt!.result,
      attempts,
      totalAttempts: this.maxAttempts,
      converged: false,
      bestScore: bestAttempt!.validationScore
    };
  }

  /**
   * Generate feedback for next attempt based on validation results
   */
  private generateFeedback(validation: ValidationResult, attemptNumber: number): string {
    const parts: string[] = [];

    parts.push(`Previous attempt (${attemptNumber}) had issues:`);

    if (validation.issues.length > 0) {
      parts.push('\nSpecific issues:');
      validation.issues.forEach((issue, idx) => {
        parts.push(`${idx + 1}. ${issue}`);
      });
    }

    parts.push(`\nValidation feedback: ${validation.feedback}`);
    parts.push('\nPlease address these issues in your next response.');

    return parts.join('\n');
  }

  /**
   * Simple validator that checks if result meets basic criteria
   */
  static createBasicValidator<T>(
    checkFunction: (result: T) => { isValid: boolean; issues: string[] }
  ): ValidatorFunction<T> {
    return async (result: T): Promise<ValidationResult> => {
      const check = checkFunction(result);
      
      const score = check.isValid ? 100 : Math.max(0, 100 - (check.issues.length * 20));
      
      return {
        isValid: check.isValid,
        score,
        feedback: check.isValid 
          ? 'All checks passed' 
          : `Failed ${check.issues.length} checks`,
        issues: check.issues
      };
    };
  }

  /**
   * Create a validator that combines multiple validation checks
   */
  static createCompositeValidator<T>(
    validators: Array<{ name: string; validator: ValidatorFunction<T>; weight: number }>
  ): ValidatorFunction<T> {
    return async (result: T): Promise<ValidationResult> => {
      const results = await Promise.all(
        validators.map(async (v) => ({
          name: v.name,
          weight: v.weight,
          result: await v.validator(result)
        }))
      );

      // Calculate weighted score
      const totalWeight = validators.reduce((sum, v) => sum + v.weight, 0);
      const weightedScore = results.reduce(
        (sum, r) => sum + (r.result.score * r.weight),
        0
      ) / totalWeight;

      // Collect all issues
      const allIssues: string[] = [];
      results.forEach((r) => {
        if (r.result.issues.length > 0) {
          allIssues.push(`[${r.name}] ${r.result.issues.join(', ')}`);
        }
      });

      // Check if all validators passed
      const allValid = results.every((r) => r.result.isValid);

      return {
        isValid: allValid,
        score: Math.round(weightedScore),
        feedback: allValid
          ? 'All validation checks passed'
          : `Some checks failed: ${allIssues.join('; ')}`,
        issues: allIssues
      };
    };
  }
}
