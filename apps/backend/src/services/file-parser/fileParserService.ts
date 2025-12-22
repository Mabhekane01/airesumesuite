import fs from 'fs';
import path from 'path';
// @ts-ignore
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { geminiService } from '../ai/gemini';

export interface ParsedResumeData {
  text: string;
  extractedData: any;
}

export class FileParserService {
  private readonly supportedTypes = ['.pdf', '.doc', '.docx'];
  
  async parseResumeFile(filePath: string): Promise<ParsedResumeData> {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (!this.supportedTypes.includes(fileExtension)) {
      throw new Error(`Unsupported file type: ${fileExtension}. Supported types: ${this.supportedTypes.join(', ')}`);
    }

    let extractedText: string;

    try {
      switch (fileExtension) {
        case '.pdf':
          extractedText = await this.parsePDF(filePath);
          break;
        case '.doc':
        case '.docx':
          extractedText = await this.parseDocx(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Use Gemini AI to extract structured data from the text
      const extractedData = await geminiService.extractResumeFromText(extractedText);

      return {
        text: extractedText,
        extractedData
      };
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parsePDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text found in PDF file');
      }
      
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  private async parseDocx(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text found in DOCX file');
      }
      
      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX parsing warnings:', result.messages);
      }
      
      return result.value;
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  validateFileSize(fileSize: number, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return fileSize <= maxSizeInBytes;
  }

  validateFileType(filename: string): boolean {
    const fileExtension = path.extname(filename).toLowerCase();
    return this.supportedTypes.includes(fileExtension);
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
      // Don't throw error for cleanup failures
    }
  }
}

export const fileParserService = new FileParserService();