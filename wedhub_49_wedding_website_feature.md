# Feature: ₹49 Instant Wedding Website Creation

## Goal

Add a new monetized feature inside WedHub:

> **Create Your Wedding Website – ₹49**

Users and vendors can quickly create a beautiful, mobile-first wedding website, preview it once for free, and then pay ₹49 to publish a permanent shareable website.

---

# Core Product Flow

```text
Chatbot / Vendor Dashboard
        ↓
Create Wedding Website – ₹49
        ↓
Choose Template
        ↓
Enter Wedding Details
        ↓
Add Events
        ↓
Upload Photos
        ↓
Customize Content
        ↓
Generate ONE Free Preview
        ↓
Preview Wedding Website
        ↓
"Publish My Website – ₹49"
        ↓
Razorpay Payment
        ↓
Backend Payment Verification
        ↓
Permanent Wedding Website
        ↓
Share on WhatsApp / Social Media
```

## Key Business Rule

The user gets **ONE free public preview** before paying.

The preview is temporary and is not the permanent website.

If the user does not pay:

- The temporary preview expires.
- The preview URL becomes invalid.
- The user's draft/data is NOT deleted.
- The user can return to the draft.
- The user cannot generate unlimited free public previews.

After successful payment:

- The temporary preview is invalidated.
- The website becomes permanently published.
- A permanent public URL is generated.
- The user can edit the website without paying again.

---

# Important: Inspect Before Coding

Before writing code:

1. Inspect the existing WedHub frontend architecture.
2. Inspect the existing backend architecture.
3. Inspect the database/schema/models.
4. Inspect authentication and authorization.
5. Inspect the existing Razorpay/payment implementation.
6. Inspect the existing Razorpay webhook implementation if available.
7. Inspect the existing image/file upload and storage system.
8. Inspect the existing vendor dashboard.
9. Inspect the existing chatbot/bot flow.
10. Inspect existing routing.
11. Inspect existing UI components/design system.
12. Inspect existing notification/toast systems.
13. Inspect existing public/vendor profile systems.
14. Inspect existing SEO/social sharing implementation.

Reuse existing infrastructure wherever possible.

**Do not create duplicate authentication, payment, storage, upload, notification, or API systems if equivalent functionality already exists.**

Do not unnecessarily modify unrelated features.

Follow the existing project's architecture, naming conventions, coding style, validation patterns, API patterns, and folder structure.

---

# Feature Entry Points

The feature must be accessible from two locations.

## 1. Chatbot

Add a prominent chatbot option:

> 💍 Create Your Wedding Website – ₹49

The chatbot should guide the user through the creation process.

Example flow:

**Bot:**

> Let's create your wedding website for just ₹49 💍

Collect information progressively.

Do not show one massive form.

Suggested flow:

1. Bride name
2. Groom name
3. Wedding date
4. Wedding time
5. Venue
6. Location
7. Wedding events
8. Couple story
9. Photos

Then:

> Your wedding website preview is ready ❤️

CTA:

**Preview Website**

After preview:

> Love your website?

CTA:

**Publish My Website – ₹49**

After successful payment:

> Your wedding website is live 🎉❤️

Show:

- Live website URL
- Copy URL
- Share on WhatsApp
- View Website
- Edit Website

---

## 2. Vendor Dashboard

Add a new module/card:

### Wedding Website

Subtitle:

> Create a beautiful wedding website for just ₹49

CTA:

**Create Website – ₹49**

Vendors should be able to create a wedding website for themselves or their wedding clients according to the existing vendor/user permission model.

Do not introduce a separate vendor account system.

Reuse existing authentication and ownership architecture.

---

# Website Creation Flow

Create a dedicated website creation experience.

Progress indicator:

```text
1. Template
2. Details
3. Events
4. Photos
5. Preview
6. Payment
7. Published
```

The UI should be simple and mobile-friendly.

---

# Step 1 — Template Selection

Initially create at least 3 wedding website templates:

1. Royal Wedding
2. Minimal Elegant
3. Traditional Indian Wedding

Templates must be data-driven.

Do not create three completely independent applications.

Use:

```text
WeddingWebsite data
        +
Template renderer
        ↓
Different visual designs
```

The same wedding data should work across all templates.

The user should be able to change the template before payment.

