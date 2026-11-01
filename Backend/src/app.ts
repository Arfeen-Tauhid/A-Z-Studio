import bcrypt from 'bcryptjs'
import { v2 as cloudinary } from 'cloudinary'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { randomInt } from 'node:crypto'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { z } from 'zod'
import { env } from './config/env.js'
import {
  AdminModel,
  AdminActivityModel,
  BlogAuthorModel,
  BlogPostModel,
  BlogWritingRequestModel,
  ClientModel,
  InquiryModel,
  ProjectModel,
  RatingModel,
  ServiceModel,
  SiteSettingsModel,
  TestimonialModel,
} from './models/index.js'
import { errorHandler, HttpError, notFound } from './middleware/errors.js'
import {
  requireAdmin,
  requireAdminPermission,
  requireAdminResourceAccess,
  requireOwner,
} from './middleware/auth.js'
import { requireBlogAuthor } from './middleware/blogAuth.js'
import { getMediaPolicyError, mediaLimits } from './services/mediaPolicy.js'
import { ensureAdminNumber, nextAdminNumber, recordAdminActivity } from './services/adminAudit.js'
import { projectSlugFromTitle, youtubeThumbnailUrl } from './services/youtube.js'
import {
  adminInquirySchema,
  adminInquiryUpdateSchema,
  adminLoginHoldSchema,
  adminPermissionsSchema,
  blogAuthorLoginSchema,
  blogLoginHoldSchema,
  blogPostSchema,
  blogReviewSchema,
  blogWritingRequestSchema,
  blogWritingRequestReviewSchema,
  clientSchema,
  createBlogAuthorSchema,
  createAdminSchema,
  inquiryStatusSchema,
  inquirySchema,
  loginSchema,
  projectSchema,
  publicRatingSchema,
  serviceSchema,
  siteSettingsSchema,
  testimonialSchema,
} from './validators/index.js'

const app = express()
let databaseConnection: Promise<typeof mongoose> | null = null
const uploadSchema = z.object({ resourceType: z.enum(['image', 'video']) })
const uploadedMediaSchema = z.object({
  resourceType: z.enum(['image', 'video']),
  publicId: z.string().trim().min(1).max(300),
})
const dummyPasswordHash = bcrypt.hashSync('az-studios-invalid-password', 12)
const dummyBlogPasswordHash = bcrypt.hashSync('az-studios-invalid-blog-password', 12)
const cookieSameSite = env.COOKIE_SECURE ? 'none' : 'strict'
app.disable('x-powered-by')
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY)
app.use(helmet())
app.use(cors({ origin: new URL(env.FRONTEND_ORIGIN).origin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use((request, response, next) => {
  const startedAt = Date.now()
  response.on('finish', () => {
    console.info(
      `${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`,
    )
  })
  next()
})

app.use('/api', async (_request, _response, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      databaseConnection ??= mongoose.connect(env.MONGODB_URI).catch((error: unknown) => {
        databaseConnection = null
        throw error
      })
      await databaseConnection
    }
    next()
  } catch (error) {
    next(error)
  }
})

const makeRateLimiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => {
      response
        .status(429)
        .json({ error: { message: 'Too many requests. Please try again later.' } })
    },
  })
const loginLimiter = makeRateLimiter(15 * 60 * 1000, 10)
const inquiryLimiter = makeRateLimiter(60 * 60 * 1000, 5)
const inquiryLookupLimiter = makeRateLimiter(15 * 60 * 1000, 10)
const ratingLimiter = makeRateLimiter(60 * 60 * 1000, 3)
const blogRequestLimiter = makeRateLimiter(60 * 60 * 1000, 3)
const blogLoginLimiter = makeRateLimiter(15 * 60 * 1000, 10)
const blogEngagementLimiter = makeRateLimiter(60 * 1000, 40)
const apiLimiter = makeRateLimiter(15 * 60 * 1000, 300)
app.use('/api', apiLimiter)
app.use(
  [
    '/api/public/projects',
    '/api/public/services',
    '/api/public/clients',
    '/api/public/testimonials',
    '/api/public/ratings',
    '/api/public/site-settings',
    '/api/public/blogs',
  ],
  (request, response, next) => {
    if (request.method === 'GET') {
      response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    }
    next()
  },
)

function sendData<T>(response: Response, data: T, status = 200) {
  response.status(status).json({ data })
}

function parsePage(value: unknown, fallback: number, maximum: number) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value))
    throw new HttpError(400, 'Pagination values must be positive integers.')
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new HttpError(400, 'Pagination values must be positive integers.')
  return Math.min(parsed, maximum)
}

function pagination(query: Request['query']) {
  const page = parsePage(query.page, 1, 100000)
  const limit = parsePage(query.limit, 9, 50)
  return { page, limit, skip: (page - 1) * limit }
}

function isDuplicateInquiryNumber(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000 &&
    'keyPattern' in error &&
    typeof error.keyPattern === 'object' &&
    error.keyPattern !== null &&
    'inquiryNumber' in error.keyPattern
  )
}

async function createInquiryRecord<T extends object>(input: T, consent: boolean) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await InquiryModel.create({
        ...input,
        inquiryNumber: String(randomInt(10_000_000, 100_000_000)),
        consent,
      })
    } catch (error) {
      if (!isDuplicateInquiryNumber(error) || attempt === 4) throw error
    }
  }
  throw new Error('Could not generate a unique inquiry number.')
}

app.get('/api/health', (_request, response) => {
  sendData(response, {
    status: mongoose.connection.readyState === 1 ? 'ok' : 'database_unavailable',
  })
})

