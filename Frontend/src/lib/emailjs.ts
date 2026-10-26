export type InquiryNotification = {
  inquiryNumber?: string
  name: string
  email: string
  contactNumber?: string
  company?: string
  service: string
  projectDescription: string
  budget?: string
  deadline?: string
  deliverables?: string
  referenceLinks?: string
}

export async function sendStudioInquiryNotification(inquiry: InquiryNotification) {
  const { VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID } = import.meta
    .env
  if (!VITE_EMAILJS_SERVICE_ID || !VITE_EMAILJS_TEMPLATE_ID || !VITE_EMAILJS_PUBLIC_KEY) {
    throw new Error(
      'EmailJS is not fully configured. Check the service ID, template ID, and public key.',
    )
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: VITE_EMAILJS_SERVICE_ID,
      template_id: VITE_EMAILJS_TEMPLATE_ID,
      user_id: VITE_EMAILJS_PUBLIC_KEY,
      template_params: {
        inquiry_number: inquiry.inquiryNumber ?? '',
        from_name: inquiry.name,
        from_email: inquiry.email,
        contact_number: inquiry.contactNumber ?? '',
        company: inquiry.company ?? '',
        service: inquiry.service,
        project_description: inquiry.projectDescription,
        budget: inquiry.budget ?? '',
        deadline: inquiry.deadline ?? '',
        deliverables: inquiry.deliverables ?? '',
        reference_links: inquiry.referenceLinks ?? '',
        reply_to: inquiry.email,
      },
    }),
    signal: AbortSignal.timeout(8000),
  })

  const message = (await response.text()).trim().slice(0, 300)
  if (!response.ok) {
    throw new Error(`EmailJS returned HTTP ${response.status}${message ? `: ${message}` : '.'}`)
  }
}