Changing the template must not delete wedding information.

After payment, allow template changes without requiring another payment.

---

# Step 2 — Wedding Details

Collect:

- Bride name
- Groom name
- Wedding date
- Wedding time
- Venue name
- Venue address
- Google Maps location
- Short description

Optional:

- Bride parents
- Groom parents
- Wedding hashtag
- Contact information
- Instagram/social links

Validate all required fields.

---

# Step 3 — Events

Allow multiple wedding events.

Examples:

- Engagement
- Mehendi
- Haldi
- Wedding
- Reception

Each event should contain:

- Event name
- Date
- Time
- Venue
- Description

Allow:

**+ Add Event**

and event deletion/editing.

Do not unnecessarily restrict the number of events unless there is an existing business rule.

---

# Step 4 — Photos

Allow:

### Cover Photo

One main hero/cover image.

### Couple Photos

Optional couple images.

### Gallery

Multiple wedding photos.

Reuse the existing WedHub upload/storage infrastructure.

Do not introduce another storage provider if an existing storage system already exists.

Use existing image optimization/compression infrastructure if available.

Validate:

- File type
- File size
- Image dimensions where appropriate

---

# Step 5 — Couple Story

Allow:

- Couple story
- Bride description
- Groom description

Optional:

- How we met
- Relationship timeline

Keep this simple for the ₹49 product.

---

# Draft System

Before payment, the website must exist as a **DRAFT**.

The user should not lose entered information if:

- They refresh.
- They leave the page.
- They close the browser.
- They abandon payment.

Use the existing persistence architecture.

Conceptual state:

```text
draft
preview
published
```

The draft remains after preview expiration.

---

# One-Time Temporary Preview

This is a critical business requirement.

The user gets **ONE free public preview**.

When the user clicks:

**Preview Website**

the backend should:

1. Verify the user owns the draft.
2. Generate a cryptographically secure random preview token.
3. Store the token securely.
4. Store preview creation time.
5. Store preview expiration time.
6. Mark the preview as used.
7. Return a temporary preview URL.

Example:

```text
wedhub.com/preview/8f72a9c1...
```

The token must be:

- Random
- Non-guessable
- Sufficiently long
- Impossible to derive from database IDs
- Invalid after expiration

Do not use sequential IDs as preview tokens.

---

# Preview Expiration

The preview URL must automatically expire after a configurable duration.

Recommended default:

```text
60 minutes
```

Do not scatter `60` throughout the code.

Use a configurable backend setting/environment/config value.

Example concept:

```text
WEDDING_WEBSITE_PREVIEW_EXPIRY_MINUTES=60
```

Use the project's existing configuration conventions.

---

# Preview Security

Temporary previews must:

- Not be indexed by search engines.
- Use `noindex, nofollow`.
- Not appear in public website listings.
- Not appear in sitemaps.
- Not expose private dashboard information.
- Not expose payment secrets.
- Not expose unnecessary owner information.
- Not be editable through the public preview endpoint.

The public preview endpoint should return only the website content necessary to render the preview.

---

# Expired Preview

If the user opens the preview after expiration, show:

```text
Your preview has expired ❤️

Your wedding website is ready to publish.

Publish your wedding website for just ₹49
and get your permanent shareable link.

[Publish My Website – ₹49]
```

Do not show the wedding website contents after expiration.

The preview token must be rejected by the backend.

---

# Important — Do Not Delete the Draft

When the preview expires:

**Do not delete:**

- Bride name
- Groom name
- Events
- Photos
- Couple story
- Template
- Other draft information

Only invalidate the public preview access.

The user should be able to return to the dashboard and continue editing their draft.

---

# Preview Limit

Business requirement:

## One Free Public Preview Per Draft

Once:

```text
previewUsedAt != null
```

the user should not be able to generate unlimited new public preview URLs.

If they attempt to create another public preview without paying, show:

```text
Your free preview has already been used ❤️

Publish your wedding website for ₹49
to get your permanent shareable link.

[Publish My Website – ₹49]
```

However, the user should still be able to:

- Edit their draft
- Change text
- Change template
- Manage photos
- Manage events

without paying again.

Do not regenerate a public preview every time they edit.

---

# Preview vs Published Website

The architecture must clearly separate temporary preview and published website.