app.get('/api/public/projects', async (request, response) => {
  const { page, limit, skip } = pagination(request.query)
  const filter: Record<string, unknown> = { status: 'published' }
  if (typeof request.query.category === 'string' && request.query.category !== 'All work') {
    filter.category = request.query.category
  }
  const [items, total] = await Promise.all([
    ProjectModel.find(filter)
      .select('-videoPublicId -thumbnailPublicId -__v')
      .sort({ publishedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProjectModel.countDocuments(filter),
  ])
  sendData(response, { items, page, pages: Math.ceil(total / limit), total })
})

app.get('/api/public/projects/:slug', async (request, response) => {
  const project = await ProjectModel.findOne({ slug: request.params.slug, status: 'published' })
    .select('-videoPublicId -thumbnailPublicId -__v')
    .lean()
  if (!project) throw new HttpError(404, 'Project not found.')
  sendData(response, project)
})

app.get('/api/public/services', async (_request, response) => {
  const items = await ServiceModel.find({ isActive: true })
    .select('-__v')
    .sort({ sortOrder: 1, title: 1 })
    .lean()
  sendData(response, items)
})

app.get('/api/public/clients', async (_request, response) => {
  const items = await ClientModel.find({ isPublished: true })
    .select('name videoUrl videoThumbnailUrl commentScreenshotUrl socialPlatform socialHandle')
    .sort({ name: 1 })
    .lean()
  sendData(response, items)
})

app.get('/api/public/testimonials', async (_request, response) => {
  const items = await TestimonialModel.find({ status: 'approved' })
    .select('-profileImagePublicId -commentScreenshotPublicId -__v')
    .sort({ createdAt: -1 })
    .lean()
  sendData(response, items)
})

async function publicRatingSummary() {
  const [results, recent] = await Promise.all([
    RatingModel.aggregate<{ count: number; average: number }>([
      { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } },
    ]),
    RatingModel.find()
      .select('rating name socialPlatform feedback createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .lean(),
  ])
  const result = results[0]
  return {
    count: result?.count ?? 0,
    average: result?.average ?? 0,
    recent,
  }
}

app.get('/api/public/ratings', async (_request, response) => {
  sendData(response, await publicRatingSummary())
})

app.get('/api/public/site-settings', async (_request, response) => {
  const item = await SiteSettingsModel.findOne({ key: 'main' })
    .select('-__v -showreelPublicId')
    .lean()
  sendData(response, item ?? {})
})

app.get('/api/public/blogs', async (request, response) => {
  const { page, limit, skip } = pagination(request.query)
  const sort = request.query.sort ?? 'recent'
  if (!['recent', 'views', 'likes'].includes(String(sort))) {
    throw new HttpError(400, 'Choose recent, views, or likes blog sorting.')
  }
  const authorEmployeeId =
    typeof request.query.author === 'string' ? request.query.author.toUpperCase() : undefined
  if (authorEmployeeId && !/^BLOG\d{4}$/.test(authorEmployeeId)) {
    throw new HttpError(400, 'Enter a valid BLOG employee ID, such as BLOG1234.')
  }
  const author = authorEmployeeId
    ? await BlogAuthorModel.findOne({ employeeId: authorEmployeeId }).select('_id').lean()
    : null
  if (authorEmployeeId && !author)
    throw new HttpError(404, 'No blog writer was found with that ID.')
  const filter = {
    status: 'published' as const,
    ...(author ? { authorId: author._id } : {}),
  }
  const sortBy: Record<string, 1 | -1> =
    sort === 'views'
      ? { viewCount: -1 as const, publishedAt: -1 as const, _id: -1 as const }
      : sort === 'likes'
        ? { likeCount: -1 as const, publishedAt: -1 as const, _id: -1 as const }
        : { publishedAt: -1 as const, _id: -1 as const }
  const [items, total] = await Promise.all([
    BlogPostModel.find(filter)
      .select(
        'title slug category excerpt authorName authorEmployeeId publishedAt createdAt viewCount likeCount',
      )
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean(),
    BlogPostModel.countDocuments(filter),
  ])
  sendData(response, { items, page, pages: Math.ceil(total / limit), total })
})

app.get('/api/public/blogs/:slug', async (request, response) => {
  const post = await BlogPostModel.findOne({ slug: request.params.slug, status: 'published' })
    .select('-authorId -reviewedBy -reviewedAt -__v')
    .lean()
  if (!post) throw new HttpError(404, 'Blog post not found.')
  sendData(response, post)
})

app.post('/api/public/blogs/:slug/view', blogEngagementLimiter, async (request, response) => {
  const post = await BlogPostModel.findOneAndUpdate(
    { slug: request.params.slug, status: 'published' },
    { $inc: { viewCount: 1 } },
    { new: true, projection: 'viewCount' },
  ).lean()
  if (!post) throw new HttpError(404, 'Blog post not found.')
  sendData(response, { viewCount: post.viewCount })
})

app.post('/api/public/blogs/:slug/like', blogEngagementLimiter, async (request, response) => {
  const post = await BlogPostModel.findOneAndUpdate(
    { slug: request.params.slug, status: 'published' },
    { $inc: { likeCount: 1 } },
    { new: true, projection: 'likeCount' },
  ).lean()
  if (!post) throw new HttpError(404, 'Blog post not found.')
  sendData(response, { likeCount: post.likeCount })
})

app.post('/api/public/blog-writing-requests', blogRequestLimiter, async (request, response) => {
  const input = blogWritingRequestSchema.parse(request.body)
  const email = input.email.toLowerCase()
  if (await BlogAuthorModel.exists({ email })) {
    throw new HttpError(409, 'A blog author account already exists for this email.')
  }
  const existingRequest = await BlogWritingRequestModel.findOne({
    email,
    status: { $in: ['pending', 'approved'] },
  }).lean()
  if (existingRequest) {
    throw new HttpError(409, 'A writing request for this email is already being reviewed.')
  }
  await BlogWritingRequestModel.create({ ...input, email })
  sendData(response, { message: 'Your request has been sent for review.' }, 201)
})

app.post('/api/blog/auth/login', blogLoginLimiter, async (request, response) => {
  const { identifier, password } = blogAuthorLoginSchema.parse(request.body)
  const author = await BlogAuthorModel.findOne(
    /^BLOG\d{4}$/i.test(identifier)
      ? { employeeId: identifier.toUpperCase() }
      : { email: identifier.toLowerCase() },
  ).select('+passwordHash')
  const passwordIsValid = await bcrypt.compare(
    password,
    author?.passwordHash ?? dummyBlogPasswordHash,
  )
  if (!author || !passwordIsValid)
    throw new HttpError(401, 'Email or BLOG ID or password is incorrect.')
  if (author.loginHeld) throw new HttpError(403, 'This blog author login is on hold.')

  const token = jwt.sign({ kind: 'blog-author' }, env.JWT_SECRET, {
    subject: author.id,
    expiresIn: '8h',
  })
  response.cookie('az_blog', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: cookieSameSite,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  })
  sendData(response, {
    employeeId: author.employeeId,
    email: author.email,
    name: author.name,
  })
})

app.post('/api/blog/auth/logout', (_request, response) => {
  response.clearCookie('az_blog', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: cookieSameSite,
    path: '/',
  })
  sendData(response, { message: 'Logged out.' })
})

