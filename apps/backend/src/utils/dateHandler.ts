/**
 * Standardized date handling utilities for resume data
 * Ensures consistent date processing across frontend and backend
 */

/**
 * Deep clone object while preserving Buffer data
 * Avoids JSON.parse/stringify which corrupts Buffers
 */
function cloneWithBuffers(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Buffer.isBuffer(obj)) {
    // Preserve Buffer objects as-is
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cloneWithBuffers(item));
  }
  
  // Handle regular objects
  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = cloneWithBuffers(obj[key]);
    }
  }
  
  return cloned;
}

export interface ParsedDate {
  date: Date;
  format: 'MM/YYYY' | 'YYYY-MM-DD' | 'YYYY-MM' | 'full';
  isValid: boolean;
}

/**
 * Comprehensive date parsing function
 * Handles multiple date formats from the frontend DatePicker component
 */
export function parseResumeDate(input: any): ParsedDate | null {
  if (!input) {
    return null;
  }

  // Already a Date object
  if (input instanceof Date) {
    return {
      date: input,
      format: 'full',
      isValid: !isNaN(input.getTime())
    };
  }

  // Must be a string from here
  if (typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  const dateString = input.trim();

  // Handle MM/YYYY format (from DatePicker)
  const mmYyyyPattern = /^(0[1-9]|1[0-2])\/(\d{4})$/;
  const mmYyyyMatch = dateString.match(mmYyyyPattern);
  if (mmYyyyMatch) {
    const [, month, year] = mmYyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      date,
      format: 'MM/YYYY',
      isValid: !isNaN(date.getTime())
    };
  }

  // Handle YYYY-MM format 
  const yyyyMmPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
  const yyyyMmMatch = dateString.match(yyyyMmPattern);
  if (yyyyMmMatch) {
    const [, year, month] = yyyyMmMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      date,
      format: 'YYYY-MM',
      isValid: !isNaN(date.getTime())
    };
  }

  // Handle YYYY-MM-DD format (ISO date)
  const yyyyMmDdPattern = /^(\d{4})-([0-1][0-9])-([0-3][0-9])$/;
  const yyyyMmDdMatch = dateString.match(yyyyMmDdPattern);
  if (yyyyMmDdMatch) {
    const date = new Date(dateString);
    return {
      date,
      format: 'YYYY-MM-DD',
      isValid: !isNaN(date.getTime())
    };
  }

  // Try generic Date parsing as last resort
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return {
        date,
        format: 'full',
        isValid: true
      };
    }
  } catch (error) {
    // Fall through to null return
  }

  return null;
}

/**
 * Safely convert any date input to a Date object
 * Returns undefined for invalid inputs
 */
export function safeParseDate(input: any): Date | undefined {
  const parsed = parseResumeDate(input);
  return parsed?.isValid ? parsed.date : undefined;
}

/**
 * Format Date object back to string for frontend
 * Uses MM/YYYY format by default to match DatePicker component
 */
