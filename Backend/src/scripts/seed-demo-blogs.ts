import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { BlogAuthorModel, BlogPostModel } from '../models/index.js'

const demoAuthorEmail = 'demo-only-blog-author@azstudios.invalid'
const demoPosts = [
  {
    slug: 'demo-only-video-editing-workflow',
    title: 'DEMO ONLY: Building a Smoother Video Editing Workflow',
    category: 'Post-production',
    excerpt:
      'DEMO ONLY — Sample article about organizing an editing workflow. Placeholder content, not official studio guidance.',
    content:
      'DEMO ONLY — This sample article is for previewing the blog layout and scrolling behavior. It is not official studio guidance or a real client story.\n\nA clear editing workflow can start with organizing footage, collecting references, and agreeing on a review process. This sample demonstrates how longer article content appears on the page.',
  },
  {
    slug: 'demo-only-short-form-storytelling',
    title: 'DEMO ONLY: Making Short-form Stories Feel Complete',
    category: 'Short-form video',
    excerpt:
      'DEMO ONLY — A placeholder example about shaping a beginning, middle, and end in a brief video.',
    content:
      'DEMO ONLY — This sample article exists to demonstrate the blog layout. It is not official studio guidance or a real client story.\n\nEven a brief video can introduce an idea, build momentum, and arrive at a clear ending. This placeholder shows how a short-form topic and longer body copy will read in the article template.',
  },
  {
    slug: 'demo-only-youtube-audience-retention',
    title: 'DEMO ONLY: Planning a Clear YouTube Video',
    category: 'YouTube',
    excerpt:
      'DEMO ONLY — Sample copy about planning a video around one clear idea and a useful structure.',
    content:
      'DEMO ONLY — This sample article is placeholder content created for the site preview. It is not official studio guidance or a real client story.\n\nA useful video outline can make room for a strong opening, organized sections, and a concise conclusion. This example helps exercise longer article layouts and the blog carousel.',
  },
  {
    slug: 'demo-only-clean-dialogue-audio',
    title: 'DEMO ONLY: Why Dialogue Audio Matters',
    category: 'Audio',
    excerpt:
      'DEMO ONLY — A sample article highlighting clean, consistent dialogue as part of a video experience.',
    content:
      'DEMO ONLY — This placeholder is included to preview the blog page, not as professional advice or a real client story.\n\nDialogue, music, and effects each contribute to how a video feels. This sample article provides enough copy to show the reading width, spacing, and typography on a full article page.',
  },
  {
    slug: 'demo-only-color-and-mood',
    title: 'DEMO ONLY: Exploring Color and Mood',
    category: 'Color',
    excerpt:
      'DEMO ONLY — Example copy about using a consistent visual direction throughout a video.',
    content:
      'DEMO ONLY — This sample demonstrates the website layout only. It is not official studio guidance or a real client story.\n\nColor choices can help create a coherent visual direction across a project. This placeholder uses an editorial topic to preview article formatting without representing real work or a client result.',
  },
  {
    slug: 'demo-only-brand-video-consistency',
    title: 'DEMO ONLY: Keeping Brand Videos Consistent',
    category: 'Branding',
    excerpt:
      'DEMO ONLY — A placeholder example about keeping visual details consistent across video assets.',
    content:
      'DEMO ONLY — This article is sample content for testing the blog design. It is not official studio guidance or a real client story.\n\nA shared set of visual references can help a series of videos feel connected. This example is intentionally labeled and provides longer copy for a realistic layout preview.',
  },
  {
    slug: 'demo-only-reviewing-video-cuts',
    title: 'DEMO ONLY: Making Video Reviews More Focused',
    category: 'Creative process',
    excerpt:
      'DEMO ONLY — Sample copy about gathering clear, organized notes during an edit review.',
    content:
      'DEMO ONLY — This placeholder is for demonstrating the public blog and its auto-scrolling rows. It is not official studio guidance or a real client story.\n\nOrganized feedback can make a review easier to follow. This sample describes a general process and gives the article template enough text to display its full reading layout.',
  },
]

try {
  const databaseUrl = new URL(env.MONGODB_URI)
  if (
    databaseUrl.hostname !== 'cluster0.yb7educ.mongodb.net' ||
    (databaseUrl.pathname.slice(1).split('/')[0] || 'test') !== 'test'
  ) {
    throw new Error('Configured database did not match the confirmed Atlas test database.')
  }
  await mongoose.connect(env.MONGODB_URI)

  let employeeId: string | undefined
  for (let suffix = 9900; suffix <= 9999; suffix += 1) {
    const candidate = `BLOG${suffix}`
    const occupied = await BlogAuthorModel.exists({
      employeeId: candidate,
      email: { $ne: demoAuthorEmail },
    })
    if (!occupied) {
      employeeId = candidate
      break
    }
  }
  if (!employeeId) throw new Error('No unused demo blog author ID was available.')

  const author = await BlogAuthorModel.findOneAndUpdate(
    { email: demoAuthorEmail },
    {
      $set: { loginHeld: true },
      $setOnInsert: {
        employeeId,
        name: 'DEMO ONLY',
        email: demoAuthorEmail,
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
      },
    },
    { upsert: true, returnDocument: 'after' },
  )
  if (!author) throw new Error('Could not create or locate the demo-only blog author.')

  const results = await Promise.all(
    demoPosts.map((post, index) =>
      BlogPostModel.updateOne(
        { slug: post.slug },
        {
          $setOnInsert: {
            ...post,
            authorId: author._id,
            authorName: 'DEMO ONLY',
            status: 'published',
            reviewedBy: 'DEMO CONTENT SEED',
            reviewedAt: new Date(),
            publishedAt: new Date(Date.now() - (demoPosts.length - index) * 60_000),
          },
        },
        { upsert: true },
      ),
    ),
  )
  console.info(
    `Demo blog content ready: ${results.reduce((total, result) => total + result.upsertedCount, 0)} new posts in "${mongoose.connection.name}".`,
  )
} catch (error) {
  console.error('Could not add demo blog content:', error)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
