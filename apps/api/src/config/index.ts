import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI!,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'TourOps <noreply@tourops.com>',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    /** Overridable so a model rename never needs a code change. */
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  },
  flutterwave: {
    secretKey: process.env.FLW_SECRET_KEY || '',
    publicKey: process.env.FLW_PUBLIC_KEY || '',
    /** Shared secret echoed in the `verif-hash` webhook header. */
    secretHash: process.env.FLW_SECRET_HASH || '',
    /** Where Flutterwave sends the customer back after checkout. */
    redirectUrl:
      process.env.FLW_REDIRECT_URL ||
      `${process.env.CLIENT_URL || 'http://localhost:3000'}/billing/callback`,
  },
  billing: {
    trialDays: parseInt(process.env.TRIAL_DAYS || '30', 10),
    /** Read-only window after the paid-through date before the account locks. */
    graceDays: parseInt(process.env.GRACE_DAYS || '7', 10),
  },
} as const;
