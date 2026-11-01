import type { Request } from 'express'
import { AdminActivityModel, AdminModel, CounterModel } from '../models/index.js'

export type AdminActivityAction =
  'create' | 'update' | 'delete' | 'upload' | 'permissions' | 'revoke'

export async function nextAdminNumber() {
  const counter = await CounterModel.findByIdAndUpdate(
    'admin-number',
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
  return counter.value
}

export async function ensureAdminNumber(adminId: string, currentNumber?: number | null) {
  if (typeof currentNumber === 'number') return currentNumber
  const allocatedNumber = await nextAdminNumber()
  const admin = await AdminModel.findOneAndUpdate(
    {
      _id: adminId,
      $or: [{ adminNumber: { $exists: false } }, { adminNumber: null }],
    },
    { $set: { adminNumber: allocatedNumber } },
    { new: true },
  )
    .select('adminNumber')
    .lean()
  if (typeof admin?.adminNumber === 'number') return admin.adminNumber
  const existing = await AdminModel.findById(adminId).select('adminNumber').lean()
  if (typeof existing?.adminNumber !== 'number') {
    throw new Error('Could not assign a number to the admin account.')
  }
  return existing.adminNumber
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