app.get('/api/blog/auth/me', requireBlogAuthor, async (request, response) => {
  sendData(response, {
    employeeId: request.blogAuthorEmployeeId,
    email: request.blogAuthorEmail,
    name: request.blogAuthorName,
  })
})

app.get('/api/blog/author/posts', requireBlogAuthor, async (request, response) => {
  const posts = await BlogPostModel.find({ authorId: request.blogAuthorId })
    .select('-authorId -__v')
    .sort({ createdAt: -1 })
    .lean()
  sendData(response, posts)
})

app.post('/api/blog/author/posts', requireBlogAuthor, async (request, response) => {
  const input = blogPostSchema.parse(request.body)
  const post = await BlogPostModel.create({
    authorId: request.blogAuthorId,
    authorEmployeeId: request.blogAuthorEmployeeId,
    authorName: request.blogAuthorName,
    ...input,
    slug: `${projectSlugFromTitle(input.title)}-${randomInt(1000, 10000)}`,
  })
  sendData(response, post, 201)
})

app.patch('/api/blog/author/posts/:id', requireBlogAuthor, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id))
    throw new HttpError(400, 'Invalid blog post ID.')
  const input = blogPostSchema.parse(request.body)
  const post = await BlogPostModel.findOne({
    _id: request.params.id,
    authorId: request.blogAuthorId,
  })
  if (!post) throw new HttpError(404, 'Blog post not found.')

  post.title = input.title
  post.category = input.category
  post.excerpt = input.excerpt
  post.content = input.content
  post.status = 'pending'
  post.reviewedBy = undefined
  post.reviewedAt = undefined
  post.publishedAt = undefined
  post.slug = `${projectSlugFromTitle(input.title)}-${randomInt(1000, 10000)}`
  await post.save()
  sendData(response, post)
})

app.get('/api/public/inquiries/:inquiryNumber', inquiryLookupLimiter, async (request, response) => {
  const { inquiryNumber } = request.params
  if (typeof inquiryNumber !== 'string' || !/^\d{8}$/.test(inquiryNumber)) {
    throw new HttpError(400, 'Enter your 8-digit inquiry number.')
  }
  const inquiry = await InquiryModel.findOne({ inquiryNumber })
    .select('inquiryNumber status')
    .lean()
  if (!inquiry) throw new HttpError(404, 'No inquiry was found with that number.')
  sendData(response, inquiry)
})

app.post('/api/public/inquiries', inquiryLimiter, async (request, response) => {
  const input = inquirySchema.parse(request.body)
  if (input.website) throw new HttpError(400, 'The inquiry could not be accepted.')
  const { website: _honeypot, ...inquiry } = input
  const item = await createInquiryRecord(inquiry, true)
  if (env.INQUIRY_WEBHOOK_URL) {
    try {
      const notification = await fetch(env.INQUIRY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_inquiry',
          inquiry: {
            ...inquiry,
            id: item.id,
            inquiryNumber: item.inquiryNumber,
            createdAt: item.createdAt,
          },
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (!notification.ok)
        console.error(`Inquiry notification webhook returned HTTP ${notification.status}.`)
    } catch (error) {
      console.error('Inquiry was saved, but the configured notification webhook failed:', error)
    }
  }
  sendData(
    response,
    {
      inquiryNumber: item.inquiryNumber,
      message: 'Your inquiry was received.',
    },
    201,
  )
})

app.post('/api/public/ratings', ratingLimiter, async (request, response) => {
  const rating = publicRatingSchema.parse(request.body)
  await RatingModel.create(rating)
  sendData(
    response,
    {
      ...(await publicRatingSummary()),
      message: 'Thank you for rating your experience.',
    },
    201,
  )
})

app.post('/api/admin/auth/login', loginLimiter, async (request, response) => {
  const { identifier, password } = loginSchema.parse(request.body)
  const admin = await AdminModel.findOne(
    /^AZ\d{4}$/i.test(identifier)
      ? { adminNumber: identifier.toUpperCase() }
      : { email: identifier.toLowerCase() },
  ).select('+passwordHash')
  const passwordIsValid = await bcrypt.compare(password, admin?.passwordHash ?? dummyPasswordHash)
  if (!admin || !passwordIsValid) throw new HttpError(401, 'Email or password is incorrect.')
  if (admin.loginHeld)
    throw new HttpError(403, 'This admin login is on hold. Contact the account owner.')
  const adminNumber = await ensureAdminNumber(admin.id, admin.adminNumber)

  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: admin.id,
    expiresIn: '8h',
  })
  response.cookie('az_admin', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: cookieSameSite,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  })
  sendData(response, {
    email: admin.email,
    adminNumber,
    role: admin.role,
    permissions: admin.permissions ?? [],
  })
})

