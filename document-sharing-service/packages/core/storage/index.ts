import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

export interface StorageConfig {
  type: 's3' | 'local';
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localPath?: string;
  cdnUrl?: string;
}

export interface UploadOptions {
  filename: string;
  contentType: string;
  isPublic?: boolean;
  expiresIn?: number;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket?: string;
  size: number;
  contentType: string;
}

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export class StorageService {
  private config: StorageConfig;
  private s3?: AWS.S3;

  constructor(config?: StorageConfig) {
    this.config = config || {
      type: process.env.STORAGE_TYPE as 's3' | 'local' || 'local',
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      localPath: process.env.LOCAL_STORAGE_PATH || './uploads',
      cdnUrl: process.env.CDN_URL,
    };

    if (this.config.type === 's3') {
      this.initializeS3();
    } else {
      this.initializeLocal();
    }
  }

  private initializeS3(): void {
    AWS.config.update({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      region: this.config.region,
    });

    this.s3 = new AWS.S3();
  }

  private initializeLocal(): void {
    if (!this.config.localPath) {
      throw new Error('Local storage path not configured');
    }

    if (!fs.existsSync(this.config.localPath)) {
      fs.mkdirSync(this.config.localPath, { recursive: true });
    }
  }

  public async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    if (this.config.type === 's3') {
      return this.uploadToS3(buffer, options);
    } else {
      return this.uploadToLocal(buffer, options);
    }
  }

  private async uploadToS3(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    if (!this.s3 || !this.config.bucket) {
      throw new Error('S3 not properly configured');
    }

    const key = this.generateKey(options.filename);
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
      ACL: options.isPublic ? 'public-read' : 'private',
      Metadata: options.metadata || {},
    };

    if (options.expiresIn) {
      const expiresDate = new Date();
      expiresDate.setTime(expiresDate.getTime() + options.expiresIn * 1000);
      params.Expires = expiresDate;
    }

    const result = await this.s3.upload(params).promise();

    return {
      url: this.config.cdnUrl ? `${this.config.cdnUrl}/${key}` : result.Location,
      key,
      bucket: this.config.bucket,
      size: buffer.length,
      contentType: options.contentType,
    };
  }

  private async uploadToLocal(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    if (!this.config.localPath) {
      throw new Error('Local storage path not configured');
    }

    const key = this.generateKey(options.filename);
    const filePath = path.join(this.config.localPath, key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await writeFile(filePath, buffer);

    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    return {
      url: `${baseUrl}/files/${key}`,
      key,
      size: buffer.length,
      contentType: options.contentType,
    };
  }

  public async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.config.type === 's3' && this.s3 && this.config.bucket) {
      const params = {
        Bucket: this.config.bucket,
        Key: key,
        Expires: expiresIn,
      };
      return this.s3.getSignedUrl('getObject', params);
    } else {
      const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
      return `${baseUrl}/files/${key}`;
    }
  }

  public async delete(key: string): Promise<void> {
    if (this.config.type === 's3' && this.s3 && this.config.bucket) {
      await this.s3.deleteObject({
        Bucket: this.config.bucket,
        Key: key,
      }).promise();
    } else if (this.config.localPath) {
      const filePath = path.join(this.config.localPath, key);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (this.config.type === 's3' && this.s3 && this.config.bucket) {
      try {
        await this.s3.headObject({
          Bucket: this.config.bucket,
          Key: key,
        }).promise();
        return true;
      } catch {
        return false;
      }
    } else if (this.config.localPath) {
      const filePath = path.join(this.config.localPath, key);
      return fs.existsSync(filePath);
    }
    return false;
  }

  private generateKey(filename: string): string {
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}-${name}${ext}`;
  }
}