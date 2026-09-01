# WedHub — Product Requirements & Business Specification

**Document:** Product Specification  
**Product:** WedHub  
**Version:** 1.0  
**Status:** Foundation specification for production development  
**Primary model:** Wedding discovery marketplace + vendor lead generation + vendor subscriptions  
**Primary actors:** End User, Vendor, Admin  
**Initial messaging channel:** Telegram MVP  
**Future messaging channel:** WhatsApp Business  
**Primary database:** PostgreSQL only  
**Media storage:** Object storage such as Cloudflare R2  
**Architecture direction:** Modular monolith, production-ready and horizontally scalable

---

# 1. Product Definition

WedHub is a digital wedding marketplace that helps couples discover wedding vendors, compare services, shortlist businesses, request information, communicate with vendors, and make informed booking decisions.

For vendors, WedHub is a customer-acquisition and digital-presence platform. Vendors receive a professional profile, portfolio, service presentation, enquiries/leads, analytics, and optional paid visibility.

WedHub is **not initially a wedding ERP, event-management system, or payment intermediary**. Its primary business value is:

> **Discovery → Trust → Enquiry → Vendor Response → Conversion**

The platform should eventually support the full wedding ecosystem:

- Venues
- Photographers
- Videographers
- Wedding planners
- Decorators
- Makeup artists
- Mehndi artists
- Caterers
- DJs
- Live bands
- Choreographers
- Bridal wear
- Groom wear
- Jewellery
- Invitations
- Cakes
- Florists
- Transportation
- Rentals
- Entertainment
- Honeymoon/travel providers
- Destination wedding providers
- Other wedding-related businesses

The category system must be dynamic and admin-managed.

---

# 2. Product Goals

## 2.1 End-user goals

A couple should be able to:

1. Discover vendors by category and location.
2. Search using natural requirements.
3. View professional vendor profiles.
4. Browse large portfolios quickly.
5. Understand services and pricing.
6. Compare vendors.
7. Save vendors to shortlists.
8. Submit an enquiry without friction.
9. Receive recommendations.
10. Communicate with vendors.
11. Track enquiry status.
12. Review vendors after a legitimate interaction.
13. Use Telegram initially and WhatsApp later for conversational discovery.

## 2.2 Vendor goals

A vendor should be able to:

1. Create or receive a professional profile.
2. Upload portfolio media.
3. Define services and packages.
4. Define pricing.
5. Define service areas.
6. Receive qualified enquiries.
7. Manage leads.
8. Respond to users.
9. Track profile performance.
10. Understand lead conversion.
11. Upgrade their subscription.
12. Purchase additional visibility later.
13. Build trust through verified information and reviews.

## 2.3 Admin goals

Admin must be able to:

1. Control the entire marketplace.
2. Approve and reject vendors.
3. Create vendors manually.
4. Manage categories.
5. Manage locations.
6. Manage plans and pricing.
7. Manage subscriptions and payments.
8. Moderate reviews and media.
9. Manage leads.
10. Manage featured vendors.
11. Manage SEO pages and CMS content.
12. Manage users.
13. Manage staff permissions.
14. Audit important actions.
15. Configure platform-wide business rules.

---

# 3. Product Principles

## 3.1 Marketplace first

WedHub must prioritize useful vendor discovery and high-quality enquiries over unnecessary features.

## 3.2 Free supply first

Vendor onboarding should initially be frictionless. A vendor should be able to create a free listing so WedHub can build marketplace density.

## 3.3 Paid value, not paid existence

Paid plans should sell:

- Visibility
- Lead volume
- Lead-management capability
- Analytics
- Promotion
- Featured placement
- Business tools

Do not make the basic existence of a legitimate vendor profile dependent on payment.

## 3.4 Trust is a core product feature

Trust should be created through:

- Vendor verification
- Reviews
- Portfolio quality
- Complete profiles
- Accurate pricing
- Response behavior
- Business information
- Moderation
- Clear sponsored/featured labeling

## 3.5 SEO is a first-class acquisition channel

Vendor, category, location, and content pages must be designed for organic search.

## 3.6 Mobile first

Most wedding discovery activity is expected to occur on mobile devices.

## 3.7 Modular architecture

Start with a modular monolith rather than premature microservices. Each business domain must have clear ownership so high-load components can later be extracted.

---

# 4. User Types

## 4.1 End User

A person planning a wedding or helping plan one.

Typical user:

- Bride
- Groom
- Couple
- Family member
- Wedding planner acting on behalf of a couple

The system should not assume a specific marital role.

## 4.2 Vendor

A business or professional offering wedding-related services.

Examples:

- Photographer
- Venue
- Makeup artist
- Decorator
- Caterer
- Planner

## 4.3 Admin

Internal WedHub staff.

Admin roles should be permission-based.

Example roles:

- Super Admin
- Operations Admin
- Vendor Manager
- Sales
- Finance
- Content Manager
- Moderator
- Support

---

# 5. Vendor Onboarding

There are two vendor creation routes.

## Route A — Vendor self-registration

Vendor:

1. Creates account.
2. Verifies email/phone as required.
3. Selects category.
4. Selects subcategory.
5. Adds business information.
6. Adds location.
7. Adds service areas.
8. Adds description.
9. Adds services.
10. Adds packages.
11. Adds pricing.
12. Uploads portfolio.
13. Adds social links.
14. Adds business hours.
15. Adds availability where applicable.
16. Adds credentials/awards where applicable.
17. Reviews profile.
18. Submits profile for approval.

