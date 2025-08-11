import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

export interface PdfEditOptions {
  text: string;
  x: number;
  y: number;
  pageNumber: number;
  fontSize?: number;
  color?: string;
}

export interface SignatureOptions {
  signerName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  reason?: string;
}

export interface TextSignatureOptions {
  signatureText: string;
  x: number;
  y: number;
  pageNumber: number;
  fontName?: string;
  fontSize?: number;
  color?: string;
}

export interface WatermarkOptions {
  text?: string;
  x: number;
  y: number;
  opacity?: number;
  rotation?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface WatermarkAllPagesOptions {
  text: string;
  opacity?: number;
  rotation?: number;
  position?: string;
  fontSize?: number;
  color?: string;
}

export interface RemoveSecurityOptions {
  ownerPassword?: string;
  userPassword?: string;
}

export interface SecurityOptions {
  password: string;
  permissions: {
    print: boolean;
    copy: boolean;
    edit: boolean;
    annotate: boolean;
    fillForms: boolean;
    extract: boolean;
    assemble: boolean;
    quality: boolean;
  };
  encryption: '40bit' | '128bit' | '256bit';
}

export interface OptimizationOptions {
  quality: 'low' | 'medium' | 'high' | 'maximum';
  dpi: number;
  colorSpace: 'rgb' | 'grayscale' | 'monochrome';
  compressImages: boolean;
  removeMetadata: boolean;
}

export interface AnnotationOptions {
  type: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  color?: string;
}

export interface FormFieldOptions {
  fieldType: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  options?: string[];
}

export interface ImageOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  opacity?: number;
}

