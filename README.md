# A Z Studios

A Z Studios is a React + TypeScript public portfolio and owner-admin CMS backed by an Express REST API and MongoDB. The public site only reads published projects, approved testimonials, active services, and approved client profiles. Contact inquiries are validated and saved to MongoDB.

## Requirements

- Node.js 24 or a currently supported Node.js LTS release
- npm 11+
- MongoDB 7+ (local or hosted)
- Cloudinary account for signed media uploads (optional until uploads are configured)

## Local setup

In PowerShell, use `npm.cmd` instead of `npm` if script execution is restricted. PowerShell may try to launch `npm.ps1`, which is blocked by some Windows execution policies; `npm.cmd` invokes npm without changing that policy. This repository already has its package manifests, so do not run `npm init`.

1. Install workspace dependencies:

   ```powershell
   npm.cmd install
   ```

2. Copy `Backend\.env.example` to `Backend\.env` and set `MONGODB_URI` and a randomly generated `JWT_SECRET` of at least 32 characters. Copy `Frontend\.env.example` to `Frontend\.env` if you need to configure a separate API origin.

3. Start the frontend and API:

   ```powershell
   npm.cmd run dev
   ```

   The Vite server runs at `http://localhost:5173`, and proxies `/api` to the API at `http://localhost:4000`.

4. Seed the initial service descriptions (only inserts them when the services collection is empty):

   ```powershell
   npm.cmd run seed-services --workspace Backend
   ```

5. Provision the first owner account from a secure terminal. Admin login uses an email address (not a username). Set `BOOTSTRAP_ADMIN_EMAIL` and a unique, temporary password of at least 12 characters in `Backend\.env` for this one-time command, then remove those bootstrap values after provisioning. Do not use a shared or predictable password:

   ```powershell
   npm.cmd run create-admin --workspace Backend
   ```

   Open `http://localhost:5173/admin/login` to access the CMS. There is no public admin registration route.

   The owner can create additional accounts from **Admin accounts** in the dashboard. Select the sections each admin may view and edit. Unchecked sections are blocked. Admin account management remains owner-only; removing an account immediately invalidates its sessions.

## Checks and production build

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run format:check
```

## Content management

The dashboard at `/admin` manages projects, client showcases, testimonials, services, site settings, inquiries, and client ratings. Site settings can configure the studio email, contact number, Discord ID, and social links shown in the site footer. Authorized admins can create, edit, and delete inquiries (including inquiries received by phone or message) and ratings. Client showcases can include a video, a video thumbnail, an approved feedback screenshot, and a social platform handle. Draft and archived projects are excluded from public portfolio APIs. Only approved testimonials and published client profiles are public. Visitors can submit a one-to-five-star studio rating with their name and social platform ID; those details are stored privately and are not included in the public rating summary. Publish client feedback and profiles only after obtaining permission.

Project video and image fields accept delivered media URLs or signed Cloudinary uploads when Cloudinary credentials and a restricted signed upload preset are configured. The API verifies uploaded asset folder, media type, format, and size with Cloudinary, and deletes rejected assets. Configure the preset to enforce allowed formats and maximum file sizes during upload as well. The Cloudinary API secret remains server-only. Replaced and removed assets may require manual cleanup in Cloudinary.

Contact inquiries are saved to MongoDB and assigned an eight-digit reference number. Visitors can optionally provide a contact number, including their country code. Visitors can use the reference number on the homepage to check the current inquiry status. To receive an EmailJS notification, set `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` in `Frontend\.env`, configure the EmailJS template's recipient as the studio inbox, and use the template variables `inquiry_number`, `from_name`, `from_email`, `contact_number`, `company`, `service`, `project_description`, `budget`, `deadline`, `deliverables`, `reference_links`, and `reply_to`. The supplied service ID is prefilled in the local frontend env file. Email notification failures do not discard an inquiry and are shown to the visitor after the inquiry has been saved. The public key is intended for frontend use; do not put an EmailJS private key there.

Inquiry status changes can include an optional internal note. Notes are visible to authenticated admins in inquiry history and are not emailed to the customer. Admin-created inquiries also receive a unique eight-digit reference number, so they can be tracked through the public status lookup.

`INQUIRY_WEBHOOK_URL` is an optional alternative server-side HTTPS notification webhook.

The optional 3D intro can be replayed from the site footer; it uses the supplied Canon AT-1 FBX model and its 2K texture maps from `Frontend\public\models\canon-at1`, with the studio backdrop at `Frontend\public\models\studio\studio.fbx`. Keep these assets at those paths when deploying. The original source files remain in `canon-at-1-retro-camera` and `photo-studio-demo`; verify that you have permission to publish the models and follow any attribution terms that came with them.

## Deployment notes

- Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `FRONTEND_ORIGIN` to the exact HTTPS frontend origin, and a strong random `JWT_SECRET`.
- If the API runs behind a trusted reverse proxy, set `TRUST_PROXY` to the number of proxy hops so rate limits use the client address safely.
- Keep the frontend and API on the same site (for example, `studio.example.com` and `api.example.com`) so the HTTP-only `SameSite=Strict` admin session cookie is sent.
- In local development, `VITE_API_URL` can point directly to the API; leave it empty to use the Vite `/api` proxy. Production builds use same-origin `/api` requests so the backend can set first-party admin session cookies.
- For the Vercel frontend and Render backend deployment, `Frontend/vercel.json` proxies `/api/*` through the frontend domain to Render. In Render, set `FRONTEND_ORIGIN` to the exact frontend origin without a trailing slash.
- The backend can run on Vercel with the project root set to `Backend` and the Express preset. Its Express app exports a default handler and connects to MongoDB on API requests. Configure all backend environment variables in Vercel and allow the deployment to reach MongoDB Atlas; check Vercel function logs if requests fail.
- Restrict MongoDB network access to the API environment and use database credentials with least privilege.
- Configure Cloudinary credentials and the restricted upload preset only in backend secrets. Limit the preset to the expected image/video formats, `az-studios` folder, and size limits; set retention policies in the Cloudinary account.
- Use HTTPS, managed secrets, database backups, and a process manager/platform health checks in production.
- Provision the initial owner account through the one-time command; do not add a public registration endpoint.

## API outline

- Public read APIs: `/api/public/projects`, `/api/public/services`, `/api/public/clients`, `/api/public/testimonials`, `/api/public/site-settings`
- Public inquiry: `POST /api/public/inquiries`
- Public inquiry status: `GET /api/public/inquiries/:inquiryNumber`
- Public star ratings: `GET` and `POST /api/public/ratings`
- Admin session: `/api/admin/auth/login`, `/api/admin/auth/logout`, `/api/admin/auth/me`
- Admin content APIs: `/api/admin/projects`, `/api/admin/clients`, `/api/admin/testimonials`, `/api/admin/services`, `/api/admin/site-settings`, `/api/admin/inquiries`, `/api/admin/ratings`
- Signed upload configuration: `POST /api/admin/uploads/signature`
- Health: `/api/health`