export function formatDateForFrontend(date: Date, format: 'MM/YYYY' | 'YYYY-MM-DD' = 'MM/YYYY'): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  if (format === 'MM/YYYY') {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${month}/${year}`;
  } else if (format === 'YYYY-MM-DD') {
    return date.toISOString().split('T')[0];
  }

  return '';
}

/**
 * Validate date range (start date should be before end date)
 */
export function validateDateRange(startDate: any, endDate: any): { 
  isValid: boolean; 
  error?: string; 
  startParsed?: Date; 
  endParsed?: Date; 
} {
  const start = safeParseDate(startDate);
  const end = safeParseDate(endDate);

  // If either date is provided, both should be valid
  if ((startDate && !start) || (endDate && !end)) {
    return {
      isValid: false,
      error: 'Invalid date format provided'
    };
  }

  // If both dates exist, validate the range
  if (start && end) {
    if (start > end) {
      return {
        isValid: false,
        error: 'Start date cannot be after end date',
        startParsed: start,
        endParsed: end
      };
    }
  }

  return {
    isValid: true,
    startParsed: start,
    endParsed: end
  };
}

/**
 * Convert database Date objects to frontend-compatible strings
 * Used when sending resume data back to frontend
 */
export function convertDatesForFrontend(resumeData: any): any {
  if (!resumeData) return resumeData;

  // Use toObject() for Mongoose documents to preserve Buffer data
  const sourceData = resumeData.toObject ? resumeData.toObject() : resumeData;
  
  // Deep clone while preserving Buffer data
  const converted = cloneWithBuffers(sourceData);

  // Convert work experience dates
  if (converted.workExperience && Array.isArray(converted.workExperience)) {
    converted.workExperience = converted.workExperience.map((exp: any) => ({
      ...exp,
      startDate: exp.startDate ? formatDateForFrontend(new Date(exp.startDate)) : '',
      endDate: exp.endDate ? formatDateForFrontend(new Date(exp.endDate)) : ''
    }));
  }

  // Convert education dates
  if (converted.education && Array.isArray(converted.education)) {
    converted.education = converted.education.map((edu: any) => ({
      ...edu,
      startDate: edu.startDate ? formatDateForFrontend(new Date(edu.startDate)) : '',
      endDate: edu.endDate ? formatDateForFrontend(new Date(edu.endDate)) : '',
      graduationDate: edu.graduationDate ? formatDateForFrontend(new Date(edu.graduationDate)) : ''
    }));
  }

  // Convert project dates
  if (converted.projects && Array.isArray(converted.projects)) {
    converted.projects = converted.projects.map((project: any) => ({
      ...project,
      startDate: project.startDate ? formatDateForFrontend(new Date(project.startDate)) : '',
      endDate: project.endDate ? formatDateForFrontend(new Date(project.endDate)) : ''
    }));
  }

  // Convert certification dates
  if (converted.certifications && Array.isArray(converted.certifications)) {
    converted.certifications = converted.certifications.map((cert: any) => ({
      ...cert,
      date: cert.date ? formatDateForFrontend(new Date(cert.date)) : '',
      expirationDate: cert.expirationDate ? formatDateForFrontend(new Date(cert.expirationDate)) : ''
    }));
  }

  // Convert volunteer experience dates
  if (converted.volunteerExperience && Array.isArray(converted.volunteerExperience)) {
    converted.volunteerExperience = converted.volunteerExperience.map((vol: any) => ({
      ...vol,
      startDate: vol.startDate ? formatDateForFrontend(new Date(vol.startDate)) : '',
      endDate: vol.endDate ? formatDateForFrontend(new Date(vol.endDate)) : ''
    }));
  }

  // Convert award dates
  if (converted.awards && Array.isArray(converted.awards)) {
    converted.awards = converted.awards.map((award: any) => ({
      ...award,
      date: award.date ? formatDateForFrontend(new Date(award.date)) : ''
    }));
  }

  // Convert Buffer data to base64 for frontend compatibility
  if (converted.generatedFiles?.pdf?.data && Buffer.isBuffer(converted.generatedFiles.pdf.data)) {
    console.log('📄 Converting PDF Buffer to base64 for frontend, size:', converted.generatedFiles.pdf.data.length);
    converted.generatedFiles.pdf.data = converted.generatedFiles.pdf.data.toString('base64');
  }

  return converted;
}

/**
 * Validation helper for date fields in express-validator
 */
export function isValidResumeDate(value: any): boolean {
  const parsed = parseResumeDate(value);
  return parsed !== null && parsed.isValid;
}

/**
 * Express-validator custom validator for date ranges
 */
export function validateResumeeDateRange(startDateField: string, endDateField: string) {
  return (value: any, { req }: { req: any }) => {
    const startDate = req.body[startDateField];
    const endDate = req.body[endDateField];
    
    const validation = validateDateRange(startDate, endDate);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid date range');
    }
    
    return true;
  };
}

/**
 * Middleware to convert dates in request body before processing
 */
export function standardizeDatesMiddleware(req: any, res: any, next: any) {
  try {
    // This middleware converts common date fields from strings to proper format
    // before they reach the validation layer
    
    if (req.body.workExperience && Array.isArray(req.body.workExperience)) {
      req.body.workExperience = req.body.workExperience.map((exp: any) => ({
        ...exp,
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined
      }));
    }

    if (req.body.education && Array.isArray(req.body.education)) {
      req.body.education = req.body.education.map((edu: any) => ({
        ...edu,
        startDate: edu.startDate || undefined,
        endDate: edu.endDate || undefined,
        graduationDate: edu.graduationDate || undefined
      }));
    }

    // Continue with other sections as needed...
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid date format in request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}