class PdfEditorService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PDF_SERVICE_URL || 'http://localhost:8080/api/pdf';
    this.advancedUrl = process.env.PDF_SERVICE_URL || 'http://localhost:8080/api/pdf/advanced';
  }

  private readonly advancedUrl: string;

  /**
   * Health check for PDF service
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('PDF Service health check failed:', error);
      throw new Error('PDF service is unavailable');
    }
  }

  /**
   * Extract text from PDF
   */
  async extractText(fileBuffer: Buffer, filename: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/extract-text`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Text extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Replace text in PDF
   */
  async replaceText(fileBuffer: Buffer, filename: string, replacements: Record<string, string>): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/replace-text`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        data: replacements,
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Text replacement failed:', error);
      throw new Error('Failed to replace text in PDF');
    }
  }

  /**
   * Add text to PDF at specific position
   */
  async addText(fileBuffer: Buffer, filename: string, options: PdfEditOptions): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const params = new URLSearchParams();
      params.append('text', options.text);
      params.append('x', options.x.toString());
      params.append('y', options.y.toString());
      params.append('pageNumber', options.pageNumber.toString());
      if (options.fontSize) params.append('fontSize', options.fontSize.toString());
      if (options.color) params.append('color', options.color);

      const response = await axios.post(`${this.baseUrl}/add-text?${params.toString()}`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Add text failed:', error);
      throw new Error('Failed to add text to PDF');
    }
  }

  /**
   * Delete pages from PDF
   */
  async deletePages(fileBuffer: Buffer, filename: string, pagesToDelete: number[]): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/delete-pages`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        data: pagesToDelete,
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Delete pages failed:', error);
      throw new Error('Failed to delete pages from PDF');
    }
  }

  /**
   * Split PDF into multiple files
   */
  async splitPdf(fileBuffer: Buffer, filename: string, splitPoints: number[]): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/split`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        data: splitPoints,
      });

      return response.data;
    } catch (error) {
      console.error('PDF split failed:', error);
      throw new Error('Failed to split PDF');
    }
  }

  /**
   * Merge multiple PDFs
   */
  async mergePdfs(files: { buffer: Buffer; filename: string }[]): Promise<Buffer> {
    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('files', file.buffer, file.filename);
      });

      const response = await axios.post(`${this.baseUrl}/merge`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('PDF merge failed:', error);
      throw new Error('Failed to merge PDFs');
    }
  }

  /**
   * Rotate pages in PDF
   */
  async rotatePages(fileBuffer: Buffer, filename: string, rotations: Record<number, number>): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/rotate-pages`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        data: rotations,
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Page rotation failed:', error);
      throw new Error('Failed to rotate pages');
    }
  }

  /**
   * Add visual signature to PDF
   */
  async addSignature(
    fileBuffer: Buffer, 
    filename: string, 
    signatureBuffer: Buffer | null,
    signatureFilename: string | null,
    options: SignatureOptions
  ): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      
      if (signatureBuffer && signatureFilename) {
        formData.append('signatureImage', signatureBuffer, signatureFilename);
      }

      const params = new URLSearchParams();
      params.append('x', options.x.toString());
      params.append('y', options.y.toString());
      params.append('width', options.width.toString());
      params.append('height', options.height.toString());
      params.append('pageNumber', options.pageNumber.toString());
      params.append('signerName', options.signerName);
      if (options.reason) params.append('reason', options.reason);

      const response = await axios.post(`${this.baseUrl}/add-signature?${params.toString()}`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Add signature failed:', error);
      throw new Error('Failed to add signature to PDF');
    }
  }

  /**
   * Add text signature to PDF
   */
  async addTextSignature(fileBuffer: Buffer, filename: string, options: TextSignatureOptions): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const params = new URLSearchParams();
      params.append('signatureText', options.signatureText);
      params.append('x', options.x.toString());
      params.append('y', options.y.toString());
      params.append('pageNumber', options.pageNumber.toString());
      if (options.fontName) params.append('fontName', options.fontName);
      if (options.fontSize) params.append('fontSize', options.fontSize.toString());
      if (options.color) params.append('color', options.color);

      const response = await axios.post(`${this.baseUrl}/add-text-signature?${params.toString()}`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Add text signature failed:', error);
      throw new Error('Failed to add text signature to PDF');
    }
  }

  /**
   * Generate styled signature image
   */
  async generateSignature(text: string, style: string = 'cursive', width: number = 300, height: number = 100): Promise<Buffer> {
    try {
      const params = new URLSearchParams();
      params.append('text', text);
      params.append('style', style);
      params.append('width', width.toString());
      params.append('height', height.toString());

      const response = await axios.post(`${this.baseUrl}/generate-signature?${params.toString()}`, null, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Generate signature failed:', error);
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Convert PDF to Word
   */
  async convertToWord(fileBuffer: Buffer, filename: string): Promise<Buffer> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/convert-to-word`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('PDF to Word conversion failed:', error);
      throw new Error('Failed to convert PDF to Word');
    }
  }

  /**
   * Convert PDF to text
   */
  async convertToText(fileBuffer: Buffer, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/convert-to-text`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data.text;
    } catch (error) {
      console.error('PDF to text conversion failed:', error);
      throw new Error('Failed to convert PDF to text');
    }
  }

  /**
   * Convert PDF to HTML
   */
  async convertToHtml(fileBuffer: Buffer, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/convert-to-html`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data.html;
    } catch (error) {
      console.error('PDF to HTML conversion failed:', error);
      throw new Error('Failed to convert PDF to HTML');
    }
  }

  /**
   * Get PDF information
   */
  async getPdfInfo(fileBuffer: Buffer, filename: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/info`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get PDF info failed:', error);
      throw new Error('Failed to get PDF information');
    }
  }

  /**
   * Verify PDF signature
   */
  async verifySignature(fileBuffer: Buffer, filename: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseUrl}/verify-signature`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Signature verification failed:', error);
      throw new Error('Failed to verify PDF signature');
    }
  }
  // ==================== ADVANCED PDF OPERATIONS ====================

  /**
   * Add watermark to PDF
   */
  async addWatermark(pdfBuffer: Buffer, options: WatermarkOptions, imageBuffer?: Buffer): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    
    if (imageBuffer) {
      formData.append('watermarkImage', Readable.from(imageBuffer), 'watermark.png');
    }
    
    formData.append('text', options.text || '');
    formData.append('x', options.x.toString());
    formData.append('y', options.y.toString());
    formData.append('opacity', (options.opacity || 0.5).toString());
    formData.append('rotation', (options.rotation || 0).toString());
    formData.append('fontSize', (options.fontSize || 24).toString());
    formData.append('color', options.color || 'red');
    formData.append('fontFamily', options.fontFamily || 'Arial');

    const endpoint = imageBuffer ? 'add-image-watermark' : 'add-text-watermark';
    const response = await axios.post(`${this.advancedUrl}/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Apply watermark to all pages
   */
  async applyWatermarkToAllPages(pdfBuffer: Buffer, options: WatermarkAllPagesOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('text', options.text);
    formData.append('opacity', (options.opacity || 0.3).toString());
    formData.append('rotation', (options.rotation || 45).toString());
    formData.append('position', options.position || 'center');
    formData.append('fontSize', (options.fontSize || 36).toString());
    formData.append('color', options.color || 'lightgray');

    const response = await axios.post(`${this.advancedUrl}/apply-watermark-all-pages`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Secure PDF with password
   */
  async securePdf(pdfBuffer: Buffer, options: SecurityOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('password', options.password);
    formData.append('allowPrinting', options.permissions.print.toString());
    formData.append('allowCopy', options.permissions.copy.toString());
    formData.append('allowEdit', options.permissions.edit.toString());
    formData.append('allowAnnotations', options.permissions.annotate.toString());

    const response = await axios.post(`${this.advancedUrl}/secure-with-password`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Remove security/password from PDF
   */
  async removeSecurity(pdfBuffer: Buffer, options: RemoveSecurityOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    
    if (options.ownerPassword) {
      formData.append('ownerPassword', options.ownerPassword);
    }
    if (options.userPassword) {
      formData.append('userPassword', options.userPassword);
    }

    const response = await axios.post(`${this.advancedUrl}/remove-security`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Optimize PDF
   */
  async optimizePdf(pdfBuffer: Buffer, options: OptimizationOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('quality', options.quality);
    formData.append('compressImages', options.compressImages.toString());
    formData.append('removeMetadata', options.removeMetadata.toString());
    formData.append('dpi', options.dpi.toString());

    const response = await axios.post(`${this.advancedUrl}/optimize`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Add annotation to PDF
   */
  async addAnnotation(pdfBuffer: Buffer, options: AnnotationOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('type', options.type);
    formData.append('content', options.content);
    formData.append('x', options.x.toString());
    formData.append('y', options.y.toString());
    formData.append('width', options.width.toString());
    formData.append('height', options.height.toString());
    formData.append('pageNumber', options.pageNumber.toString());
    formData.append('color', options.color || 'yellow');

    const endpoint = options.type === 'highlight' ? 'add-highlight' : 
                    options.type === 'note' ? 'add-text-note' : 'add-drawing';
    
    const response = await axios.post(`${this.advancedUrl}/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Add form field to PDF
   */
  async addFormField(pdfBuffer: Buffer, options: FormFieldOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('fieldName', options.name);
    formData.append('x', options.x.toString());
    formData.append('y', options.y.toString());
    formData.append('width', options.width.toString());
    formData.append('height', options.height.toString());
    formData.append('pageNumber', options.pageNumber.toString());

    let endpoint = 'add-text-field';
    if (options.fieldType === 'checkbox') endpoint = 'add-checkbox';
    else if (options.fieldType === 'dropdown') endpoint = 'add-dropdown';
    
    const response = await axios.post(`${this.advancedUrl}/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Add image to PDF
   */
  async addImage(pdfBuffer: Buffer, imageBuffer: Buffer, options: ImageOptions): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('image', Readable.from(imageBuffer), 'image.png');
    formData.append('x', options.x.toString());
    formData.append('y', options.y.toString());
    formData.append('width', options.width.toString());
    formData.append('height', options.height.toString());
    formData.append('pageNumber', options.pageNumber.toString());
    formData.append('opacity', (options.opacity || 1.0).toString());

    const response = await axios.post(`${this.advancedUrl}/add-image`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Perform OCR on PDF
   */
  async performOcr(pdfBuffer: Buffer, language: string = 'eng'): Promise<any> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('language', language);

    const response = await axios.post(`${this.advancedUrl}/ocr`, formData, {
      headers: formData.getHeaders()
    });
    
    return response.data;
  }

  /**
   * Analyze PDF document
   */
  async analyzePdf(pdfBuffer: Buffer): Promise<any> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');

    const response = await axios.post(`${this.advancedUrl}/analyze`, formData, {
      headers: formData.getHeaders()
    });
    
    return response.data;
  }

  /**
   * Convert PDF to HTML
   */
  async convertToHtml(pdfBuffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');

    const response = await axios.post(`${this.baseUrl}/convert-to-html`, formData, {
      headers: formData.getHeaders()
    });
    
    return response.data.html;
  }

  /**
   * Convert PDF to images
   */
  async convertToImages(pdfBuffer: Buffer, format: string = 'png'): Promise<any> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('format', format);
    formData.append('dpi', '300');

    const response = await axios.post(`${this.advancedUrl}/convert-to-images`, formData, {
      headers: formData.getHeaders()
    });
    
    return response.data;
  }

  /**
   * Extract text content
   */
  async extractTextContent(pdfBuffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');

    const response = await axios.post(`${this.baseUrl}/convert-to-text`, formData, {
      headers: formData.getHeaders()
    });
    
    return response.data.text;
  }

  /**
   * Split PDF
   */
  async splitPdf(pdfBuffer: Buffer, splitBy: string, ranges?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    
    // Split by pages (simplified)
    const splitPoints = ranges || [1]; // Default split
    
    const response = await axios.post(`${this.baseUrl}/split`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'application/json'
      },
      data: splitPoints
    });
    
    return response.data;
  }

  /**
   * Rotate page
   */
  async rotatePage(pdfBuffer: Buffer, pageNumber: number, rotation: number): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    
    const rotations = { [pageNumber]: rotation };
    
    const response = await axios.post(`${this.baseUrl}/rotate-pages`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer',
      data: rotations
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Reorder pages
   */
  async reorderPages(pdfBuffer: Buffer, newOrder: number[]): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    
    const response = await axios.post(`${this.advancedUrl}/reorder-pages`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer',
      data: newOrder
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Find and replace text
   */
  async findReplaceText(pdfBuffer: Buffer, options: any): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('findText', options.findText);
    formData.append('replaceText', options.replaceText);
    formData.append('matchCase', options.matchCase.toString());
    formData.append('wholeWords', options.wholeWords.toString());
    
    const response = await axios.post(`${this.advancedUrl}/find-replace-formatted`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Remove pages
   */
  async removePages(pdfBuffer: Buffer, criteria: string, value: any): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('criteria', criteria);
    formData.append('value', value.toString());
    
    const response = await axios.post(`${this.advancedUrl}/remove-pages`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

  /**
   * Compress PDF
   */
  async compressPdf(pdfBuffer: Buffer, level: string = 'medium'): Promise<Buffer> {
    const formData = new FormData();
    formData.append('file', Readable.from(pdfBuffer), 'document.pdf');
    formData.append('compressionLevel', level);
    
    const response = await axios.post(`${this.advancedUrl}/compress`, formData, {
      headers: formData.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data);
  }

}

export const pdfEditorService = new PdfEditorService();