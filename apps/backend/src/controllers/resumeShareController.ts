import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ResumeShare } from '../models/ResumeShare';
import { Resume } from '../models/Resume';
import crypto from 'crypto';
import { resumeService as builderResumeService } from '../services/resume-builder/resumeService';

export class ResumeShareController {
  private generateShortId(length: number = 10): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Create a new tracking link for a resume
   */
  async createShare(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resumeId, title, recipientEmail, recipientName, expiresAt, settings } = req.body;
      const userId = req.user?.id;

      if (!resumeId) {
        res.status(400).json({ success: false, message: 'Resume ID is required' });
        return;
      }

      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        res.status(404).json({ success: false, message: 'Resume not found' });
        return;
      }

      const shareId = this.generateShortId();
      const newShare = new ResumeShare({
        userId,
        resumeId,
        shareId,
        title: title || `Share for ${resume.personalInfo?.firstName || 'Resume'}`,
        recipientEmail,
        recipientName,
        expiresAt,
        settings: settings || {
          requireEmail: false,
          notifyOnView: true,
          allowDownload: true
        }
      });

      await newShare.save();

      res.status(201).json({
        success: true,
        data: {
          shareId,
          trackingUrl: `${process.env.FRONTEND_URL}/share/r/${shareId}`,
          ...newShare.toObject()
        }
      });
    } catch (error) {
      console.error('Error creating resume share:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Get all shares for a user
   */
  async getShares(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const shares = await ResumeShare.find({ userId }).sort({ createdAt: -1 });
      
      res.json({ success: true, data: shares });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Get a specific share with its view history
   */
  async getShareStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const share = await ResumeShare.findOne({ _id: id, userId });
      if (!share) {
        res.status(404).json({ success: false, message: 'Share link not found' });
        return;
      }

      res.json({ success: true, data: share });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Public endpoint to access a shared resume
   * This endpoint tracks the view
   */
  async accessShare(req: any, res: Response): Promise<void> {
    try {
      const { shareId } = req.params;
      const share = await ResumeShare.findOne({ shareId, status: 'active' });

      if (!share) {
        res.status(404).json({ success: false, message: 'Link inactive or not found' });
        return;
      }

      // Check expiry
      if (share.expiresAt && share.expiresAt < new Date()) {
        share.status = 'expired';
        await share.save();
        res.status(410).json({ success: false, message: 'Link has expired' });
        return;
      }

      // Track view
      const view = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        viewedAt: new Date()
      };

      share.views.push(view);
      share.viewCount += 1;
      share.lastViewedAt = new Date();
      await share.save();

      // Get resume data
      const resume = await Resume.findById(share.resumeId);
      if (!resume) {
        res.status(404).json({ success: false, message: 'Original resume not found' });
        return;
      }

      // Return resume data for the shared view
      // In a real production app, we might render the PDF or a specific tracking page
      res.json({
        success: true,
        data: {
          resume: resume.toObject(),
          settings: share.settings
        }
      });
    } catch (error) {
      console.error('Error accessing shared resume:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Revoke a share link
   */
  async revokeShare(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const share = await ResumeShare.findOneAndUpdate(
        { _id: id, userId },
        { status: 'revoked' },
        { new: true }
      );

      if (!share) {
        res.status(404).json({ success: false, message: 'Share link not found' });
        return;
      }

      res.json({ success: true, message: 'Share link revoked successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const resumeShareController = new ResumeShareController();
