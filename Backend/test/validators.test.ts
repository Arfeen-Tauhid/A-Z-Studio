import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createAdminSchema,
  adminLoginHoldSchema,
  adminPermissionsSchema,
  blogAuthorLoginSchema,
  blogPostSchema,
  blogReviewSchema,
  blogWritingRequestSchema,
  blogWritingRequestReviewSchema,
  adminInquirySchema,
  adminInquiryUpdateSchema,
  clientSchema,
  inquirySchema,
  inquiryStatusSchema,
  loginSchema,
  projectSchema,
  publicRatingSchema,
  siteSettingsSchema,
  testimonialSchema,
} from '../src/validators/index.js'
import { getMediaPolicyError } from '../src/services/mediaPolicy.js'
import {
  projectSlugFromTitle,
  youtubeThumbnailUrl,
  youtubeVideoId,
} from '../src/services/youtube.js'
import { canAccessAdminPath, isWebsiteCreator } from '../src/middleware/adminAccess.js'
import { parseAllowedOrigins } from '../src/config/env.js'

describe('limited admin access', () => {
  it('allows editing projects and services and viewing approved content sections', () => {
    assert.equal(canAccessAdminPath('limited', [], 'PATCH', '/projects/abc123'), true)
    assert.equal(canAccessAdminPath('limited', [], 'POST', '/services'), true)
    assert.equal(canAccessAdminPath('limited', [], 'GET', '/clients'), true)
    assert.equal(canAccessAdminPath('limited', [], 'GET', '/testimonials'), true)
    assert.equal(canAccessAdminPath('limited', [], 'GET', '/dashboard'), true)
    assert.equal(canAccessAdminPath('limited', [], 'POST', '/uploads/signature', 'video'), true)
  })

  it('denies settings, inquiries, account management, and edits to read-only content', () => {
    assert.equal(canAccessAdminPath('limited', [], 'GET', '/site-settings'), false)
    assert.equal(canAccessAdminPath('limited', [], 'GET', '/inquiries'), false)
    assert.equal(canAccessAdminPath('limited', [], 'POST', '/admins'), false)
    assert.equal(canAccessAdminPath('limited', [], 'DELETE', '/clients/abc123'), false)
    assert.equal(canAccessAdminPath('limited', [], 'PATCH', '/testimonials/abc123'), false)
    assert.equal(canAccessAdminPath('limited', [], 'GET', '/ratings'), true)
    assert.equal(canAccessAdminPath('limited', [], 'DELETE', '/ratings/abc123'), false)
  })

  it('applies selected permissions independently on the server', () => {
    const permissions = ['testimonials']
    assert.equal(canAccessAdminPath('custom', permissions, 'GET', '/testimonials'), true)
    assert.equal(canAccessAdminPath('custom', permissions, 'PATCH', '/testimonials/abc123'), true)
    assert.equal(canAccessAdminPath('custom', permissions, 'GET', '/projects'), false)
    assert.equal(canAccessAdminPath('custom', permissions, 'PATCH', '/inquiries/abc123'), false)
    assert.equal(canAccessAdminPath('custom', ['ratings'], 'POST', '/ratings'), true)
    assert.equal(canAccessAdminPath('custom', ['ratings'], 'DELETE', '/ratings/abc123'), true)
    assert.equal(canAccessAdminPath('custom', permissions, 'GET', '/dashboard'), true)
    assert.equal(
      canAccessAdminPath('custom', permissions, 'POST', '/uploads/signature', 'image'),
      true,
    )
    assert.equal(
      canAccessAdminPath('custom', permissions, 'POST', '/uploads/signature', 'video'),
      false,
    )
    assert.equal(
      canAccessAdminPath('custom', permissions, 'GET', '/uploads/signature', 'image'),
      false,
    )
  })

  it('grants account creation and activity viewing only through explicit permissions', () => {
    assert.equal(canAccessAdminPath('custom', ['create-admins'], 'POST', '/admins'), true)
    assert.equal(canAccessAdminPath('custom', ['create-admins'], 'GET', '/admins'), false)
    assert.equal(canAccessAdminPath('custom', ['activity'], 'GET', '/activity'), true)
    assert.equal(canAccessAdminPath('custom', ['activity'], 'POST', '/activity'), false)
    assert.equal(canAccessAdminPath('custom', [], 'GET', '/activity'), false)
    assert.equal(canAccessAdminPath('full', [], 'POST', '/admins'), false)
    assert.equal(canAccessAdminPath('full', [], 'GET', '/activity'), false)
    assert.equal(canAccessAdminPath('full', ['create-admins'], 'POST', '/admins'), true)
  })

  it('identifies only the original website creator for activity log management', () => {
    assert.equal(isWebsiteCreator('arfeentauhid01@gmail.com', 'AZ1245'), true)
    assert.equal(isWebsiteCreator('ARFEENTAUHID01@GMAIL.COM', 'AZ1245'), true)
    assert.equal(isWebsiteCreator('other@example.com', 'AZ1245'), false)
    assert.equal(isWebsiteCreator('arfeentauhid01@gmail.com', 'AZ0001'), false)
    assert.equal(isWebsiteCreator(undefined, 'AZ1245'), false)
  })

  it('lets custom content admins create assigned content and upload its media', () => {
    const permissions = ['projects', 'clients', 'testimonials', 'services']
    for (const resource of permissions) {
      assert.equal(canAccessAdminPath('custom', permissions, 'POST', `/${resource}`), true)
      assert.equal(canAccessAdminPath('custom', permissions, 'PATCH', `/${resource}/abc123`), true)
    }
    assert.equal(
      canAccessAdminPath('custom', permissions, 'POST', '/uploads/signature', 'image'),
      true,
    )
    assert.equal(
      canAccessAdminPath('custom', permissions, 'POST', '/uploads/signature', 'video'),
      true,
    )
    assert.equal(canAccessAdminPath('custom', permissions, 'POST', '/site-settings'), false)
    assert.equal(canAccessAdminPath('custom', permissions, 'POST', '/inquiries'), false)
  })

  it('limits blog sections to their assigned permissions', () => {
    assert.equal(
      canAccessAdminPath('custom', ['blog-writing-requests'], 'GET', '/blog-writing-requests'),
      true,
    )
    assert.equal(
      canAccessAdminPath('custom', ['blog-writing-requests'], 'POST', '/blog-authors'),
      true,
    )
    assert.equal(
      canAccessAdminPath(
        'custom',
        ['blog-writing-requests'],
        'PATCH',
        '/blog-authors/123/login-hold',
      ),
      false,
    )
    assert.equal(canAccessAdminPath('custom', ['blog-writers'], 'GET', '/blog-authors'), true)
    assert.equal(
      canAccessAdminPath('custom', ['blog-writers'], 'PATCH', '/blog-authors/123/login-hold'),
      true,
    )
    assert.equal(canAccessAdminPath('custom', ['blog-writers'], 'GET', '/blog-posts'), false)
    assert.equal(
      canAccessAdminPath('custom', ['blog-post-review'], 'PATCH', '/blog-posts/123'),
      true,
    )
    assert.equal(
      canAccessAdminPath('custom', ['blog-post-review'], 'PATCH', '/blog-posts/123/review'),
      true,
    )
    assert.equal(
      canAccessAdminPath('custom', ['blog-post-review'], 'DELETE', '/blog-posts/123'),
      true,
    )
    assert.equal(canAccessAdminPath('custom', ['blog-post-review'], 'GET', '/blog-authors'), false)
    assert.equal(canAccessAdminPath('limited', ['blog-post-review'], 'GET', '/blog-posts'), true)
    assert.equal(canAccessAdminPath('limited', ['blog-writers'], 'GET', '/blog-authors'), true)
  })
})