## Temporary Preview

```text
/preview/{token}
```

Properties:

- Temporary
- Requires valid token
- Expires
- Not indexed
- Not a permanent shareable URL
- Available only for the one free preview

## Published Website

Example:

```text
/wedding/rahul-weds-anu
```

Properties:

- Permanent
- Public
- Shareable
- Created only after successful payment verification
- Indexable if SEO is enabled

---

# Website Preview

The preview must use the **exact same renderer/component/template system** as the final published website.

Do not create unrelated preview and production implementations.

Preferred architecture:

```text
WeddingWebsiteRenderer
        ↓
Template
        ↓
WeddingWebsiteData
```

The same renderer should support:

```text
preview mode
published mode
```

---

# Public Wedding Website

After payment, the published website should contain:

1. Hero section
2. Couple names
3. Wedding date
4. Countdown
5. Couple photo
6. Wedding events
7. Venue
8. Google Maps button
9. Couple story
10. Photo gallery
11. RSVP/contact section
12. Social/share buttons

Design requirements:

- Premium
- Elegant
- Romantic
- Mobile-first
- Fast
- Responsive
- Wedding-focused

Most traffic will likely come from WhatsApp/mobile devices, so prioritize mobile UX.

---

# RSVP

If practical with the existing architecture, add a lightweight RSVP feature.

Visitor fields:

- Name
- Attending: Yes / No / Maybe
- Number of guests
- Message

Store responses against the wedding website.

Website owner/vendor can view RSVP responses from the dashboard.

Do not over-engineer RSVP.

---

# Google Maps

The venue section should support a Google Maps location/button.

Reuse an existing Google Maps integration if WedHub already has one.

If not, store the location/maps URL cleanly so proper Maps integration can be added later.

Do not introduce unnecessary Google API costs for the basic ₹49 product.

---

# Sharing

After publishing, show:

```text
Your Wedding Website is Live ❤️
```

Display:

- Website URL
- Copy Link
- WhatsApp Share
- Facebook Share
- Native Web Share API where supported

WhatsApp message example:

```text
💍 You're invited!

Join us as we celebrate our wedding ❤️

View our wedding website:
[URL]
```

---

# Website URL / Slug

After successful payment, generate a permanent readable URL.

Example:

```text
wedhub.com/wedding/rahul-weds-anu
```

The slug must:

- Be URL-safe
- Be unique
- Be readable
- Handle duplicate names
- Prevent collisions

Example:

```text
rahul-weds-anu
rahul-weds-anu-2
rahul-weds-anu-3
```

Do not expose database IDs as public URLs if the existing architecture allows readable slugs.

---

# Payment — ₹49

Use the existing Razorpay implementation.

Price:

```text
₹49 INR
```

There must be one source of truth for this price.

Example concept:

```text
WEDDING_WEBSITE_PRICE = 49
```

Do not duplicate the amount throughout frontend/backend.

Follow the project's existing configuration conventions.

---

# Payment Flow

When the user clicks:

**Publish My Website – ₹49**

Flow:

```text
Frontend
   ↓
Backend create order
   ↓
Razorpay
   ↓
User pays
   ↓
Razorpay response/webhook
   ↓
Backend verifies payment
   ↓
Mark website paid
   ↓
Publish website
   ↓
Generate permanent URL
```

## Critical

Never trust frontend payment success.

Payment must be verified on the backend.

---

# Payment Security

Handle:

- Successful payment
- Failed payment
- Cancelled payment
- Duplicate payment attempts
- Duplicate webhook delivery
- Payment retries
- Invalid signatures
- Already-paid websites

The payment process must be idempotent.

A single successful payment must not accidentally create multiple published websites.

Reuse the existing Razorpay webhook architecture if available.

---

# After Successful Payment

Once backend verification succeeds:

```text
paymentStatus = paid
status = published
publishedAt = current time
```

Then:

- Invalidate preview token.
- Remove/disable preview access.
- Generate permanent slug.
- Publish website.
- Return permanent URL.
- Show sharing options.

The permanent website must NOT become public before backend payment verification.

---

# Already Paid Website

If a website has already been paid for:

- Do not charge again.
- Allow editing.
- Allow template changes.
- Allow photo changes.
- Allow event changes.
- Allow content updates.
- Keep the permanent URL.