Status:

`DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → APPROVED`

Possible outcomes:

`REJECTED`, `SUSPENDED`, `DEACTIVATED`

## Route B — Admin-created vendor

Admin can create a vendor on behalf of the business.

Scenario:

A sales/operations employee finds a wedding photographer that is not yet registered.

Admin creates:

- Vendor account
- Category
- Location
- Initial profile

Vendor receives an invitation to claim the account.

The vendor must verify ownership before gaining control of the account.

---

# 6. Vendor Profile

Every vendor profile should contain:

## Identity

- Business name
- Slug
- Logo/profile image
- Cover image
- Short description
- Full description

## Classification

- Category
- Subcategories
- Services
- Tags
- Vendor type

## Location

- Country
- State/province
- City
- Area
- Address where appropriate
- Latitude/longitude where appropriate
- Service areas

## Commercial information

- Starting price
- Price range
- Currency
- Packages
- Custom quotation availability

## Trust information

- Verification status
- Years of experience
- Reviews
- Rating
- Awards
- Certifications where applicable

## Contact

- Website
- Phone
- Email
- Social links
- Enquiry action

## Operational information

- Business hours
- Availability
- Travel policy
- Languages
- Team size

## SEO

- SEO title
- Meta description
- Canonical URL
- Social metadata

---

# 7. Category System

Categories are database-driven.

Admin can:

- Create category
- Edit category
- Disable category
- Reorder categories
- Create subcategories
- Define category attributes
- Define category-specific filters
- Define category-specific comparison fields

Example:

## Photographer attributes

- Photography style
- Traditional
- Candid
- Documentary
- Drone
- Pre-wedding
- Album
- Video
- Number of photographers
- Delivery time

## Venue attributes

- Capacity
- Indoor
- Outdoor
- Parking
- Rooms
- Catering
- Accommodation
- Event types

## Makeup attributes

- Bridal makeup
- Groom makeup
- Trial
- Travel
- Products
- Additional services

Category-specific attributes should be stored using structured relational fields where stable and JSONB where flexibility is required.

---

# 8. Location System

Location hierarchy:

`Country → State/Province → City → Area`

Vendors can have:

- Primary location
- Multiple service areas

Example:

A Toronto vendor can serve:

- Toronto
- Mississauga
- Brampton
- Vaughan
- Markham

Search must consider service areas, not only the vendor's primary address.

---

# 9. Public Discovery

Main public areas:

- Homepage
- Categories
- Cities
- Category pages
- City pages
- Category + city pages
- Search results
- Vendor profiles
- Inspiration
- Blog
- Guides
- FAQs

Example URLs:

`/vendors`

`/vendors/photographers`

`/vendors/photographers/toronto`

`/vendors/venues/toronto`

`/vendors/makeup-artists/toronto`

`/vendors/photographers/toronto/vendor-name`

`/cities/toronto`

---

# 10. Search and Filtering

Search is a core function.

Users can filter by:

- Keyword
- Category
- Subcategory
- Location
- Service area
- Price
- Budget
- Rating
- Availability
- Services
- Features
- Verified status

Sort options:

- Relevance
- Rating
- Popularity
- Distance
- Newest
- Recommended

Paid vendors may receive additional visibility but should not completely override relevance or trust.

Sponsored/featured results must be distinguishable.

Initial search can use PostgreSQL capabilities.

The search module must have an abstraction so a dedicated engine can later be introduced without changing core business models.

Possible future engines:

- OpenSearch
- Elasticsearch
- Typesense
- Algolia

---

# 11. Vendor Ranking

Ranking should eventually combine:

- Relevance
- Category match
- Location match
- Service area
- Profile completeness
- Review quality
- Rating
- Response rate
- Response time
- Lead conversion
- Availability
- Engagement
- Verification
- Subscription/featured status

Subscription should be a controlled ranking signal, not the sole ranking mechanism.

Potential model:

`Organic relevance score + quality score + business visibility score`

Featured listings should be explicitly marked.

---

# 12. Vendor Portfolio and Media

WedHub is media-heavy.

Media types:

- Vendor logo
- Profile image
- Cover image
- Portfolio images
- Album images
- Videos
- Blog images
- Promotional banners

Media must not be stored as binary data in PostgreSQL.

Use object storage.

Recommended initial storage:

**Cloudflare R2**

PostgreSQL stores media metadata and object keys.

Example media record:

- ID
- Vendor ID
- Album ID
- Media type
- Storage provider
- Original object key
- Optimized object key
- Thumbnail object key
- MIME type
- File size
- Width
- Height
- Duration
- Alt text
- Processing status
- Created date

## Image processing

Original:

`5 MB JPEG`

Generate:

- Original
- Large
- Medium
- Thumbnail
- WebP
- AVIF where appropriate

Public pages should use optimized variants.

Use:

- Lazy loading
- Responsive images
- CDN
- Cache headers
- Correct width/height metadata
- Progressive loading

The Node API should not proxy large media.

Upload flow:

`Browser → signed upload URL → object storage → processing queue → optimized variants → CDN`

---