describe('allowed frontend origins', () => {
  it('normalizes comma-separated origins and ignores trailing slashes', () => {
    const origins = parseAllowedOrigins(
      'https://a-z-studio.vercel.app/, https://a-z-studio-backend.onrender.com/',
    )

    assert.deepEqual(origins, [
      'https://a-z-studio.vercel.app',
      'https://a-z-studio-backend.onrender.com',
    ])
  })
})

describe('admin account validation', () => {
  it('accepts email or AZ admin-number login identifiers', () => {
    assert.equal(
      loginSchema.safeParse({ identifier: 'AZ0042', password: 'a-valid-password' }).success,
      true,
    )
    assert.equal(
      loginSchema.safeParse({ identifier: 'az0042', password: 'a-valid-password' }).success,
      true,
    )
    assert.equal(
      loginSchema.safeParse({ email: 'editor@example.com', password: 'a-valid-password' }).success,
      true,
    )
    assert.equal(
      loginSchema.safeParse({ identifier: 'not-an-admin-id', password: 'a-valid-password' })
        .success,
      false,
    )
  })

  describe('blog writing access', () => {
    it('validates access requests with an international phone number', () => {
      const request = {
        name: 'Taylor Editor',
        socialPlatform: 'YouTube',
        yearsExperience: '4',
        motivation: 'I want to share practical editing knowledge with the creative community.',
        email: 'taylor@example.com',
        contactNumber: '+1 (555) 123-4567',
      }
      const result = blogWritingRequestSchema.safeParse(request)
      assert.equal(result.success, true)
      if (result.success) assert.equal(result.data.contactNumber, '+15551234567')
      assert.equal(
        blogWritingRequestSchema.safeParse({ ...request, contactNumber: '5551234' }).success,
        false,
      )
    })

    it('accepts BLOG IDs or email for writer sign-in', () => {
      const blogIdLogin = blogAuthorLoginSchema.safeParse({
        identifier: ' blog0042 ',
        password: 'a-password',
      })
      assert.equal(blogIdLogin.success, true)
      if (blogIdLogin.success) assert.equal(blogIdLogin.data.identifier, 'BLOG0042')

      const emailLogin = blogAuthorLoginSchema.safeParse({
        identifier: 'WRITER@EXAMPLE.COM',
        password: 'a-password',
      })
      assert.equal(emailLogin.success, true)
      if (emailLogin.success) assert.equal(emailLogin.data.identifier, 'writer@example.com')

      assert.equal(
        blogAuthorLoginSchema.safeParse({
          identifier: 'writer@example.com',
          password: 'a-password',
        }).success,
        true,
      )
      assert.equal(
        blogAuthorLoginSchema.safeParse({ identifier: 'AZ0042', password: 'a-password' }).success,
        false,
      )
    })

    it('validates blog content and owner review decisions', () => {
      const post = {
        title: 'What editors should know about proxy workflows',
        category: 'Editing workflow',
        excerpt: 'A practical look at keeping large editing projects responsive.',
        content: 'A useful blog post needs enough detail to explain the workflow clearly. '.repeat(
          3,
        ),
      }
      assert.equal(blogPostSchema.safeParse(post).success, true)
      assert.equal(blogPostSchema.safeParse({ ...post, content: 'Too short.' }).success, false)
      assert.equal(blogReviewSchema.safeParse({ status: 'pending' }).success, true)
      assert.equal(blogReviewSchema.safeParse({ status: 'published' }).success, true)
      assert.equal(blogReviewSchema.safeParse({ status: 'invalid' }).success, false)
      assert.equal(blogWritingRequestReviewSchema.safeParse({ status: 'approved' }).success, true)
      assert.equal(blogWritingRequestReviewSchema.safeParse({ status: 'pending' }).success, false)
    })
  })

  it('validates login hold and admin access permissions', () => {
    assert.equal(adminLoginHoldSchema.safeParse({ loginHeld: true }).success, true)
    assert.equal(adminLoginHoldSchema.safeParse({ loginHeld: 'true' }).success, false)
    assert.equal(
      adminPermissionsSchema.safeParse({
        permissions: [
          'create-admins',
          'activity',
          'blog-writing-requests',
          'blog-writers',
          'blog-post-review',
        ],
      }).success,
      true,
    )
  })

  it('requires a valid email, role, and strong initial password', () => {
    assert.equal(
      createAdminSchema.safeParse({
        email: 'editor@example.com',
        password: 'a-unique-admin-password',
        permissions: ['projects', 'testimonials', 'ratings'],
      }).success,
      true,
    )
    assert.equal(
      createAdminSchema.safeParse({
        email: 'editor@example.com',
        password: 'short',
        permissions: ['projects'],
      }).success,
      false,
    )
    assert.equal(
      createAdminSchema.safeParse({
        email: 'editor@example.com',
        password: 'a-unique-admin-password',
        permissions: [],
      }).success,
      false,
    )
  })
})

