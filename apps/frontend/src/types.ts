export interface INotification {
  _id: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'deadline';
  category: 'authentication' | 'payment' | 'resume' | 'application' | 'interview' | 'cover_letter' | 'career_coach' | 'system';
  title: string;
  message: string;
  read: boolean;
  readAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action?: {
    label: string;
    url: string;
    type: 'internal' | 'external';
  };
  metadata?: {
    entityType?: 'resume' | 'application' | 'interview' | 'payment' | 'user';
    entityId?: string;
    source?: string;
    additionalData?: Record<string, any>;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