# 13. Vendor Albums

Vendors can organize media.

Example:

Photographer:

- Wedding 1
- Wedding 2
- Engagement
- Pre-wedding
- Traditional Weddings

Each album has:

- Name
- Description
- Cover
- Media
- Visibility
- Sort order

---

# 14. End User Account

User profile:

- Name
- Email
- Phone
- Profile image
- Partner information
- Wedding date
- Wedding location
- Guest count
- Budget
- Preferred categories
- Preferences

The wedding profile is optional during initial registration.

Users should be able to browse without creating an account.

Account creation should be requested when necessary for:

- Favorites
- Shortlists
- Enquiries
- Reviews
- Personalized recommendations

---

# 15. Favorites and Shortlists

User can favorite vendors.

Users can create named collections:

- Photographers
- Venues
- Makeup
- Final shortlist

A vendor can belong to multiple collections.

Shortlists should be private by default.

Future capability:

Share shortlist with partner/family through a secure link.

---

# 16. Vendor Comparison

Comparison should be category-aware.

Photographer comparison:

- Starting price
- Rating
- Reviews
- Experience
- Styles
- Deliverables
- Hours
- Location

Venue comparison:

- Price
- Capacity
- Rooms
- Parking
- Indoor/outdoor
- Catering
- Location

The comparison engine must use category-defined comparison attributes.

---

# 17. Lead Generation

Lead generation is one of WedHub's primary business functions.

A lead is created when an end user expresses meaningful interest in a vendor or service.

Lead form can capture:

- Name
- Email
- Phone
- Wedding date
- Wedding location
- Service
- Budget
- Guest count
- Message
- Preferred contact method

Not every field must be mandatory for every category.

The system should minimize friction.

---

# 18. Lead Quality

A qualified lead should ideally have:

- Real contact details
- Requested service
- Wedding location
- Wedding date where relevant
- Budget where relevant
- Genuine intent
- No obvious spam
- No duplicate submission

Lead scoring can consider:

- Completeness
- Intent
- Budget compatibility
- Location compatibility
- Date
- Service
- Contact verification

---

# 19. Lead Routing

Possible routing modes:

## Single vendor enquiry

User enquires directly with one vendor.

Lead is assigned to that vendor.

## Multi-vendor enquiry

User asks WedHub to suggest vendors.

WedHub selects a small number of suitable vendors.

Example:

User:

> I need a wedding photographer in Toronto for June 2027, budget $4,000.

System selects three suitable photographers.

Each receives the lead.

The user should understand that their request is being shared with multiple vendors.

## Category request

User asks:

> Find me wedding makeup artists in Toronto.

System can create a discovery/search experience first and only create leads after explicit intent.

---

# 20. Lead Lifecycle

Lead statuses:

`NEW`

`CONTACTED`

`RESPONDED`

`QUALIFIED`

`MEETING`

`QUOTED`

`WON`

`LOST`

`SPAM`

`CLOSED`

Vendor can update status.

Admin can view and intervene.

Important:

Vendor lead status is not necessarily the same as platform enquiry status. Keep domain concepts separate where required.

---

# 21. Lead Deduplication

The system should detect duplicates using combinations such as:

- User ID
- Vendor ID
- Contact information
- Wedding date
- Service
- Recent submission window

Example:

A user submits the same photographer enquiry five times within five minutes.

The platform should avoid creating five billable leads.

---

# 22. Lead Notifications

Vendor notifications:

- New lead
- Lead reminder
- User replied
- Lead follow-up
- High-intent lead

Channels:

- In-app
- Email
- Telegram MVP
- WhatsApp later
- SMS later

Vendor notification preferences must be configurable.

---

# 23. Vendor Lead Dashboard

Vendor should see:

- New leads
- All leads
- Lead details
- Contact information
- Date received
- Lead source
- Lead status
- Response time
- Notes
- Conversation
- Follow-up reminder
- Conversion outcome

Analytics:

- Leads received
- Leads contacted
- Response rate
- Average response time
- Qualified leads
- Won leads
- Lost leads
- Conversion rate

---

# 24. Reviews

Users can submit reviews.

Review fields:

- Rating
- Written review
- Photos eventually
- Date
- Service
- Verified interaction status

Vendor can respond.

Admin can:

- Approve
- Hide
- Remove
- Investigate
- Mark disputed

Review anti-abuse:

- One review per legitimate interaction where possible
- Duplicate detection
- User/vendor conflict prevention
- Spam detection
- Report functionality

Do not allow vendors to review themselves.

---

# 25. Vendor Verification

Verification can have levels.

Example:

`UNVERIFIED`

`IDENTITY_VERIFIED`

`BUSINESS_VERIFIED`

`PLATFORM_VERIFIED`

Verification requirements must be configurable by category and geography.

Verification badge must communicate what has actually been verified.

Do not imply government/legal certification unless actually verified.

---

# 26. Subscription Model

WedHub uses a freemium vendor model.

Initial plans:

## FREE

Price:

`₹0/month`

Purpose:

Build marketplace supply.

Features:

- Vendor profile
- Basic portfolio
- Category listing
- Location listing
- Services
- Basic pricing
- Enquiries
- Reviews
- Basic analytics
- Basic notifications

Limits should be configurable.

Example limits:

- Portfolio images: configurable
- Videos: configurable
- Team members: configurable
- Analytics history: configurable

## PRO

Suggested starting price:

`₹5,999/month`

Purpose:

Vendors who want stronger visibility and business tools.

Features:

- Larger/unlimited portfolio allowance
- Priority placement
- Enhanced profile
- More prominent enquiry CTA
- Lead management
- Advanced analytics
- Availability
- Package management
- Faster notifications
- Better profile presentation
- Optional verified badge depending on verification status

## PREMIUM

Suggested starting price:

`₹12,999/month`

Purpose:

High-value vendors seeking maximum marketplace visibility.

Features:

- Everything in Pro
- Featured placement
- Category promotion
- City promotion
- Homepage exposure where available
- Priority promotional opportunities
- Advanced analytics
- Enhanced lead visibility
- Campaign opportunities
- Promotional profile sections

All prices and feature limits must be admin-configurable.

Never hardcode plan prices.

---

# 27. Subscription Principles

A vendor should be able to:

- Start free
- Upgrade
- Downgrade
- Cancel
- Renew
- Change billing cycle
- Apply coupon
- Start trial if offered
- View invoices
- View payment history

Subscription status:

`TRIALING`

`ACTIVE`

`PAST_DUE`

`PAUSED`

`CANCELLED`

`EXPIRED`

---

# 28. Subscription Scenarios

## Scenario A — Free vendor

Vendor registers.

Admin approves.

Vendor is on FREE.

Vendor receives profile visibility and can receive enquiries.

No payment is required.

## Scenario B — Vendor upgrades

Vendor has a free profile.

Vendor selects Pro.

System:

1. Displays plan.
2. Displays billing period.
3. Applies coupon if valid.
4. Creates payment/subscription intent.
5. Redirects/opens payment flow.
6. Payment provider confirms payment.
7. Webhook is verified.
8. Subscription becomes ACTIVE.
9. Feature entitlements are updated.
10. Invoice/transaction record is stored.
11. Vendor receives confirmation.

## Scenario C — Payment succeeds but browser closes

Do not rely on frontend success.

Payment provider sends webhook.

Webhook is verified.

System marks payment successful.

Subscription becomes ACTIVE.

Vendor sees active subscription on next dashboard load.

## Scenario D — Webhook arrives twice

The system detects the external event ID/idempotency key.

Second event is ignored safely.

No duplicate subscription or invoice is created.

## Scenario E — Payment fails

Subscription remains unpaid/past due according to provider rules.

Vendor receives notification.

Grace period can be configured.

After grace period, paid entitlements are removed.

Profile itself should not necessarily disappear; the vendor can fall back to FREE.

## Scenario F — Vendor cancels

Cancellation behavior must be configurable:

- Cancel immediately
- Cancel at period end

Recommended:

`cancel_at_period_end = true`

Vendor keeps paid benefits until the paid period ends.

## Scenario G — Downgrade

Vendor downgrades Pro to Free.

At the end of the billing period:

- Paid visibility ends
- Paid analytics may become restricted
- Portfolio over free limit is not immediately destroyed

Important:

Do not silently delete vendor media because a subscription expired.

Instead:

- Mark excess media as inactive/hidden
- Ask vendor to reduce portfolio
- Preserve data for a retention period

## Scenario H — Refund

Admin/payment system creates refund.

Original payment remains immutable.

Create separate refund record.

Subscription entitlement behavior depends on refund policy.

---

# 29. Billing Model

Use a payment abstraction.

Initial provider can be Razorpay for an India-first launch.

Architecture should allow future providers such as Stripe.

Payment entities:

- Payment
- Subscription
- Subscription Plan
- Invoice
- Transaction
- Refund
- Webhook Event
- Coupon

Payment webhooks must be:

- Signature verified
- Idempotent
- Logged
- Replay-safe

Never trust a frontend payment-success callback as the final source of truth.

---

# 30. Featured Listings

Featured listings are an additional monetization and discovery mechanism.

Admin can configure:

- Category
- City
- Placement
- Duration
- Vendor
- Start date
- End date
- Price

Example:

A Premium photographer buys:

`Featured — Toronto — Wedding Photographers`

for 30 days.

The system automatically activates placement during the campaign window and removes it afterward.

Featured listings must be clearly identifiable.

---

# 31. Future Pay-Per-Lead

Do not necessarily launch pay-per-lead immediately.

When sufficient demand exists, support:

`Qualified Lead → Billable Lead`

Potential pricing:

- Photographer: lower lead fee
- Makeup artist: lower/moderate
- Planner: moderate/high
- Venue: high
- Destination wedding: high

Lead prices must be configurable by:

- Category
- Location
- Vendor plan
- Lead type

Free and paid subscription models can coexist.

---

# 32. Lead Billing Scenarios

## Scenario A

Vendor receives a normal organic enquiry.

No pay-per-lead fee.

## Scenario B

Vendor has purchased a lead campaign.

Qualified lead is created.

System validates lead.

Lead becomes billable.

Vendor balance/subscription credit is charged.

## Scenario C

Lead is detected as spam.

Lead is marked SPAM.

No charge.

## Scenario D

Duplicate lead.

No second charge.

## Scenario E

Vendor disputes a lead.

Admin reviews.

Possible outcomes:

- Valid
- Invalid
- Duplicate
- Spam
- Refund credit

All decisions are audited.

---

# 33. Telegram Chatbot — MVP

Telegram is the initial conversational interface.

The architecture must not make Telegram part of the core business domain.

Create a messaging abstraction.

Example conceptual provider interface:

- sendMessage
- receiveMessage
- sendMedia
- createConversation
- closeConversation

Telegram is simply one provider.

Later:

`TelegramProvider`

`WhatsAppProvider`

`WebChatProvider`

---

# 34. Telegram User Journey

User discovers WedHub.

User starts Telegram bot.

Bot:

> Welcome to WedHub. What are you planning?

Options:

1. Find a vendor
2. Find a venue
3. Get vendor recommendations
4. Continue my enquiry
5. My saved requests

User selects:

`Find a vendor`

Bot:

> What service do you need?

Options:

- Photographer
- Videographer
- Makeup
- Venue
- Decor
- Planner
- Other

Bot:

> Where is your wedding?

User:

`Toronto`

Bot:

> When is your wedding?

User:

`June 20, 2027`

Bot:

> Approximate budget?

User:

`$4,000`

Bot:

> Would you like recommendations?

User:

`Yes`

System searches matching vendors.

Bot presents a concise shortlist.

User chooses a vendor.

Bot:

> Would you like to send an enquiry?

User confirms.

Lead is created.

Vendor is notified.

---

# 35. Telegram Conversation State

Conversation state must be persisted.

Example states:

`START`

`SELECTING_CATEGORY`

`SELECTING_LOCATION`

`COLLECTING_DATE`

`COLLECTING_BUDGET`

`COLLECTING_GUEST_COUNT`

`COLLECTING_CONTACT`

`MATCHING_VENDORS`

`SELECTING_VENDOR`

`CONFIRMING_ENQUIRY`

`COMPLETED`

Do not rely only on in-memory state.

---

# 36. Telegram Idempotency

Telegram may retry webhooks.

Every incoming message/event should have an external identifier.

Store processed event/message IDs.

If the same webhook arrives twice:

- Do not duplicate messages.
- Do not duplicate leads.
- Do not duplicate notifications.

---

# 37. WhatsApp — Future

WhatsApp should eventually provide:

- Natural-language vendor discovery
- Search
- Recommendations
- Enquiries
- Lead collection
- Vendor communication
- Reminders
- Follow-ups

The user should be able to say:

> "I need a photographer for a 200-person wedding in Toronto next June, budget around $5,000."

The system should extract:

- Category
- Location
- Date
- Guest count
- Budget

Then ask only for missing information.

This can later use an LLM, but deterministic flows should handle basic MVP conversations.

---

# 38. AI Wedding Assistant — Future

AI can eventually support:

- Natural language search
- Vendor recommendations
- Budget-aware matching
- Wedding planning assistance
- FAQ
- Lead qualification
- Conversation summaries
- Vendor response suggestions
- Personalized discovery

AI must not fabricate vendor availability, prices, reviews, or booking status.

When uncertain, the system should query authoritative platform data.

---

# 39. Admin Dashboard

Admin dashboard sections:

## Dashboard

- Total users
- Total vendors
- Active vendors
- Paid vendors
- Leads
- Enquiries
- Revenue
- MRR
- Conversion
- New registrations

## Vendors

- All vendors
- Pending approval
- Rejected
- Suspended
- Verified
- Featured

## Users

- All users
- Active
- Restricted
- Reported

## Categories

- Categories
- Subcategories
- Attributes
- Filters

## Locations

- Countries
- States
- Cities
- Areas

## Leads

- All leads
- New
- Qualified
- Won
- Lost
- Spam
- Disputes

## Subscriptions

- Plans
- Active subscriptions
- Failed payments
- Cancellations
- Coupons

## Payments

- Transactions
- Refunds
- Invoices
- Webhooks

## Reviews

- Pending moderation
- Reported
- Removed
- Disputed

## CMS

- Pages
- Blog
- Guides
- FAQs
- Banners
- Homepage

## Analytics

- Traffic
- Searches
- Vendor views
- Leads
- Revenue
- Conversion

## Settings

- Platform configuration
- Feature flags
- Notification settings
- Lead rules
- Subscription rules

---

# 40. Admin Vendor Creation Scenario

Admin opens:

`Create Vendor`

Selects:

Category:
`Wedding Photographer`

City:
`Toronto`

Adds:

Business name:
`Example Studios`

Adds:

Phone/email.

Admin can save as draft.

Vendor receives invitation.

Vendor claims account.

Vendor verifies ownership.

Vendor completes profile.

Admin reviews.

Admin approves.

Vendor becomes public.

---

# 41. Vendor Approval Rules

Vendor can only become publicly searchable when:

- Required fields are complete.
- Account requirements are met.
- Required verification is complete.
- Admin approval is granted where required.

Admin can reject with reason.

Vendor can edit and resubmit.

Approval history must be stored.

---

# 42. Content Moderation

Moderate:

- Vendor descriptions
- Portfolio media
- Reviews
- Blog comments if enabled
- User reports
- Business claims

Possible states:

`PENDING`

`APPROVED`

`REJECTED`

`HIDDEN`

`REMOVED`

Do not permanently destroy evidence needed for moderation/audit without policy justification.