describe('site settings validation', () => {
  it('accepts contact, social, and homepage showreel settings', () => {
    const settings = siteSettingsSchema.parse({
      studioEmail: 'hello@example.com',
      contactNumber: ' +1 (555) 123-4567 ',
      discordId: 'azstudio#1234',
      instagramUrl: 'https://instagram.com/azstudio',
      youtubeUrl: 'https://youtube.com/@azstudio',
      linkedinUrl: 'https://linkedin.com/company/azstudio',
      showreelUrl: 'https://cdn.example.com/showreel.mp4',
    })

    assert.equal(settings.studioEmail, 'hello@example.com')
    assert.equal(settings.contactNumber, '+1 (555) 123-4567')
    assert.equal(settings.discordId, 'azstudio#1234')
    assert.equal(settings.instagramUrl, 'https://instagram.com/azstudio')
    assert.equal(settings.youtubeUrl, 'https://youtube.com/@azstudio')
    assert.equal(settings.linkedinUrl, 'https://linkedin.com/company/azstudio')
    assert.equal(settings.showreelUrl, 'https://cdn.example.com/showreel.mp4')
    assert.equal(siteSettingsSchema.safeParse({ contactNumber: 'x'.repeat(41) }).success, false)
    assert.equal(siteSettingsSchema.safeParse({ discordId: 'x'.repeat(101) }).success, false)
  })
})