Payment is for creating/publishing the website, not every subsequent edit.

---

# Website Management

Add:

## Wedding Website Dashboard

Actions:

- View Website
- Edit Website
- Change Template
- Manage Details
- Manage Events
- Manage Photos
- View RSVPs
- Copy URL
- Share Website

Show status:

```text
Draft
Preview Used
Payment Pending
Published
```

Use the existing dashboard design patterns.

---

# SEO

For published websites dynamically generate:

- `<title>`
- Meta description
- Open Graph title
- Open Graph description
- Open Graph image

Example:

```text
Rahul & Anu | Wedding
```

Description:

```text
Join Rahul & Anu as they celebrate their wedding.
```

Use the cover image as the Open Graph image when available.

Temporary previews must use:

```html
<meta name="robots" content="noindex, nofollow">
```

and must not be included in sitemap generation.

---

# Performance

Public wedding websites must be lightweight.

Optimize:

- Images
- Lazy loading
- Gallery rendering
- API payloads
- Initial page load

Avoid loading the entire WedHub application unnecessarily for public wedding pages if the existing architecture allows a lightweight public route.

---

# Access Control

Users can only:

- Create their own drafts.
- Edit their own drafts.
- Preview their own drafts.
- Publish their own drafts.

Vendors can manage websites only according to their existing authorization/business relationships.

Public visitors can:

- View published wedding websites.
- Submit RSVP if enabled.

Public visitors must NOT be able to:

- Edit
- Access dashboard data
- Access draft data
- Access payment information
- Access private owner information

All ownership checks must happen on the backend.

---

# Database Design

Create/reuse a reusable `WeddingWebsite` entity/model.

Conceptually support:

```text
WeddingWebsite

id
ownerId
vendorId (if applicable)
template
slug

status
paymentStatus

weddingDetails
coupleDetails
events
gallery

previewToken / previewTokenHash
previewCreatedAt
previewExpiresAt
previewUsedAt

payment/order reference

publishedAt

createdAt
updatedAt
```

Do not blindly copy this schema.

Adapt it to the existing database technology and project conventions.

Keep payment records properly related to the website/order.

---

# Preview Token Handling

Do not store sensitive tokens insecurely.

If appropriate for the existing architecture:

```text
previewTokenHash
```

can be stored instead of the raw token.

The URL contains the raw token while the backend validates its secure representation.

Follow existing security conventions.

---

# Admin Dashboard

If an admin dashboard already exists, add basic visibility for:

- Number of wedding websites
- Website owner
- Template
- Payment status
- Website status
- Created date
- Published date

Do not build a large admin system for this feature.

---

# UI/UX

The feature should feel premium despite costing only ₹49.

Primary CTA:

> **Create Wedding Website – ₹49**

After preview:

> **Publish My Wedding Website – ₹49**

Use:

- Elegant wedding visuals
- Strong typography
- Clear progress
- Large mobile-friendly buttons
- Minimal form friction
- Clear payment messaging

Avoid making it look like a generic website builder.

---

# Mobile-First

The following must work properly on mobile:

- Template selection
- Form entry
- Photo uploads
- Preview
- Payment
- Public website
- WhatsApp sharing
- RSVP

Test small screens as well as desktop.

---

# Lead Capture

Since this is also a lead-generation product for WedHub, capture appropriate user contact information before payment.

At minimum, where appropriate within the existing authentication/user flow:

- Name
- Phone/WhatsApp
- Email if available

Do not ask repeatedly for information already available from the user's account.

The goal is to retain the lead even if the user abandons Razorpay.

Do not make lead capture intrusive.

---

# Abandoned Payment

If the user reaches payment but does not complete it:

- Keep the draft.
- Keep payment/order state correctly recorded.
- Keep the preview state according to the one-preview rule.
- Allow the user to return later.
- Allow payment retry.
- Do not create a permanent public website.

---

# Future Extensibility

Architect the feature so future paid products can be added without rewriting the system.

Potential future products:

```text
₹49 Basic Wedding Website
₹99 Premium Website
₹199 Custom Domain
₹299 Premium Templates
```

Do NOT implement these now.

Only make the architecture extensible enough for future pricing tiers/products.

The current product remains:

```text
₹49 Wedding Website
```

---

# API Requirements

