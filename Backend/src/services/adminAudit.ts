import type { Request } from 'express'
import { randomInt } from 'node:crypto'
import { Types } from 'mongoose'
import { AdminActivityModel, AdminModel } from '../models/index.js'

export type AdminActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'upload'
  | 'permissions'
  | 'revoke'
  | 'login-hold'
  | 'login-release'

export async function nextAdminNumber() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const number = `AZ${randomInt(0, 10_000).toString().padStart(4, '0')}`
    if (!(await AdminModel.exists({ adminNumber: number }))) return number
  }
  throw new Error('Could not generate an available admin number.')
}

export async function ensureAdminNumber(adminId: string, currentNumber?: string | number | null) {
  if (typeof currentNumber === 'string' && /^AZ\d{4}$/.test(currentNumber)) return currentNumber

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const allocatedNumber = await nextAdminNumber()
    try {
      const result = await AdminModel.collection.updateOne(
        {
          _id: new Types.ObjectId(adminId),
          $or: [
            { adminNumber: { $exists: false } },
            { adminNumber: null },
            { adminNumber: { $not: /^AZ\d{4}$/ } },
          ],
        },
        { $set: { adminNumber: allocatedNumber } },
      )
      if (result.matchedCount) return allocatedNumber
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 11000) {
        throw error
      }
    }

    const existing = await AdminModel.findById(adminId).select('adminNumber').lean()
    if (typeof existing?.adminNumber === 'string' && /^AZ\d{4}$/.test(existing.adminNumber)) {
      return existing.adminNumber
    }
  }
  throw new Error('Could not assign a unique number to the admin account.')
}

export async function recordAdminActivity(
  request: Request,
  entry: {
    action: AdminActivityAction
    resource: string
    recordId?: string
    recordLabel?: string
    changedFields?: string[]
  },
) {
  if (!request.adminId || !request.adminNumber || !request.adminEmail) {
    throw new Error('Authenticated admin identity is missing for the activity log.')
  }
  const changedFields = entry.changedFields?.filter(
    (field) => !/password|token|secret|credential/i.test(field),
  )
  await AdminActivityModel.create({
    actorAdminNumber: request.adminNumber,
    actorEmail: request.adminEmail,
    ...entry,
    changedFields,
  })
}