describe('project validation', () => {
  it('defaults new project content to draft', () => {
    const project = projectSchema.parse({
      title: 'Studio reel',
      category: 'Brand & promo',
      clientName: 'Northstar Coffee',
      description: 'A short approved project description.',
    })

    assert.equal(project.status, 'draft')
    assert.equal(project.videoAspectRatio, '16:9')
    assert.equal(project.slug, undefined)
  })

  it('accepts supported video aspect ratios and rejects unsupported values', () => {
    for (const videoAspectRatio of ['16:9', '9:16', '1:1', '4:5']) {
      assert.equal(
        projectSchema.safeParse({
          title: 'Studio video',
          category: 'Short-form',
          clientName: 'Northstar Coffee',
          description: 'A short approved project description.',
          videoAspectRatio,
        }).success,
        true,
      )
    }

    assert.equal(
      projectSchema.safeParse({
        title: 'Studio video',
        category: 'Short-form',
        clientName: 'Northstar Coffee',
        description: 'A short approved project description.',
        videoAspectRatio: '3:2',
      }).success,
      false,
    )
  })

  it('rejects unsafe or malformed project slugs', () => {
    assert.throws(() =>
      projectSchema.parse({
        slug: '../private',
        title: 'Project',
        category: 'YouTube',
        clientName: 'Northstar Coffee',
        description: 'Description',
      }),
    )
  })

  it('creates safe project slugs and YouTube thumbnails from supported video links', () => {
    assert.equal(projectSlugFromTitle('Studio Reel — 2026'), 'studio-reel-2026')
    assert.equal(youtubeVideoId('https://youtu.be/aqz-KE-bpKQ?t=10'), 'aqz-KE-bpKQ')
    assert.equal(
      youtubeThumbnailUrl('https://www.youtube.com/watch?v=aqz-KE-bpKQ'),
      'https://img.youtube.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
    )
    assert.equal(youtubeVideoId('https://example.com/watch?v=aqz-KE-bpKQ'), null)
    assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=invalid'), null)
  })
})