app.post('/api/admin/auth/logout', (_request, response) => {
  response.clearCookie('az_admin', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: cookieSameSite,
    path: '/',
  })
  sendData(response, { message: 'Logged out.' })
})

app.get('/api/admin/auth/me', requireAdmin, async (request, response) => {
  const admin = await AdminModel.findById(request.adminId)
    .select('email role permissions adminNumber loginHeld')
    .lean()
  if (!admin) throw new HttpError(401, 'Admin account not found.')
  sendData(response, {
    email: admin.email,
    adminNumber: request.adminNumber,
    role: admin.role,
    permissions: admin.permissions ?? [],
  })
})

app.use('/api/admin', requireAdmin)
app.use('/api/admin', requireAdminResourceAccess)

app.get(
  '/api/admin/blog-writing-requests',
  requireAdminPermission('blog-writing-requests'),
  async (_request, response) => {
    const requests = await BlogWritingRequestModel.find().sort({ createdAt: -1 }).lean()
    sendData(response, requests)
  },
)

app.patch(
  '/api/admin/blog-writing-requests/:id',
  requireAdminPermission('blog-writing-requests'),
  async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id))
      throw new HttpError(400, 'Invalid writing request ID.')
    const { status } = blogWritingRequestReviewSchema.parse(request.body)
    const item = await BlogWritingRequestModel.findById(request.params.id)
    if (!item) throw new HttpError(404, 'Writing request not found.')
    if (item.status === 'account_created') {
      throw new HttpError(409, 'This writing request already has a blog author account.')
    }
    item.status = status
    item.reviewedBy = `${request.adminNumber} ${request.adminEmail}`
    item.reviewedAt = new Date()
    await item.save()
    await recordAdminActivity(request, {
      action: 'update',
      resource: 'Blog writing request',
      recordId: item.id,
      recordLabel: `${item.name} · ${item.email}`,
      changedFields: ['status'],
    })
    sendData(response, item)
  },
)

app.post(
  '/api/admin/blog-authors',
  requireAdminPermission('blog-writing-requests'),
  async (request, response) => {
    const input = createBlogAuthorSchema.parse(request.body)
    if (!mongoose.isValidObjectId(input.requestId)) throw new HttpError(400, 'Invalid request ID.')
    const application = await BlogWritingRequestModel.findById(input.requestId)
    if (!application) throw new HttpError(404, 'Writing request not found.')
    if (application.status !== 'approved') {
      throw new HttpError(400, 'Approve the writing request before creating an author account.')
    }
    if (await BlogAuthorModel.exists({ requestId: application._id })) {
      throw new HttpError(409, 'A blog author account has already been created for this request.')
    }
    if (await BlogAuthorModel.exists({ email: application.email })) {
      throw new HttpError(409, 'A blog author account already exists for this email.')
    }

    let employeeId = ''
    for (let attempt = 0; attempt < 100; attempt += 1) {
      employeeId = `BLOG${randomInt(0, 10_000).toString().padStart(4, '0')}`
      if (!(await BlogAuthorModel.exists({ employeeId }))) break
      employeeId = ''
    }
    if (!employeeId) throw new Error('Could not generate an available BLOG employee ID.')

    const passwordHash = await bcrypt.hash(input.password, 12)
    const author = await BlogAuthorModel.create({
      employeeId,
      requestId: application._id,
      name: application.name,
      email: application.email,
      passwordHash,
    })
    application.status = 'account_created'
    application.reviewedBy = `${request.adminNumber} ${request.adminEmail}`
    application.reviewedAt = new Date()
    await application.save()
    await recordAdminActivity(request, {
      action: 'create',
      resource: 'Blog author account',
      recordId: author.id,
      recordLabel: `${author.employeeId} ${author.email}`,
    })
    sendData(
      response,
      {
        _id: author.id,
        employeeId: author.employeeId,
        name: author.name,
        email: author.email,
        loginHeld: author.loginHeld,
        createdAt: author.createdAt,
      },
      201,
    )
  },
)

app.get(
  '/api/admin/blog-authors',
  requireAdminPermission('blog-writers'),
  async (_request, response) => {
    const authors = await BlogAuthorModel.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean()
    sendData(response, authors)
  },
)

app.patch(
  '/api/admin/blog-authors/:id/login-hold',
  requireAdminPermission('blog-writers'),
  async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid author ID.')
    const { loginHeld } = blogLoginHoldSchema.parse(request.body)
    const author = await BlogAuthorModel.findById(request.params.id)
    if (!author) throw new HttpError(404, 'Blog author account not found.')
    author.loginHeld = loginHeld
    await author.save()
    await recordAdminActivity(request, {
      action: loginHeld ? 'login-hold' : 'login-release',
      resource: 'Blog author account',
      recordId: author.id,
      recordLabel: `${author.employeeId} ${author.email}`,
      changedFields: ['loginHeld'],
    })
    sendData(response, {
      _id: author.id,
      employeeId: author.employeeId,
      name: author.name,
      email: author.email,
      loginHeld: author.loginHeld,
      createdAt: author.createdAt,
    })
  },
)

