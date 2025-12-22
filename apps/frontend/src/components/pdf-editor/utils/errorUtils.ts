/**
 * Parses error response from the PDF service API
 * @param response - The fetch response object
 * @returns Promise<string> - User-friendly error message
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      return errorData.error || `Operation failed (${response.status})`;
    } else {
      const errorText = await response.text();
      return errorText || `Operation failed: ${response.status} ${response.statusText}`;
    }
  } catch (parseError) {
    return `Operation failed: ${response.status} ${response.statusText}`;
  }
}

/**
 * Handles API call errors and returns user-friendly messages
 * @param error - The error object
 * @returns string - User-friendly error message
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Validates file before upload
 * @param file - The file to validate
 * @param maxSize - Maximum file size in bytes (default: 100MB)
 * @returns string | null - Error message if validation fails, null if valid
 */
export function validatePdfFile(file: File, maxSize: number = 100 * 1024 * 1024): string | null {
  if (!file) {
    return 'No file selected.';
  }
  
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'Please select a valid PDF file. Only PDF files are supported.';
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024));
    return `File size (${fileSizeMB}MB) exceeds the maximum allowed size of ${maxSizeMB}MB.`;
  }
  
  if (file.size === 0) {
    return 'The selected file is empty.';
  }
  
  return null;
}