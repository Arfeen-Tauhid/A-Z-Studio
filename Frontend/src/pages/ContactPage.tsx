import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { apiRequest } from '../lib/api'
import { sendStudioInquiryNotification } from '../lib/emailjs'

const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(100),
  email: z.email('Enter a valid email address.').max(254),
  company: z.string().trim().max(120).optional(),
  websiteOrSocial: z.string().trim().max(300).optional(),
  service: z.string().min(1, 'Choose a service.'),
  projectDescription: z
    .string()
    .trim()
    .min(20, 'Please share a little more about your project.')
    .max(5000),
  budget: z.string().optional(),
  deadline: z.string().optional(),
  deliverables: z.string().trim().max(500).optional(),
  referenceLinks: z.string().trim().max(1000).optional(),
  consent: z.boolean().refine((value) => value, 'Please confirm that we may contact you.'),
  website: z.string().optional(),
})

type Inquiry = z.infer<typeof inquirySchema>

export function ContactPage() {
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [notificationError, setNotificationError] = useState('')
  const [submittedInquiry, setSubmittedInquiry] = useState<Inquiry | null>(null)
  const [submittedNumber, setSubmittedNumber] = useState('')
  const [isRetryingNotification, setIsRetryingNotification] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Inquiry>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { website: '', consent: false },
  })

  async function sendEmailNotification(values: Inquiry, inquiryNumber?: string) {
    try {
      await sendStudioInquiryNotification({
        inquiryNumber,
        name: values.name,
        email: values.email,
        company: values.company,
        service: values.service,
        projectDescription: values.projectDescription,
        budget: values.budget,
        deadline: values.deadline,
        deliverables: values.deliverables,
        referenceLinks: values.referenceLinks,
      })
      setNotificationError('')
    } catch (error) {
      console.error('Inquiry was saved, but the studio email notification failed:', error)
      setNotificationError(
        error instanceof Error
          ? `The inquiry is saved, but the studio email notification failed. ${error.message}`
          : 'The inquiry is saved, but the studio email notification failed. Please retry.',
      )
    }
  }

  async function onSubmit(values: Inquiry) {
    setSubmitError('')
    setNotificationError('')
    try {
      const result = await apiRequest<{ inquiryNumber: string }>('/api/public/inquiries', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setSubmittedInquiry(values)
      setSubmittedNumber(result.inquiryNumber)
      setSent(true)
      await sendEmailNotification(values, result.inquiryNumber)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'We could not send your inquiry. Please try again.',
      )
    }
  }

  return (
    <div className="shell page-shell contact-page">
      <div className="page-intro">
        <span className="eyebrow">CONTACT</span>
        <h1>
          Let’s shape
          <br />
          <em>your next story.</em>
        </h1>
        <p>
          Tell us about your goals, timeline, and the support you need. We collaborate with clients
          in the United States, the Gulf region, and around the world.
        </p>
      </div>
      {sent ? (
        <div className="form-success">
          <CheckCircle2 size={32} />
          <span className="eyebrow">MESSAGE RECEIVED</span>
          <h2>Your inquiry is with our studio.</h2>
          <p>
            Keep this eight-digit reference number to check your inquiry status from our homepage.
          </p>
          <p className="inquiry-reference" aria-label={`Inquiry number ${submittedNumber}`}>
            {submittedNumber}
          </p>
          {notificationError && (
            <>
              <p className="form-error" role="status">
                {notificationError}
              </p>
              {submittedInquiry && (
                <button
                  className="button button-accent"
                  type="button"
                  disabled={isRetryingNotification}
                  onClick={async () => {
                    setIsRetryingNotification(true)
                    await sendEmailNotification(submittedInquiry, submittedNumber)
                    setIsRetryingNotification(false)
                  }}
                >
                  {isRetryingNotification ? 'Retrying notification…' : 'Retry email notification'}
                </button>
              )}
            </>
          )}
          <Link className="text-link" to="/">
            Back to home <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <form className="inquiry-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-section-title">
            <span>01</span>
            <div>
              <h2>About you</h2>
              <p>Where can we reach you?</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>
                Full name <b>*</b>
              </span>
              <input
                autoComplete="name"
                {...register('name')}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </label>
            <label className="field">
              <span>
                Email address <b>*</b>
              </span>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>
            <label className="field">
              <span>Company or creator name</span>
              <input autoComplete="organization" {...register('company')} />
            </label>
            <label className="field">
              <span>Website or social profile</span>
              <input type="url" placeholder="https://" {...register('websiteOrSocial')} />
            </label>
          </div>

          <div className="form-section-title">
            <span>02</span>
            <div>
              <h2>Your project</h2>
              <p>What would you like to create together?</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>
                Service <b>*</b>
              </span>
              <select {...register('service')} aria-invalid={Boolean(errors.service)}>
                <option value="">Select a service</option>
                <option>YouTube video editing</option>
                <option>Short-form content</option>
                <option>Podcast editing</option>
                <option>Motion graphics and animation</option>
                <option>Color grading and sound</option>
                <option>Brand or commercial video</option>
                <option>Other / not sure yet</option>
              </select>
              {errors.service && <small className="field-error">{errors.service.message}</small>}
            </label>
            <label className="field">
              <span>Approximate budget</span>
              <select {...register('budget')}>
                <option value="">Prefer not to say</option>
                <option>Under $500</option>
                <option>$500–$1,500</option>
                <option>$1,500–$5,000</option>
                <option>$5,000+</option>
                <option>Not sure yet</option>
              </select>
            </label>
            <label className="field">
              <span>Target deadline</span>
              <input type="date" {...register('deadline')} />
            </label>
            <label className="field">
              <span>Video length or deliverables</span>
              <input
                placeholder="e.g. 1 x 10 min video, 3 social cutdowns"
                {...register('deliverables')}
              />
            </label>
            <label className="field field-full">
              <span>
                Tell us about your project <b>*</b>
              </span>
              <textarea
                rows={5}
                placeholder="The idea, the audience, what footage you have — anything that helps us understand."
                {...register('projectDescription')}
                aria-invalid={Boolean(errors.projectDescription)}
              />
              {errors.projectDescription && (
                <small className="field-error">{errors.projectDescription.message}</small>
              )}
            </label>
            <label className="field field-full">
              <span>Reference links</span>
              <textarea
                rows={2}
                placeholder="Links to examples, footage, or a brief (one per line)"
                {...register('referenceLinks')}
              />
            </label>
          </div>
          <input
            className="honeypot"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            {...register('website')}
          />
          <label className="consent-field">
            <input type="checkbox" {...register('consent')} />
            <span>
              It’s okay for A Z Studios to contact me about this inquiry. <b>*</b>
            </span>
          </label>
          {errors.consent && <small className="field-error">{errors.consent.message}</small>}
          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
          <div className="form-submit-row">
            <button className="button button-accent" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send inquiry'} <ArrowUpRight size={16} />
            </button>
            <span>We’ll only use your details to respond to this inquiry.</span>
          </div>
        </form>
      )}
    </div>
  )
}