app.get(
  '/api/admin/blog-posts',
  requireAdminPermission('blog-post-review'),
  async (request, response) => {
    const status = (['pending', 'published', 'declined'] as const).find(
      (option) => option === request.query.status,
    )
    const filter = status ? { status } : {}
    const posts = await BlogPostModel.find(filter).sort({ createdAt: -1 }).lean()
    sendData(response, posts)
  },
)

app.patch(
  '/api/admin/blog-posts/:id/review',
  requireAdminPermission('blog-post-review'),
  async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id))
      throw new HttpError(400, 'Invalid blog post ID.')
    const { status } = blogReviewSchema.parse(request.body)
    const post = await BlogPostModel.findById(request.params.id)
    if (!post) throw new HttpError(404, 'Blog post not found.')
    const previousStatus = post.status
    post.status = status
    post.reviewedBy = `${request.adminNumber} ${request.adminEmail}`
    post.reviewedAt = new Date()
    post.publishedAt = status === 'published' ? (post.publishedAt ?? new Date()) : undefined
    await post.save()
    await recordAdminActivity(request, {
      action: 'update',
      resource: 'Blog post',
      recordId: post.id,
      recordLabel: post.title,
      changedFields: previousStatus === status ? [] : ['status'],
    })
    sendData(response, post)
  },
)

app.patch(
  '/api/admin/blog-posts/:id',
  requireAdminPermission('blog-post-review'),
  async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id))
      throw new HttpError(400, 'Invalid blog post ID.')
    const input = blogPostSchema.parse(request.body)
    const post = await BlogPostModel.findById(request.params.id)
    if (!post) throw new HttpError(404, 'Blog post not found.')
    const changedFields = (['title', 'category', 'excerpt', 'content'] as const).filter(
      (field) => post[field] !== input[field],
    )
    post.title = input.title
    post.category = input.category
    post.excerpt = input.excerpt
    post.content = input.content
    await post.save()
    await recordAdminActivity(request, {
      action: 'update',
      resource: 'Blog post',
      recordId: post.id,
      recordLabel: post.title,
      changedFields,
    })
    sendData(response, post)
  },
)

app.delete(
  '/api/admin/blog-posts/:id',
  requireAdminPermission('blog-post-review'),
  async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id))
      throw new HttpError(400, 'Invalid blog post ID.')
    const post = await BlogPostModel.findByIdAndDelete(request.params.id)
    if (!post) throw new HttpError(404, 'Blog post not found.')
    await recordAdminActivity(request, {
      action: 'delete',
      resource: 'Blog post',
      recordId: post.id,
      recordLabel: post.title,
    })
    response.status(204).end()
  },
)

app.get('/api/admin/admins', requireOwner, async (_request, response) => {
  const admins = await AdminModel.find()
    .select('adminNumber email role permissions loginHeld createdAt')
    .sort({ createdAt: 1 })
    .lean()
  await Promise.all(
    admins.map(async (admin) => {
      if (typeof admin.adminNumber !== 'string' || !/^AZ\d{4}$/.test(admin.adminNumber)) {
        admin.adminNumber = await ensureAdminNumber(String(admin._id), admin.adminNumber)
      }
    }),
  )
  sendData(response, admins)
})

app.post(
  '/api/admin/admins',
  requireAdminPermission('create-admins'),
  async (request, response) => {
    const input = createAdminSchema.parse(request.body)
    if (
      request.adminRole !== 'owner' &&
      input.permissions.some((permission) => !request.adminPermissions?.includes(permission))
    ) {
      throw new HttpError(403, 'You can only assign permissions that you hold.')
    }
    const passwordHash = await bcrypt.hash(input.password, 12)
    const allPermissions = [
      'projects',
      'clients',
      'testimonials',
      'services',
      'site-settings',
      'inquiries',
      'ratings',
    ] as const
    const role = allPermissions.every((permission) => input.permissions.includes(permission))
      ? 'full'
      : 'custom'
    const adminNumber = await nextAdminNumber()
    const admin = await AdminModel.create({
      adminNumber,
      email: input.email.toLowerCase(),
      passwordHash,
      role,
      permissions: input.permissions,
    })
    await recordAdminActivity(request, {
      action: 'create',
      resource: 'Admin account',
      recordId: admin.id,
      recordLabel: `${admin.adminNumber} ${admin.email}`,
    })
    sendData(
      response,
      {
        _id: admin.id,
        adminNumber: admin.adminNumber,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        createdAt: admin.createdAt,
      },
      201,
    )
  },
)

app.patch('/api/admin/admins/:id/permissions', requireOwner, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid admin ID.')
  const { permissions } = adminPermissionsSchema.parse(request.body)
  const target = await AdminModel.findById(request.params.id)
  if (!target) throw new HttpError(404, 'Admin account not found.')
  if (target.role === 'owner') {
    throw new HttpError(403, 'Owner permissions cannot be changed from the dashboard.')
  }
  const allPermissions = [
    'projects',
    'clients',
    'testimonials',
    'services',
    'site-settings',
    'inquiries',
    'ratings',
  ] as const
  target.permissions = permissions
  target.role = allPermissions.every((permission) => permissions.includes(permission))
    ? 'full'
    : 'custom'
  await target.save()
  await recordAdminActivity(request, {
    action: 'permissions',
    resource: 'Admin account',
    recordId: target.id,
    recordLabel: `${target.adminNumber} ${target.email}`,
    changedFields: ['permissions', 'role'],
  })
  sendData(response, {
    _id: target.id,
    adminNumber: target.adminNumber,
    email: target.email,
    role: target.role,
    permissions: target.permissions,
    createdAt: target.createdAt,
  })
})

