/**
 * jusDNCE AI - Type Definitions
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

export interface GeneratedFrame {
  imageData: string;
  timestamp: number;
  category?: string;
}

export interface GenerateDanceRequest {
  imageBase64: string;
  stylePrompt: string;
  motionPrompt: string;
  useTurbo: boolean;
}

export interface GenerateDanceResponse {
  frames: GeneratedFrame[];
  category: string;
  creditsRemaining: number;
}

export interface UserDocument {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  credits: number;
  createdAt: Date;
  lastLogin: Date;
  totalGenerations: number;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      amount_total: number;
      metadata?: {
        userId?: string;
        credits?: string;
      };
    };
  };
}