describe('testimonial validation', () => {
  it('requires client details, an approved quote, a feedback screenshot, and a rating', () => {
    const testimonial = testimonialSchema.parse({
      clientName: 'Alex Morgan',
      clientCountry: 'United States',
      clientChannelName: 'Northstar Coffee',
      quote: 'The final video captured exactly what makes our brand special.',
      commentScreenshotUrl: 'https://media.example.com/feedback.png',
      rating: 5,
    })

    assert.equal(testimonial.clientCountry, 'United States')
    assert.equal(testimonial.clientChannelName, 'Northstar Coffee')
    assert.equal(testimonial.status, 'draft')
    assert.equal(
      testimonialSchema.parse({
        clientName: 'Alex Morgan',
        clientCountry: 'United States',
        clientChannelName: 'Northstar Coffee',
        quote: 'The final video captured exactly what makes our brand special.',
        commentScreenshotUrl: 'https://media.example.com/feedback.png',
        rating: 5,
        status: 'approved',
      }).status,
      'approved',
    )
    assert.equal(
      testimonialSchema.safeParse({
        clientName: 'Alex Morgan',
        clientCountry: 'United States',
        clientChannelName: 'Northstar Coffee',
        quote: 'The final video captured exactly what makes our brand special.',
        rating: 5,
      }).success,
      false,
    )
    assert.equal(
      testimonialSchema.safeParse({
        clientName: 'Alex Morgan',
        clientCountry: 'United States',
        clientChannelName: 'Northstar Coffee',
        quote: 'The final video captured exactly what makes our brand special.',
        commentScreenshotUrl: 'https://media.example.com/feedback.png',
      }).success,
      false,
    )
  })
})

describe('Cloudinary media policy', () => {
  it('rejects unsupported formats and oversized images', () => {
    assert.match(getMediaPolicyError('image', 'svg', 100) ?? '', /Unsupported/)
    assert.match(getMediaPolicyError('image', 'jpg', 16 * 1024 * 1024) ?? '', /size/)
  })

  it('accepts supported formats within the size limit', () => {
    assert.equal(getMediaPolicyError('video', 'mp4', 1024 * 1024), null)
  })
})

