import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from local and root directory safely across ESM and monorepo
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('bolbahi_default_jwt_secret_key_at_least_32_characters_12345'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),

  // LLM
  LLM_PROVIDER: z.enum(['gemini', 'claude']).default('gemini'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-2.5-flash-lite'),
  GEMINI_API_KEY: z.string().default('YOUR_GEMINI_API_KEY'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-latest'),

  // Email
  RESEND_API_KEY: z.string().default('re_dummy_resend_api_key'),
  MAIL_FROM: z.string().default('BolBahi <onboarding@resend.dev>'),
  DEMO_EMAIL: z.string().default('demo@bolbahi.app'),

  // Logging & Versioning
  PROMPT_VERSION: z.string().default('v1.0.0'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment validation failed:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;

