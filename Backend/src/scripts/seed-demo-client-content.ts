import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { ClientModel, TestimonialModel } from '../models/index.js'

const demoImage = 'https://img.youtube.com/vi/5TGmE0OfwcY/hqdefault.jpg'

const demoClients = Array.from({ length: 7 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  const name = `DEMO ONLY - Sample Client ${number}`
  return {
    name,
    isPublished: true,
    socialPlatform: 'DEMO ONLY',
    socialHandle: 'Sample entry - not a real client',
  }
})

const demoTestimonials = Array.from({ length: 7 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    clientName: `DEMO ONLY - Sample ${number}`,
    clientCountry: 'Demo content',
    clientChannelName: 'Placeholder - not a real client',
    quote:
      'Placeholder copy for the scrolling layout demonstration only. This is not a real testimonial or client endorsement.',
    commentScreenshotUrl: demoImage,
    rating: 5,
    status: 'approved' as const,
  }
})

try {
  await mongoose.connect(env.MONGODB_URI)
  const databaseUrl = new URL(env.MONGODB_URI)
  if (
    databaseUrl.hostname !== 'cluster0.yb7educ.mongodb.net' ||
    (databaseUrl.pathname.slice(1).split('/')[0] || 'test') !== 'test'
  ) {
    throw new Error('Connected database did not match the confirmed Atlas test database.')
  }

  const [clients, testimonials] = await Promise.all([
    Promise.all(
      demoClients.map((client) =>
        ClientModel.updateOne({ name: client.name }, { $setOnInsert: client }, { upsert: true }),
      ),
    ),
    Promise.all(
      demoTestimonials.map((testimonial) =>
        TestimonialModel.updateOne(
          { clientName: testimonial.clientName },
          { $setOnInsert: testimonial },
          { upsert: true },
        ),
      ),
    ),
  ])
  console.info(
    `Demo content ready: ${clients.reduce((total, result) => total + result.upsertedCount, 0)} new clients, ${testimonials.reduce((total, result) => total + result.upsertedCount, 0)} new testimonials in "${mongoose.connection.name}".`,
  )
} catch (error) {
  console.error('Could not add demo client content:', error)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