describe('inquiry validation', () => {
  it('validates admin-created inquiries, optional contact number, and default status', () => {
    const inquiry = adminInquirySchema.parse({
      name: 'Alex Example',
      email: 'alex@example.com',
      contactNumber: ' +1 555 123 4567 ',
      service: 'YouTube video editing',
      projectDescription: 'I need help editing a ten-minute video for my channel.',
    })

    assert.equal(inquiry.status, 'new')
    assert.equal(inquiry.contactNumber, '+1 555 123 4567')
    assert.equal(
      adminInquirySchema.safeParse({
        name: 'Alex Example',
        email: 'alex@example.com',
        service: 'YouTube video editing',
        projectDescription: 'I need help editing a ten-minute video for my channel.',
      }).success,
      true,
    )
    assert.equal(
      adminInquiryUpdateSchema.safeParse({
        status: 'in_progress',
        comment: 'Contacted the client.',
      }).success,
      true,
    )
    assert.equal(adminInquiryUpdateSchema.safeParse({}).success, false)
    assert.equal(adminInquiryUpdateSchema.safeParse({ status: 'invalid' }).success, false)
  })

  it('requires valid contact details, a project description, and consent', () => {
    assert.throws(() =>
      inquirySchema.parse({
        name: 'Alex Example',
        email: 'not-an-email',
        service: 'YouTube video editing',
        projectDescription: 'I need an editor for a project.',
        consent: true,
      }),
    )

    assert.throws(() =>
      inquirySchema.parse({
        name: 'Alex Example',
        email: 'alex@example.com',
        service: 'YouTube video editing',
        projectDescription: 'I need an editor for a project.',
        consent: false,
      }),
    )
  })

  it('accepts an optional country-code contact number and enforces its length', () => {
    const inquiry = inquirySchema.parse({
      name: 'Alex Example',
      email: 'alex@example.com',
      contactNumber: ' +44 20 7946 0958 ',
      service: 'YouTube video editing',
      projectDescription: 'I need help editing a ten-minute video for my channel.',
      consent: true,
    })

    assert.equal(inquiry.contactNumber, '+44 20 7946 0958')
    assert.equal(
      inquirySchema.safeParse({
        name: 'Alex Example',
        email: 'alex@example.com',
        contactNumber: 'x'.repeat(41),
        service: 'YouTube video editing',
        projectDescription: 'I need help editing a ten-minute video for my channel.',
        consent: true,
      }).success,
      false,
    )
  })

  it('accepts a manually entered budget with a selected currency', () => {
    const inquiry = inquirySchema.parse({
      name: 'Alex Example',
      email: 'alex@example.com',
      contactNumber: '+44 20 7946 0958',
      service: 'Podcast editing',
      projectDescription: 'I need help editing a ten-minute video for my channel.',
      budget: '1250.50',
      budgetCurrency: 'GBP',
      consent: true,
    })

    assert.equal(inquiry.budget, '1250.50')
    assert.equal(inquiry.budgetCurrency, 'GBP')
    assert.equal(
      inquirySchema.safeParse({
        name: 'Alex Example',
        email: 'alex@example.com',
        service: 'Podcast editing',
        projectDescription: 'I need help editing a ten-minute video for my channel.',
        budget: 'about 1000',
        budgetCurrency: 'GBP',
        consent: true,
      }).success,
      false,
    )
    assert.equal(
      inquirySchema.safeParse({
        name: 'Alex Example',
        email: 'alex@example.com',
        service: 'Podcast editing',
        projectDescription: 'I need help editing a ten-minute video for my channel.',
        budget: '1000',
        budgetCurrency: 'XYZ',
        consent: true,
      }).success,
      false,
    )
  })

  describe('client showcase validation', () => {
    it('accepts video, a comment screenshot, and a social handle', () => {
      const client = clientSchema.parse({
        name: 'Example Creator',
        videoUrl: 'https://media.example.com/project.mp4',
        videoThumbnailUrl: 'https://media.example.com/thumbnail.jpg',
        commentScreenshotUrl: 'https://media.example.com/feedback.jpg',
        socialPlatform: 'Instagram',
        socialHandle: '@examplecreator',
        isPublished: true,
      })

      assert.equal(client.socialHandle, '@examplecreator')
      assert.equal(client.isPublished, true)
    })
  })

  describe('public client rating validation', () => {
    it('requires a name and social platform identity for a rating', () => {
      assert.deepEqual(
        publicRatingSchema.parse({
          rating: 5,
          name: ' Alex Example ',
          socialPlatform: ' YouTube ',
          socialHandle: ' @alexcreates ',
          feedback: '  Great experience.  ',
        }),
        {
          rating: 5,
          name: 'Alex Example',
          socialPlatform: 'YouTube',
          socialHandle: '@alexcreates',
          feedback: 'Great experience.',
        },
      )
      assert.equal(
        publicRatingSchema.safeParse({
          rating: 5,
          name: 'Alex Example',
          socialPlatform: 'YouTube',
          socialHandle: '@alexcreates',
          feedback: 'x'.repeat(501),
        }).success,
        false,
      )
      assert.equal(publicRatingSchema.safeParse({ rating: 5 }).success, false)
    })

    it('rejects ratings outside the five-star scale', () => {
      assert.equal(
        publicRatingSchema.safeParse({
          rating: 6,
          name: 'Alex Example',
          socialPlatform: 'YouTube',
          socialHandle: '@alexcreates',
        }).success,
        false,
      )
    })
  })

  it('accepts a valid inquiry with an empty honeypot field', () => {
    const inquiry = inquirySchema.parse({
      name: 'Alex Example',
      email: 'alex@example.com',
      service: 'YouTube video editing',
      projectDescription: 'I need help editing a ten-minute video for my channel.',
      consent: true,
      website: '',
    })

    assert.equal(inquiry.email, 'alex@example.com')
    assert.equal(inquiry.website, '')
  })

  it('accepts optional internal notes on status transitions and enforces the note limit', () => {
    assert.equal(
      inquiryStatusSchema.safeParse({
        status: 'in_progress',
        comment: 'Contacted the client and waiting for a response.',
      }).success,
      true,
    )
    assert.equal(
      inquiryStatusSchema.safeParse({
        status: 'closed',
        comment: 'x'.repeat(2001),
      }).success,
      false,
    )
  })
})
