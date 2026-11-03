export type InquiryNotification = {
  recipientEmail: string
  inquiryNumber?: string
  name: string
  email: string
  contactNumber?: string
  company?: string
  service: string
  projectDescription: string
  budget?: string
  budgetCurrency?: string
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
  if (!inquiry.recipientEmail) {
    throw new Error(
      'No inquiry notification recipient is set. Add one in Admin → Site settings, or set the studio contact email.',
    )
  }

  const formattedMessage = [
    inquiry.inquiryNumber && `Inquiry number: ${inquiry.inquiryNumber}`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.contactNumber && `Contact number: ${inquiry.contactNumber}`,
    inquiry.company && `Company: ${inquiry.company}`,
    `Service: ${inquiry.service}`,
    `Project description:\n${inquiry.projectDescription}`,
    inquiry.budget &&
      `Budget: ${[inquiry.budget, inquiry.budgetCurrency].filter(Boolean).join(' ')}`,
    inquiry.deadline && `Deadline: ${inquiry.deadline}`,
    inquiry.deliverables && `Deliverables: ${inquiry.deliverables}`,
    inquiry.referenceLinks && `Reference links: ${inquiry.referenceLinks}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: VITE_EMAILJS_SERVICE_ID,
      template_id: VITE_EMAILJS_TEMPLATE_ID,
      user_id: VITE_EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: inquiry.recipientEmail,
        title: `New studio inquiry${inquiry.inquiryNumber ? ` #${inquiry.inquiryNumber}` : ''}`,
        name: inquiry.name,
        email: inquiry.email,
        time: new Date().toLocaleString(),
        message: formattedMessage,
        inquiry_number: inquiry.inquiryNumber ?? '',
        from_name: inquiry.name,
        from_email: inquiry.email,
        contact_number: inquiry.contactNumber ?? '',
        company: inquiry.company ?? '',
        service: inquiry.service,
        project_description: inquiry.projectDescription,
        budget: inquiry.budget
          ? [inquiry.budget, inquiry.budgetCurrency].filter(Boolean).join(' ')
          : '',
        budget_currency: inquiry.budget ? (inquiry.budgetCurrency ?? '') : '',
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
