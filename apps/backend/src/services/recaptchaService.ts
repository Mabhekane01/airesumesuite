import axios from 'axios';

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  errors?: string[];
}

class RecaptchaService {
  private secretKey: string;
  private minimumScore: number;
  private enterpriseMode: boolean;
  private actionScores: Map<string, number>;

  constructor() {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    this.minimumScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
    this.enterpriseMode = process.env.RECAPTCHA_ENTERPRISE === 'true';
    
    // Enterprise action-specific scoring
    this.actionScores = new Map([
      ['signup', 0.7],           // High security for registration
      ['login', 0.5],            // Medium security for login
      ['password_reset', 0.8],   // Very high security for password reset
      ['contact', 0.3],          // Lower security for contact forms
      ['newsletter', 0.4]        // Low security for newsletter signup
    ]);
  }

  /**
   * Get minimum score for specific action (enterprise feature)
   */
  private getActionMinScore(action: string): number {
    return this.actionScores.get(action) || this.minimumScore;
  }

  /**
   * Verify reCAPTCHA v3 token with enterprise features
   * @param token - reCAPTCHA token from frontend
   * @param expectedAction - Expected action name
   * @param userIP - User's IP address (optional)
   * @returns Promise<RecaptchaVerificationResult>
   */
  async verifyToken(
    token: string, 
    expectedAction: string = 'signup',
    userIP?: string
  ): Promise<RecaptchaVerificationResult> {
    try {
      // Skip verification if no secret key is configured
      if (!this.secretKey) {
        console.warn('⚠️ reCAPTCHA secret key not configured. Skipping verification.');
        return {
          success: true,
          score: 1.0,
          action: expectedAction
        };
      }

      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (userIP) {
        params.append('remoteip', userIP);
      }

      const response = await axios.post<RecaptchaResponse>(
        'https://www.google.com/recaptcha/api/siteverify',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      const data = response.data;

      if (!data.success) {
        console.error('❌ reCAPTCHA verification failed:', data['error-codes']);
        return {
          success: false,
          errors: data['error-codes'] || ['Unknown error']
        };
      }

      // Check action matches (for reCAPTCHA v3)
      if (data.action && data.action !== expectedAction) {
        console.error('❌ reCAPTCHA action mismatch:', {
          expected: expectedAction,
          received: data.action
        });
        return {
          success: false,
          errors: ['Action mismatch']
        };
      }

      // Check score meets action-specific threshold (enterprise feature)
      const actionMinScore = this.getActionMinScore(expectedAction);
      if (data.score !== undefined && data.score < actionMinScore) {
        console.warn('⚠️ reCAPTCHA score below action threshold:', {
          score: data.score,
          actionMinScore,
          globalMinScore: this.minimumScore,
          action: data.action,
          expectedAction
        });
        return {
          success: false,
          score: data.score,
          action: data.action,
          errors: ['Score too low for this action']
        };
      }

      console.log('✅ reCAPTCHA verification successful:', {
        score: data.score,
        action: data.action,
        hostname: data.hostname
      });

      return {
        success: true,
        score: data.score,
        action: data.action
      };

    } catch (error) {
      console.error('❌ reCAPTCHA verification error:', error);
      
      // In production, you might want to fail open for better UX
      // but log the error for monitoring
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          errors: ['Verification service unavailable']
        };
      }

      return {
        success: true, // Fail open in development
        score: 1.0,
        action: expectedAction
      };
    }
  }

  /**
   * Verify reCAPTCHA token with custom scoring logic
   * @param token - reCAPTCHA token
   * @param action - Expected action
   * @param customMinScore - Custom minimum score for this verification
   * @param userIP - User's IP address
   */
  async verifyWithCustomScore(
    token: string,
    action: string,
    customMinScore: number,
    userIP?: string
  ): Promise<RecaptchaVerificationResult> {
    const originalMinScore = this.minimumScore;
    this.minimumScore = customMinScore;
    
    const result = await this.verifyToken(token, action, userIP);
    
    this.minimumScore = originalMinScore; // Restore original
    return result;
  }

  /**
   * Get the configured minimum score
   */
  getMinimumScore(): number {
    return this.minimumScore;
  }

  /**
   * Check if reCAPTCHA is properly configured
   */
  isConfigured(): boolean {
    return !!this.secretKey;
  }

  /**
   * Get reCAPTCHA configuration status for health checks
   */
  getStatus(): { configured: boolean; minimumScore: number; enterpriseMode: boolean; actionScores: Record<string, number> } {
    return {
      configured: this.isConfigured(),
      minimumScore: this.minimumScore,
      enterpriseMode: this.enterpriseMode,
      actionScores: Object.fromEntries(this.actionScores)
    };
  }

  /**
   * Enterprise: Verify with fraud analysis
   */
  async verifyWithFraudAnalysis(
    token: string,
    action: string,
    userIP?: string,
    userAgent?: string,
    additionalContext?: Record<string, any>
  ): Promise<RecaptchaVerificationResult & { riskAnalysis?: any }> {
    const baseResult = await this.verifyToken(token, action, userIP);
    
    if (!baseResult.success) {
      return baseResult;
    }

    // Enterprise fraud analysis logging
    const riskAnalysis = {
      timestamp: new Date().toISOString(),
      userIP,
      userAgent,
      action,
      score: baseResult.score,
      context: additionalContext,
      riskLevel: this.calculateRiskLevel(baseResult.score || 0)
    };

    console.log('🔍 reCAPTCHA Enterprise Analysis:', riskAnalysis);

    return {
      ...baseResult,
      riskAnalysis
    };
  }

  /**
   * Calculate risk level based on score
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'low';
    if (score >= 0.6) return 'medium';
    if (score >= 0.3) return 'high';
    return 'critical';
  }

  /**
   * Enterprise: Update action-specific scores dynamically
   */
  updateActionScore(action: string, minScore: number): void {
    if (minScore >= 0 && minScore <= 1) {
      this.actionScores.set(action, minScore);
      console.log(`✅ Updated reCAPTCHA score for action '${action}' to ${minScore}`);
    } else {
      console.error(`❌ Invalid score ${minScore} for action '${action}'. Must be between 0 and 1.`);
    }
  }
}

export const recaptchaService = new RecaptchaService();
export { RecaptchaVerificationResult };