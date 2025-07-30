import { Request, Response } from 'express';
import { careerCoachService } from '../services/careerCoachService';
import { AuthenticatedRequest } from '../middleware/auth';

const chatWithCoach = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🤖 Career coach chat request:', {
      userId: req.user?.id,
      messageLength: req.body.message?.length,
      resumeId: req.body.resumeId
    });

    const { message, resumeId } = req.body;
    
    // Validate input
    if (!message || !message.trim()) {
      res.status(400).json({ 
        success: false,
        message: 'Message is required' 
      });
      return;
    }

    if (!resumeId) {
      res.status(400).json({ 
        success: false,
        message: 'Resume ID is required' 
      });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
      return;
    }

    console.log('✅ Getting AI response for career coaching...');
    const stream = await careerCoachService.getAIResponse(message.trim(), resumeId);

    // Set proper headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    console.log('🚀 Streaming AI response to client...');
    
    // Handle the Node.js stream and pipe it to response
    stream.on('data', (chunk) => {
      res.write(chunk);
    });

    stream.on('end', () => {
      console.log('✅ AI response stream completed');
      res.end();
    });

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false,
          message: 'AI service error' 
        });
      } else {
        res.end();
      }
    });

  } catch (error: any) {
    console.error('❌ Error in chatWithCoach controller:', error);
    
    // Handle specific error cases
    if (error.message?.includes('Resume not found')) {
      res.status(404).json({ 
        success: false,
        message: 'Resume not found. Please select a valid resume.' 
      });
    } else if (error.message?.includes('AI service')) {
      res.status(503).json({ 
        success: false,
        message: 'AI service is temporarily unavailable. Please try again later.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Failed to get response from AI coach',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Health check for career coach service
const checkHealth = async (req: Request, res: Response) => {
  try {
    // Basic health check - could be expanded to check AI service connectivity
    res.status(200).json({
      success: true,
      message: 'Career Coach service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Career coach health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Career Coach service is unavailable'
    });
  }
};

export const careerCoachController = {
  chatWithCoach,
  checkHealth,
};