Use the existing API architecture and naming conventions.

Conceptually the system will need functionality for:

## Draft

- Create draft
- Get draft
- Update draft
- Delete draft if appropriate

## Templates

- List templates

## Preview

- Generate one-time preview
- Validate preview token
- Expire preview
- Prevent additional free previews

## Payment

- Create Razorpay order
- Verify payment
- Handle webhook

## Publishing

- Publish website after verified payment
- Generate permanent slug

## Management

- Update published website
- Manage photos
- Manage events
- View RSVP

Do not create these exact endpoints blindly.

Inspect existing API conventions first.

---

# Error Handling

Provide proper UX for:

- Invalid form data
- Upload failures
- Preview generation failures
- Expired preview
- Preview already used
- Payment failure
- Payment cancellation
- Payment verification failure
- Slug collision
- Unauthorized access
- Website not found
- Network errors

Never expose stack traces or sensitive backend information to users.

---

# Mandatory Business Rules

These rules are mandatory:

### Rule 1
One free public preview per draft.

### Rule 2
Preview expires automatically.

### Rule 3
Expired preview does not delete the draft.

### Rule 4
No permanent public website before successful verified ₹49 payment.

### Rule 5
Successful payment permanently publishes the website.

### Rule 6
Editing after payment does not require another payment.

### Rule 7
Preview URLs must not be indexed.

### Rule 8
Public visitors cannot access draft data.

### Rule 9
Payment verification happens on the backend.

### Rule 10
Payment processing must be idempotent.

### Rule 11
Users cannot bypass the ₹49 payment by manipulating frontend state.

### Rule 12
Preview and published website must use the same template renderer.

---

# Final User Experience

The experience should feel like:

```text
❤️ Create Your Wedding Website

Choose a beautiful template
        ↓
Add your wedding details
        ↓
Upload your photos
        ↓
✨ Preview your website
        ↓
Love it?
        ↓
₹49
        ↓
🎉 Your website is live!
        ↓
Share with everyone
```

The customer should clearly understand:

> **A beautiful, shareable wedding website for just ₹49.**

---

# Implementation Process

Do not immediately start modifying files.

First inspect the existing codebase and determine:

1. Existing frontend architecture
2. Existing backend architecture
3. Existing database
4. Existing auth
5. Existing payment system
6. Existing Razorpay webhook
7. Existing storage/upload
8. Existing chatbot
9. Existing vendor dashboard
10. Existing public routes
11. Existing SEO system
12. Existing reusable UI components

Then implement the feature using the existing architecture.

Do not rewrite unrelated modules.

Do not introduce unnecessary dependencies.

Do not create duplicate infrastructure.

---

# Testing

After implementation:

1. Run existing tests.
2. Run lint.
3. Run type checking if applicable.
4. Verify all new routes.
5. Verify all new APIs.
6. Verify draft creation.
7. Verify editing.
8. Verify template switching.
9. Verify image uploads.
10. Verify one-time preview.
11. Verify preview expiration.
12. Verify expired preview cannot expose website data.
13. Verify second preview is blocked.
14. Verify Razorpay order creation.
15. Verify backend payment signature validation.
16. Verify webhook handling.
17. Verify duplicate webhook idempotency.
18. Verify successful publication.
19. Verify permanent URL generation.
20. Verify post-payment editing.
21. Verify ownership/security.
22. Verify RSVP if implemented.
23. Verify WhatsApp sharing.
24. Verify SEO metadata.
25. Verify mobile responsiveness.
26. Verify existing WedHub functionality remains unaffected.

---

# Final Response From Claude

After implementation, provide a concise implementation report containing:

## 1. Files Changed

List important files.

## 2. Database Changes

Explain new/modified models and migrations.

## 3. APIs

List new API routes/endpoints.

## 4. Frontend Routes

List new frontend routes.

## 5. Payment

Explain how Razorpay is integrated and verified.

## 6. Preview System

Explain:

- Preview token
- Expiration
- One-preview restriction
- Expired-preview handling

## 7. Public Website

Explain the published website architecture.

## 8. Environment Variables

List any new environment variables.

## 9. Testing

Report what was tested and any remaining issues.

## 10. Future Extension

Briefly explain how future pricing tiers/custom domains can be added without major architectural changes.