app.patch('/api/admin/admins/:id/login-hold', requireOwner, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid admin ID.')
  if (request.params.id === request.adminId) {
    throw new HttpError(400, 'You cannot place your own admin account on hold.')
  }
  const { loginHeld } = adminLoginHoldSchema.parse(request.body)
  const target = await AdminModel.findById(request.params.id)
  if (!target) throw new HttpError(404, 'Admin account not found.')
  if (target.role === 'owner') {
    throw new HttpError(403, 'Owner accounts cannot be placed on hold.')
  }
  target.loginHeld = loginHeld
  await target.save()
  await recordAdminActivity(request, {
    action: loginHeld ? 'login-hold' : 'login-release',
    resource: 'Admin account',
    recordId: target.id,
    recordLabel: `${target.adminNumber} ${target.email}`,
    changedFields: ['loginHeld'],
  })
  sendData(response, {
    _id: target.id,
    adminNumber: target.adminNumber,
    email: target.email,
    role: target.role,
    permissions: target.permissions,
    loginHeld: target.loginHeld,
    createdAt: target.createdAt,
  })
})

app.delete('/api/admin/admins/:id', requireOwner, async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid admin ID.')
  if (request.params.id === request.adminId) {
    throw new HttpError(400, 'You cannot revoke your own admin account.')
  }
  const target = await AdminModel.findById(request.params.id).select('role email adminNumber')
  if (!target) throw new HttpError(404, 'Admin account not found.')
  if (target.role === 'owner') {
    throw new HttpError(403, 'Owner accounts cannot be removed from the dashboard.')
  }
  await target.deleteOne()
  await recordAdminActivity(request, {
    action: 'revoke',
    resource: 'Admin account',
    recordId: target.id,
    recordLabel: `${target.adminNumber} ${target.email}`,
  })
  response.status(204).end()
})

app.get('/api/admin/activity', requireAdminPermission('activity'), async (_request, response) => {
  const items = await AdminActivityModel.find()
    .select('-__v')
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .lean()
  sendData(response, items)
})

app.get('/api/admin/dashboard', async (request, response) => {
  const permissions = request.adminPermissions ?? []
  const canRead = (permission: string) =>
    request.adminRole === 'owner' ||
    request.adminRole === 'full' ||
    (request.adminRole === 'limited' &&
      ['projects', 'services', 'clients', 'testimonials'].includes(permission)) ||
    permissions.includes(permission)
  const [projects, inquiries, publishedProjects, newInquiries] = await Promise.all([
    canRead('projects')
      ? ProjectModel.countDocuments({ status: { $ne: 'archived' } })
      : Promise.resolve(0),
    canRead('inquiries') ? InquiryModel.countDocuments() : Promise.resolve(0),
    canRead('projects') ? ProjectModel.countDocuments({ status: 'published' }) : Promise.resolve(0),
    canRead('inquiries') ? InquiryModel.countDocuments({ status: 'new' }) : Promise.resolve(0),
  ])
  sendData(response, { projects, inquiries, publishedProjects, newInquiries })
})

type ContentPage = { items: unknown[]; total: number }
type ContentResource = {
  list: (page: number, limit: number, status?: string) => Promise<ContentPage>
  create: (input: unknown) => Promise<unknown>
  update: (id: string, input: unknown) => Promise<unknown | null>
  remove: (id: string) => Promise<unknown | null>
}

function auditRecordLabel(resource: string, value: unknown) {
  if (!value || typeof value !== 'object') return resource
  const record = value as Record<string, unknown>
  const label =
    record.title ??
    record.name ??
    record.clientName ??
    record.inquiryNumber ??
    record.email ??
    record.key
  if (typeof label !== 'string' && typeof label !== 'number') return resource
  return String(label)
}

function registerContentRoutes(
  path: string,
  resource: ContentResource,
  statusSchema?: z.ZodType<string>,
) {
  app.get(`/api/admin/${path}`, async (request, response) => {
    const { page, limit } = pagination(request.query)
    const statusValue = request.query.status
    let status: string | undefined
    if (statusValue !== undefined) {
      if (!statusSchema) {
        throw new HttpError(400, 'Status filtering is not available for this resource.')
      }
      status = statusSchema.parse(statusValue)
    }
    const { items, total } = await resource.list(page, limit, status)
    sendData(response, { items, page, pages: Math.ceil(total / limit), total })
  })

  app.post(`/api/admin/${path}`, async (request, response) => {
    const item = await resource.create(request.body)
    await recordAdminActivity(request, {
      action: 'create',
      resource: path,
      recordId: item && typeof item === 'object' && '_id' in item ? String(item._id) : undefined,
      recordLabel: auditRecordLabel(path, item),
      changedFields: Object.keys(request.body),
    })
    sendData(response, item, 201)
  })

  app.patch(`/api/admin/${path}/:id`, async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid record ID.')
    const item = await resource.update(request.params.id, request.body)
    if (!item) throw new HttpError(404, 'Record not found.')
    await recordAdminActivity(request, {
      action: 'update',
      resource: path,
      recordId: request.params.id,
      recordLabel: auditRecordLabel(path, item),
      changedFields: Object.keys(request.body),
    })
    sendData(response, item)
  })

  app.delete(`/api/admin/${path}/:id`, async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid record ID.')
    const deleted = await resource.remove(request.params.id)
    if (!deleted) throw new HttpError(404, 'Record not found.')
    await recordAdminActivity(request, {
      action: 'delete',
      resource: path,
      recordId: request.params.id,
      recordLabel: auditRecordLabel(path, deleted),
    })
    response.status(204).end()
  })
}