---

# 43. CMS and Content

Admin can create:

- City guides
- Vendor guides
- Wedding planning articles
- Category pages
- FAQs
- Landing pages
- Promotional content

Example:

`Best Wedding Photographers in Toronto`

`Wedding Venues in Toronto`

`Indian Wedding Venues in Toronto`

`Wedding Makeup Artists in Toronto`

Content should link to relevant vendors and categories.

---

# 44. SEO Strategy

SEO pages should be generated systematically.

Primary page combinations:

`Category`

`City`

`Category + City`

Potential future combinations:

`Style + Category + City`

Avoid creating thin pages automatically.

Only index pages with useful content and meaningful vendor inventory.

Every indexable page needs:

- Unique title
- Meta description
- Canonical
- H1
- Useful introduction
- Vendor listings
- FAQs where relevant
- Breadcrumbs
- Structured data where valid

Sitemaps should be segmented if necessary.

---

# 45. Notifications

Notification events:

- Registration
- Verification
- Vendor approval
- Vendor rejection
- New lead
- New message
- Review received
- Subscription activated
- Payment failed
- Subscription expiring
- Featured campaign started
- Featured campaign ending

Users and vendors can control channel preferences where appropriate.

---

# 46. Analytics

Track events such as:

- Page view
- Search
- Filter
- Vendor impression
- Vendor click
- Vendor profile view
- Portfolio view
- Favorite
- Shortlist
- Enquiry started
- Enquiry completed
- Lead created
- Vendor response
- Subscription view
- Checkout started
- Payment completed
- Upgrade
- Cancellation

Vendor analytics:

- Impressions
- Profile views
- Enquiries
- Leads
- Response rate
- Response time
- Conversion

Platform analytics:

- User acquisition
- Vendor acquisition
- Search demand
- Lead volume
- Revenue
- MRR
- ARR
- Churn
- Conversion

High-volume event analytics should eventually be moved to a dedicated analytics system.

---

# 47. Database

Use **PostgreSQL only** as the source of truth.

Do not use MongoDB.

Core tables/modules:

- users
- user_profiles
- wedding_profiles
- vendors
- vendor_profiles
- vendor_categories
- categories
- category_attributes
- locations
- vendor_service_areas
- services
- vendor_services
- packages
- media
- albums
- reviews
- favorites
- shortlists
- shortlist_items
- enquiries
- leads
- conversations
- messages
- notification_preferences
- notifications
- subscription_plans
- subscriptions
- payments
- invoices
- refunds
- coupons
- featured_listings
- analytics_events
- pages
- blog_posts
- reports
- audit_logs
- admin_users
- roles
- permissions
- role_permissions
- feature_flags

Use relational integrity with:

- Foreign keys
- Unique constraints
- Check constraints
- Transactions
- Deliberate indexes

Use JSONB only for flexible attributes that genuinely benefit from it.

---

# 48. Redis

Redis is not a source-of-truth database.

Use Redis for:

- Cache
- Rate limiting
- Queue infrastructure
- Background job coordination
- Temporary conversational state where appropriate
- Distributed locks where necessary

Persistent business state belongs in PostgreSQL.

---

# 49. Background Jobs

Use Redis + BullMQ or equivalent.

Jobs:

- Image processing
- Media cleanup
- Email
- Notifications
- Lead routing
- Search indexing
- Sitemap generation
- Analytics aggregation
- Subscription reminders
- Telegram notifications
- Review moderation workflows

---

# 50. Security

Security requirements:

- Secure authentication
- Password hashing
- Refresh-token/session security
- HttpOnly cookies where appropriate
- CSRF protection where applicable
- Rate limiting
- Input validation
- Output sanitization
- XSS prevention
- CORS controls
- RBAC
- Permission checks
- Audit logging
- Secure file upload
- Signed media URLs where appropriate
- Webhook signature verification
- Idempotency
- Secret management

Never store:

- Plaintext passwords
- Payment secrets
- API secrets
- Access tokens in logs

---

# 51. Privacy

Users must have appropriate controls for:

- Account deletion
- Data export where required
- Marketing preferences
- Notification preferences
- Privacy settings

Vendor contact details should be exposed according to product/business rules.

Do not expose unnecessary personal information.

Lead contact information should only be visible to authorized recipients.

---

# 52. Abuse Prevention

Protect against:

- Fake vendor registrations
- Fake reviews
- Spam leads
- Automated scraping
- Duplicate enquiries
- Malicious media uploads
- Account takeover
- Payment fraud
- API abuse

Use:

- Rate limiting
- Verification
- CAPTCHA/risk checks where appropriate
- Moderation
- Duplicate detection
- Audit logs
- Security monitoring

---

# 53. Vendor Subscription Entitlements

Subscription features should be implemented as entitlements rather than scattered plan-name checks.

Bad:

`if plan === "premium"`

Better:

`can("featured_listing")`

`can("advanced_analytics")`

`limit("portfolio_items")`

This allows plans to change without rewriting business logic.

---

# 54. Free Plan Strategy

The free plan is important for marketplace liquidity.

Free vendors should still receive:

- Search presence
- Profile
- Basic enquiries
- Reviews
- Basic portfolio
- Basic analytics

Do not make free vendors useless.

The premium value should come from:

- Better visibility
- Better tools
- Better analytics
- Better promotion
- More exposure

---

# 55. Subscription Revenue Strategy

Potential revenue streams:

1. Pro subscriptions
2. Premium subscriptions
3. Featured listings
4. Category sponsorships
5. City sponsorships
6. Qualified lead fees
7. Promotional campaigns
8. Future booking commission
9. Vendor advertising
10. Brand partnerships

Do not activate all revenue streams at MVP.

Priority:

`Free supply → traffic → enquiries → paid visibility → subscriptions → lead monetization`

---

# 56. Example Vendor Revenue Scenario

Vendor:

Wedding Photographer

Free plan:

- Profile
- Portfolio
- Enquiries

After receiving meaningful traffic:

Vendor sees:

- 2,500 profile views
- 38 enquiries
- 14 qualified leads

WedHub offers:

`Pro — ₹5,999/month`

Vendor upgrades because the product has demonstrated business value.

---

# 57. Example Couple Scenario

Couple visits Google.

Searches:

`Wedding photographers Toronto`

Lands on WedHub.

Filters:

- Toronto
- Budget
- Rating
- Style

Views five vendors.

Favorites three.

Shortlists two.

Opens one.

Clicks:

`Get Quote`

Completes:

- Wedding date
- Location
- Budget
- Guest count
- Message

Lead created.

Vendor notified.

Couple receives acknowledgement.

Vendor responds.

Conversation continues.

Couple eventually books vendor outside or through a future WedHub booking system.

---

# 58. Example Multi-Vendor Scenario

Couple does not know which photographer to choose.

They select:

`Get recommendations`

WedHub asks:

- City
- Date
- Budget
- Style
- Guest count

Matching engine selects three vendors.

User explicitly agrees to share enquiry.

Three leads are created.

Each vendor receives the same request with proper source attribution.

System tracks:

- Which vendor responded
- Response time
- User engagement
- Conversion

---

# 59. Example Venue Scenario

User searches:

`Wedding venues Toronto`

Filters:

- 300 guests
- Indoor
- Parking
- Accommodation
- Budget

Results include vendors with:

- Capacity
- Starting price
- Location
- Amenities
- Photos
- Reviews
- Enquiry button

User shortlists four venues.

Sends enquiries to two.

Vendor responses appear in the user's enquiry area.

---

# 60. Example Admin Moderation Scenario

Vendor uploads 300 photos.

Automated media processing completes.

One image violates content rules.

Media is flagged.

Admin sees:

- Vendor
- Media
- Reason
- Upload date
- Related profile

Admin hides the image.

Audit log records:

- Admin ID
- Action
- Object
- Previous status
- New status
- Timestamp
- Reason

---

# 61. Example Payment Failure Scenario

Vendor's Pro subscription renews.

Payment fails.

System receives verified webhook.

Subscription:

`PAST_DUE`

Vendor receives notification.

Retry occurs according to payment provider rules.

If successful:

`ACTIVE`

If grace period expires:

`EXPIRED`

Vendor automatically falls back to FREE entitlements.

Historical invoices/payments remain available.

---

# 62. Example Vendor Suspension Scenario

Admin receives multiple valid complaints.

Admin changes vendor status:

`APPROVED → SUSPENDED`

Public profile becomes unavailable.

Vendor cannot receive new leads.

Existing historical records remain.

Admin records reason.

Vendor receives notification.

Admin can restore:

`SUSPENDED → APPROVED`

after resolution.

---

# 63. Scalability Requirements

Initial architecture should support:

- 10,000 daily visitors
- Thousands of vendors
- Millions of media objects
- Large portfolios
- High search traffic
- Large enquiry volumes

Application servers must be stateless.

Scaling path:

`1 API instance → multiple API instances`

`1 worker → multiple workers`

`PostgreSQL primary → read replicas when required`

`PostgreSQL search → dedicated search engine when required`

`R2 → CDN cached media`

---

# 64. Recommended Technical Architecture

## Frontend

Next.js + TypeScript

Responsibilities:

- Public pages
- SEO
- User dashboard
- Vendor dashboard
- Admin UI if desired separately

## Backend

Node.js + TypeScript

Modular monolith.

Modules:

- Auth
- Users
- Vendors
- Catalog
- Categories
- Locations
- Media
- Search
- Leads
- Enquiries
- Messaging
- Reviews
- Subscriptions
- Payments
- Notifications
- Analytics
- CMS
- Admin

## Database

PostgreSQL only.

## Cache/queues

Redis + BullMQ.

## Media

Cloudflare R2 + CDN.

## Search

PostgreSQL initially, dedicated search later.

## Messaging

Telegram adapter initially.

WhatsApp adapter later.

## Payments

Provider abstraction.

Razorpay initially if India-first.

Stripe or regional providers later.

---

# 65. Why Modular Monolith

Do not start with microservices.

A modular monolith is easier to:

- Develop
- Deploy
- Debug
- Test
- Operate
- Scale horizontally

Maintain strict module boundaries.

Potential future extraction:

- Search
- Media processing
- Notifications
- Messaging
- Analytics
- Payments

Only extract a module when actual scale or operational needs justify it.

---

# 66. Product MVP

MVP must include:

## Public

- Homepage
- Category browsing
- City browsing
- Search
- Filters
- Vendor profile
- Portfolio
- Reviews
- Enquiry

