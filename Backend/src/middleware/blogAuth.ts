import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { BlogAuthorModel } from '../models/index.js'
import { HttpError } from './errors.js'

declare global {
  namespace Express {
    interface Request {
      blogAuthorId?: string
      blogAuthorEmployeeId?: string
      blogAuthorEmail?: string
      blogAuthorName?: string
    }
  }
}

export const requireBlogAuthor: RequestHandler = async (request, _response, next) => {
  const token = request.cookies?.az_blog
  if (!token) {
    next(new HttpError(401, 'Blog author sign-in is required.'))
    return
  }

  let payload: jwt.JwtPayload
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    if (
      typeof decoded === 'string' ||
      typeof decoded.sub !== 'string' ||
      decoded.kind !== 'blog-author'
    ) {
      throw new Error('Invalid blog author token payload.')
    }
    payload = decoded
  } catch {
    next(new HttpError(401, 'Your blog author session is invalid or expired.'))
    return
  }

  const author = await BlogAuthorModel.findById(payload.sub).select(
    'employeeId email name loginHeld',
  )
  if (!author) {
    next(new HttpError(401, 'Blog author account not found.'))
    return
  }
  if (author.loginHeld) {
    next(new HttpError(403, 'This blog author login is on hold. Contact the studio owner.'))
    return
  }

  request.blogAuthorId = author.id
  request.blogAuthorEmployeeId = author.employeeId
  request.blogAuthorEmail = author.email
  request.blogAuthorName = author.name
  next()
}