const projectsResource: ContentResource = {
  async list(page, limit, status) {
    const filter =
      status === 'draft'
        ? { status: 'draft' as const }
        : status === 'published'
          ? { status: 'published' as const }
          : status === 'archived'
            ? { status: 'archived' as const }
            : {}
    const [items, total] = await Promise.all([
      ProjectModel.find(filter)
        .select('-__v')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProjectModel.countDocuments(filter),
    ])
    return { items, total }
  },
  async create(input) {
    const parsed = projectSchema.parse(input)
    const baseSlug = parsed.slug ?? projectSlugFromTitle(parsed.title)
    let slug = baseSlug
    let suffix = 2
    while (await ProjectModel.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }
    return ProjectModel.create({
      ...parsed,
      slug,
      thumbnailUrl: youtubeThumbnailUrl(parsed.videoUrl) ?? parsed.thumbnailUrl,
      publishedAt: parsed.status === 'published' ? new Date() : undefined,
    })
  },
  async update(id, input) {
    const parsed = projectSchema
      .partial()
      .refine((value) => Object.keys(value).length > 0)
      .parse(input)
    const update = {
      ...parsed,
      ...(parsed.videoUrl !== undefined
        ? {
            thumbnailUrl:
              youtubeThumbnailUrl(parsed.videoUrl) ?? (parsed.videoUrl === '' ? '' : undefined),
          }
        : {}),
      ...(parsed.status === 'published' ? { publishedAt: new Date() } : {}),
    }
    return ProjectModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select('-__v')
      .lean()
  },
  async remove(id) {
    return ProjectModel.findByIdAndDelete(id).lean()
  },
}

const clientsResource: ContentResource = {
  async list(page, limit) {
    const [items, total] = await Promise.all([
      ClientModel.find()
        .select('-__v')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ClientModel.countDocuments(),
    ])
    return { items, total }
  },
  async create(input) {
    return ClientModel.create(clientSchema.parse(input))
  },
  async update(id, input) {
    const parsed = clientSchema
      .partial()
      .refine((value) => Object.keys(value).length > 0)
      .parse(input)
    return ClientModel.findByIdAndUpdate(id, parsed, { new: true, runValidators: true })
      .select('-__v')
      .lean()
  },
  async remove(id) {
    return ClientModel.findByIdAndDelete(id).lean()
  },
}

const testimonialsResource: ContentResource = {
  async list(page, limit, status) {
    const filter =
      status === 'draft'
        ? { status: 'draft' as const }
        : status === 'approved'
          ? { status: 'approved' as const }
          : status === 'archived'
            ? { status: 'archived' as const }
            : {}
    const [items, total] = await Promise.all([
      TestimonialModel.find(filter)
        .select('-__v')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TestimonialModel.countDocuments(filter),
    ])
    return { items, total }
  },
  async create(input) {
    return TestimonialModel.create(testimonialSchema.parse(input))
  },
  async update(id, input) {
    const parsed = testimonialSchema
      .partial()
      .refine((value) => Object.keys(value).length > 0)
      .parse(input)
    return TestimonialModel.findByIdAndUpdate(id, parsed, { new: true, runValidators: true })
      .select('-__v')
      .lean()
  },
  async remove(id) {
    return TestimonialModel.findByIdAndDelete(id).lean()
  },
}

const servicesResource: ContentResource = {
  async list(page, limit) {
    const [items, total] = await Promise.all([
      ServiceModel.find()
        .select('-__v')
        .sort({ sortOrder: 1, title: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ServiceModel.countDocuments(),
    ])
    return { items, total }
  },
  async create(input) {
    return ServiceModel.create(serviceSchema.parse(input))
  },
  async update(id, input) {
    const parsed = serviceSchema
      .partial()
      .refine((value) => Object.keys(value).length > 0)
      .parse(input)
    return ServiceModel.findByIdAndUpdate(id, parsed, { new: true, runValidators: true })
      .select('-__v')
      .lean()
  },
  async remove(id) {
    return ServiceModel.findByIdAndDelete(id).lean()
  },
}

const settingsResource: ContentResource = {
  async list(page, limit) {
    const [items, total] = await Promise.all([
      SiteSettingsModel.find()
        .select('-__v')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SiteSettingsModel.countDocuments(),
    ])
    return { items, total }
  },
  async create(input) {
    const parsed = siteSettingsSchema.parse(input)
    return SiteSettingsModel.findOneAndUpdate({ key: 'main' }, parsed, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    })
      .select('-__v')
      .lean()
  },
  async update(id, input) {
    const parsed = siteSettingsSchema
      .partial()
      .refine((value) => Object.keys(value).length > 0)
      .parse(input)
    return SiteSettingsModel.findByIdAndUpdate(id, parsed, { new: true, runValidators: true })
      .select('-__v')
      .lean()
  },
  async remove(id) {
    return SiteSettingsModel.findByIdAndDelete(id).lean()
  },
}

const ratingsResource: ContentResource = {
  async list(page, limit) {
    const [items, total] = await Promise.all([
      RatingModel.find()
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RatingModel.countDocuments(),
    ])
    return { items, total }
  },
  async create(input) {
    return RatingModel.create(publicRatingSchema.parse(input))
  },
  async update(id, input) {
    const parsed = publicRatingSchema
      .partial()
      .refine((value) => Object.keys(value).length > 0)
      .parse(input)
    return RatingModel.findByIdAndUpdate(id, parsed, { new: true, runValidators: true })
      .select('-__v')
      .lean()
  },
  async remove(id) {
    return RatingModel.findByIdAndDelete(id).lean()
  },
}

registerContentRoutes('projects', projectsResource, z.enum(['draft', 'published', 'archived']))
registerContentRoutes('clients', clientsResource)
registerContentRoutes(
  'testimonials',
  testimonialsResource,
  z.enum(['draft', 'approved', 'archived']),
)
registerContentRoutes('services', servicesResource)
registerContentRoutes('site-settings', settingsResource)
registerContentRoutes('ratings', ratingsResource)

app.post('/api/admin/inquiries', async (request, response) => {
  const input = adminInquirySchema.parse(request.body)
  const item = await createInquiryRecord(input, false)
  await recordAdminActivity(request, {
    action: 'create',
    resource: 'inquiries',
    recordId: item.id,
    recordLabel: `#${item.inquiryNumber} ${item.name}`,
    changedFields: Object.keys(request.body),
  })
  sendData(response, item.toObject({ versionKey: false }), 201)
})

app.patch('/api/admin/inquiries/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid inquiry ID.')
  const { comment, ...updates } = adminInquiryUpdateSchema.parse(request.body)
  const item = await InquiryModel.findById(request.params.id)
  if (!item) throw new HttpError(404, 'Inquiry not found.')
  if (updates.status && item.status !== updates.status) {
    if (!request.adminEmail || !request.adminNumber) {
      throw new HttpError(401, 'Admin account identity is unavailable.')
    }
    item.statusHistory.push({
      fromStatus: item.status,
      toStatus: updates.status,
      comment,
      updatedBy: `${request.adminNumber} ${request.adminEmail}`,
      updatedAt: new Date(),
    })
  }
  item.set(updates)
  await item.save()
  const result = item.toObject({ versionKey: false })
  await recordAdminActivity(request, {
    action: 'update',
    resource: 'inquiries',
    recordId: item.id,
    recordLabel: `#${item.inquiryNumber} ${item.name}`,
    changedFields: Object.keys(updates),
  })
  sendData(response, result)
})