## User

- Registration/login
- Favorites
- Shortlists
- Enquiries
- Basic wedding profile

## Vendor

- Registration
- Admin invitation
- Profile
- Categories
- Services
- Packages
- Pricing
- Portfolio
- Leads
- Basic analytics

## Admin

- Vendor management
- Approval
- Categories
- Locations
- Users
- Leads
- Reviews
- Subscription plans
- Basic CMS

## Business

- Free plan
- Pro plan
- Premium plan
- Payment integration
- Featured listing foundation

## Messaging

- Telegram chatbot
- Enquiry creation
- Vendor notification

---

# 67. Post-MVP

After MVP validation:

- Advanced analytics
- Advanced search
- Better recommendations
- WhatsApp
- Vendor CRM
- Vendor team accounts
- Appointment scheduling
- Online booking
- Online payments for bookings
- AI assistant
- Natural-language search
- Automated lead qualification
- Advanced advertising
- Pay-per-lead
- Booking commissions
- Mobile apps

---

# 68. Critical Business Metrics

## Marketplace

- Active vendors
- Active users
- Vendor profile views
- Search volume
- Enquiry rate
- Lead rate
- Vendor response rate
- Lead-to-booking rate

## Revenue

- MRR
- ARR
- Average revenue per vendor
- Paid vendor percentage
- Conversion from free to paid
- Churn
- Expansion revenue
- Featured revenue
- Lead revenue

## Quality

- Spam lead rate
- Duplicate lead rate
- Average response time
- Review quality
- Vendor approval rate
- User satisfaction

---

# 69. North Star Metric

A strong north-star metric for WedHub should be:

> **Qualified wedding enquiries successfully connected to suitable vendors.**

Supporting metric:

> **Vendor-generated booking opportunities per active vendor.**

Revenue should follow marketplace value.

---

# 70. Product Roadmap

## Phase 1 — Foundation

- Architecture
- PostgreSQL schema
- Authentication
- RBAC
- Core infrastructure
- Admin foundation

## Phase 2 — Marketplace Supply

- Vendor registration
- Admin vendor creation
- Categories
- Locations
- Vendor profiles
- Media

## Phase 3 — User Discovery

- Search
- Filters
- Vendor pages
- Favorites
- Shortlists
- Reviews
- SEO

## Phase 4 — Lead Engine

- Enquiries
- Lead routing
- Lead scoring
- Notifications
- Vendor lead dashboard

## Phase 5 — Monetization

- Subscription plans
- Payments
- Billing
- Featured listings
- Coupons

## Phase 6 — Telegram

- Telegram bot
- Conversation state
- Vendor recommendations
- Enquiry flow

## Phase 7 — Growth

- CMS
- Blog
- City pages
- Analytics
- SEO expansion

## Phase 8 — Scale

- Redis
- Workers
- Search engine
- Read replicas
- CDN optimization
- Load testing

## Phase 9 — Advanced

- WhatsApp
- AI assistant
- Advanced recommendations
- Booking
- Pay-per-lead
- Vendor CRM

---

# 71. Definition of a Successful MVP

The MVP is successful when:

1. Vendors can register.
2. Admin can create vendors.
3. Admin can approve vendors.
4. Vendors can build profiles.
5. Vendors can upload optimized portfolios.
6. Users can discover vendors.
7. Users can search by category/location.
8. Users can shortlist vendors.
9. Users can submit enquiries.
10. Vendors receive leads.
11. Vendors can respond/manage leads.
12. Admin can moderate the marketplace.
13. Vendors can upgrade subscriptions.
14. Payments are reliably reconciled.
15. Telegram can collect structured enquiries.
16. SEO pages can generate organic traffic.
17. The platform can scale horizontally without architectural rewrites.

---

# 72. Non-Goals for MVP

Do not build initially:

- Full wedding event management
- Guest seating
- Invitation creation
- Complex wedding budgeting
- Full vendor booking settlement
- Escrow
- Native mobile apps
- Full WhatsApp implementation
- Complex AI assistant
- Microservices
- Dedicated data warehouse
- Full video streaming infrastructure

These can be added after marketplace validation.

---

# 73. Final Product Positioning

WedHub should be positioned as:

> **A trusted wedding marketplace where couples discover the right vendors and vendors grow their wedding business.**

The product is not merely a directory.

It combines:

`Discovery`

`Trust`

`Portfolio`

`Search`

`Shortlisting`

`Recommendations`

`Enquiries`

`Lead Management`

`Vendor Visibility`

`Subscriptions`

`Content`

`Conversational Discovery`

The long-term goal is to become the operating layer connecting wedding demand with wedding businesses.

---

# 74. Final Architectural Rule

The system must always preserve this separation:

**PostgreSQL**
→ business truth

**Redis**
→ cache, queues, temporary state

**Object storage**
→ media

**CDN**
→ media delivery

**Workers**
→ asynchronous processing

**Application**
→ business logic

**Search engine**
→ optional specialized discovery layer

**Messaging providers**
→ Telegram/WhatsApp adapters

**Payment providers**
→ external payment rails

No external provider should become the source of truth for WedHub's business state.

WedHub must own its users, vendors, leads, subscriptions, payments, reviews, conversations, and business rules.

