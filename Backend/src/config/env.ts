import 'dotenv/config'
import { z } from 'zod'

export function parseAllowedOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin
      } catch {
        throw new Error(`Invalid frontend origin: ${origin}`)
      }
    })
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    FRONTEND_ORIGIN: z
      .string()
      .min(1, 'FRONTEND_ORIGIN is required')
      .refine((value) => {
        try {
          const origins = parseAllowedOrigins(value)
          return origins.length > 0
        } catch {
          return false
        }
      }, 'FRONTEND_ORIGIN must use HTTP or HTTPS and may include a comma-separated list of origins.'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
    INQUIRY_WEBHOOK_URL: z
      .union([
        z.url().refine((value) => /^https:\/\//i.test(value), 'Webhook URL must use HTTPS.'),
        z.literal(''),
      ])
      .optional(),
  })
  .superRefine((configuration, context) => {
    if (configuration.NODE_ENV === 'production' && !configuration.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production.',
      })
    }
  })

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error(
    'Invalid server configuration:',
    result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
  )
  process.exit(1)
}

export const env = {
  ...result.data,
  FRONTEND_ORIGINS: parseAllowedOrigins(result.data.FRONTEND_ORIGIN),
}
