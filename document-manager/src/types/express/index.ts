import { Request } from "express";
import { User } from "../index";

// Extend Express Request interface to include user property and other missing properties
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Extend Express Request interface to include organization property
export interface OrganizationRequest extends AuthenticatedRequest {
  organization?: any;
}

// Extend Express Request interface to include subscription tier
export interface SubscriptionRequest extends AuthenticatedRequest {
  subscriptionTier?: string;
}
