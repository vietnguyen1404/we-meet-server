import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().positive().default(3000),
    DATABASE_URL: z.string().url(),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
    ACCESS_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_CALLBACK_URL: z.string().url(),
    // TURN / STUN configuration
    STUN_URLS: z.string().optional(),
    TURN_URLS: z.string().optional(),
    TURN_SECRET: z.string().min(16).optional(),
    TURN_USERNAME: z.string().optional(),
    TURN_PASSWORD: z.string().optional(),
    TURN_CREDENTIAL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  })
  .superRefine((data, ctx) => {
    if (data.TURN_URLS) {
      const hasDynamic = !!data.TURN_SECRET;
      const hasStatic = !!data.TURN_USERNAME && !!data.TURN_PASSWORD;
      if (!hasDynamic && !hasStatic) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['TURN_URLS'],
          message:
            'TURN_URLS is set but no credentials configured. Provide TURN_SECRET (dynamic mode) or both TURN_USERNAME and TURN_PASSWORD (static mode).',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