app.delete('/api/admin/inquiries/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) throw new HttpError(400, 'Invalid inquiry ID.')
  const deleted = await InquiryModel.findByIdAndDelete(request.params.id).lean()
  if (!deleted) throw new HttpError(404, 'Inquiry not found.')
  await recordAdminActivity(request, {
    action: 'delete',
    resource: 'inquiries',
    recordId: request.params.id,
    recordLabel: `#${deleted.inquiryNumber} ${deleted.name}`,
  })
  response.status(204).end()
})

app.get('/api/admin/inquiries', async (request, response) => {
  const { page, limit, skip } = pagination(request.query)
  const status =
    request.query.status === undefined
      ? undefined
      : inquiryStatusSchema.shape.status.parse(request.query.status)
  const filter = status ? { status } : {}
  const [items, total] = await Promise.all([
    InquiryModel.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    InquiryModel.countDocuments(filter),
  ])
  sendData(response, { items, page, pages: Math.ceil(total / limit), total })
})

app.post('/api/admin/uploads/signature', async (request, response) => {
  const input = uploadSchema.parse(request.body)
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET ||
    !env.CLOUDINARY_UPLOAD_PRESET
  ) {
    throw new HttpError(503, 'Media uploads are not configured on this server.')
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  })
  const timestamp = Math.floor(Date.now() / 1000)
  const params = {
    folder: `az-studios/${input.resourceType}`,
    timestamp,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
  }
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET)
  sendData(response, {
    ...params,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    maxFileSizeBytes: mediaLimits[input.resourceType].maxBytes,
    allowedFormats: mediaLimits[input.resourceType].formats,
  })
})

app.post('/api/admin/uploads/verify', async (request, response) => {
  const { resourceType, publicId } = uploadedMediaSchema.parse(request.body)
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET ||
    !env.CLOUDINARY_UPLOAD_PRESET
  ) {
    throw new HttpError(503, 'Media uploads are not configured on this server.')
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  })
  const resource = await cloudinary.api.resource(publicId, { resource_type: resourceType })
  const approvedFolder = `az-studios/${resourceType}`
  const isInApprovedFolder =
    resource.asset_folder === approvedFolder || resource.public_id.startsWith(`${approvedFolder}/`)
  const policyError = getMediaPolicyError(resourceType, resource.format, resource.bytes)
  if (resource.resource_type !== resourceType || !isInApprovedFolder || policyError) {
    const deletion = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    if (deletion.result !== 'ok' && deletion.result !== 'not found') {
      throw new HttpError(502, 'The uploaded file was rejected and could not be cleaned up.')
    }
    throw new HttpError(
      400,
      policyError ?? 'Uploaded media is outside the approved folder or has an invalid type.',
    )
  }

  const secureUrl =
    resourceType === 'video'
      ? cloudinary.url(resource.public_id, {
          resource_type: 'video',
          secure: true,
          version: String(resource.version),
          format: 'mp4',
          transformation: [{ video_codec: 'h264', audio_codec: 'aac' }],
        })
      : resource.secure_url

  await recordAdminActivity(request, {
    action: 'upload',
    resource: `${resourceType} upload`,
    recordId: resource.public_id,
    recordLabel: resource.display_name || resource.public_id,
  })
  sendData(response, {
    publicId: resource.public_id,
    secureUrl,
    resourceType: resource.resource_type,
    format: resource.format,
    bytes: resource.bytes,
    width: resource.width,
    height: resource.height,
    duration: resource.duration,
  })
})

app.use(notFound)
app.use(errorHandler)

export { app }
export default app
