import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ResumeShare } from '../models/ResumeShare';
import { Resume } from '../models/Resume';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { resumeService as builderResumeService } from '../services/resume-builder/resumeService';
import { geoService } from '../services/geoService';
import { userAgentService } from '../services/userAgentService';

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
      const { resumeId, title, recipientEmail, recipientName, expiresAt, settings, trackingType } = req.body;
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
      const trackingUrl = `${process.env.FRONTEND_URL}/share/r/${shareId}`;
      
      let qrCodeDataUrl = '';
      if (trackingType === 'qr_code') {
        qrCodeDataUrl = await QRCode.toDataURL(trackingUrl);
      }

      const newShare = new ResumeShare({
        userId,
        resumeId,
        shareId,
        title: title || `Share for ${resume.personalInfo?.firstName || 'Resume'}`,
        recipientEmail,
        recipientName,
        expiresAt,
        trackingType: trackingType || 'link',
        settings: settings || {
          requireEmail: false,
          notifyOnView: true,
          allowDownload: true,
          showWatermark: true,
          trackLocation: true
        }
      });

      await newShare.save();

      res.status(201).json({
        success: true,
        data: {
          shareId,
          trackingUrl,
          qrCodeDataUrl,
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

      // Advanced tracking logic
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const uaString = req.headers['user-agent'] || '';
      const parsedUA = userAgentService.parse(uaString);
      
      let location = undefined;
      if (share.settings.trackLocation) {
        location = await geoService.resolveIp(ip);
      }

      // Track view
      const view = {
        ipAddress: ip,
        userAgent: uaString,
        browser: parsedUA.browser,
        os: parsedUA.os,
        device: parsedUA.device,
        location: location || undefined,
        referrer: req.headers['referer'] || req.headers['referrer'],
        viewedAt: new Date()
      };

      share.views.push(view as any);
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
      res.json({
        success: true,
        data: {
          resume: resume.toObject(),
          settings: share.settings,
          trackingId: share.shareId
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
