# WedHub — Full Codebase Improvement Task

You have access to the complete WedHub repository.

Perform a **codebase-wide improvement pass** based on the existing implementation. Do not redesign the application unnecessarily. Preserve the current architecture and improve it incrementally.

The three primary objectives are:

1. **Architecture quality**
2. **Performance**
3. **Production reliability**

Do not blindly refactor everything. First understand the existing implementation, then make targeted changes.

---

# 1. IMAGE & MEDIA UPLOAD PERFORMANCE

This is currently one of the most noticeable user-facing performance problems.

Audit and improve every media upload flow, including:

* Vendor logo
* Vendor cover image
* Vendor portfolio
* Vendor gallery
* Wedding website gallery
* Wedding website cover/couple images
* Admin media uploads
* Any generic media uploader

## Required improvements

### Client-side optimization

Before uploading large photographic images:

* Resize excessively large images.
* Compress them in the browser.
* Preserve EXIF orientation.
* Avoid unnecessary upscaling.
* Preserve acceptable visual quality.
* Prefer WebP where appropriate.
* Keep a reasonable maximum dimension around 2400–2560px for portfolio/gallery images.

Do not use client-side compression as a security mechanism. Backend validation must remain.

### Upload architecture

Keep:

```text
Browser
 ↓
Presigned URL
 ↓
R2
 ↓
BullMQ
 ↓
Sharp
```

Do NOT move image uploads through the backend server.

### Do not wait for processing

The user should not have to wait for:

```text
PENDING
→ PROCESSING
→ READY
```

before seeing the uploaded image.

After successful R2 upload:

```text
UPLOAD SUCCESS
 ↓
show preview immediately
 ↓
background processing
```

Use `URL.createObjectURL()` or equivalent local preview where appropriate.

### Multiple uploads

Do not upload:

```text
image 1
wait
image 2
wait
image 3
```

Use controlled concurrency, approximately:

```text
3–4 simultaneous uploads
```

Do not use unlimited `Promise.all()` for large galleries.

### Upload progress

Show per-image status:

```text
Uploading 42%
Uploading 87%
Uploaded
Processing
Ready
Failed
```

One failed image must not block the entire gallery.

### Sharp worker

Audit the existing worker.

Avoid:

```text
download original
process variant
upload
download original again
process variant
upload
```

Download the source once where practical.

Generate large/medium/thumbnail variants efficiently and concurrently where memory usage allows.

Ensure processing is idempotent and retry-safe.

### Remove unnecessary polling

Find upload code that repeatedly waits for `READY`.

Do not make the initial upload UX depend on processing completion.

---

# 2. FRONTEND ARCHITECTURE

There are several very large Client Components.

Pay particular attention to:

```text
InvoiceEditor
InvoiceDetailView
WeddingWebsiteWizard
InvoicesBoard
ProfileEditor
DashboardInteractiveSections
Homepage
```

Do not rewrite them completely.

Refactor incrementally into:

```text
feature/
├── components/
├── hooks/
├── actions/
├── schemas/
├── utils/
├── types/
└── page.tsx
```

Separate:

```text
UI
state
API calls
business logic
validation
calculations
```

from each other.

Avoid allowing business logic to accumulate inside giant React components.

---

# 3. REDUCE UNNECESSARY "use client"

Audit all `"use client"` components.

Where a component does not require:

* browser APIs
* interactive state
* event handlers
* client-side hooks

convert it to a Server Component where practical.

Do not force Server Components where interactivity genuinely requires client-side execution.

The objective is:

```text
Server rendering
+
small interactive Client Components
```

rather than making large page trees client-rendered unnecessarily.

---

# 4. BACKEND ARCHITECTURE

Maintain the existing modular-monolith architecture.

Do NOT introduce microservices.

Prefer:

```text
Controller
   ↓
Service
   ↓
Repository
   ↓
Prisma
   ↓
PostgreSQL
```

Audit modules where services directly access Prisma.

Where practical, standardize the repository boundary.

However, do not introduce meaningless repositories simply for abstraction. Transaction orchestration can remain in services when justified.

---

# 5. DATABASE PERFORMANCE

Audit all high-traffic queries.

Pay special attention to:

* Vendor search
* Vendor lists
* Leads
* Enquiries
* Reviews
* Notifications
* Analytics
* Invoices
* Payments
* Audit logs
* Wedding websites
* Media

Look for:

```text
N+1 queries
unnecessary SELECTs
repeated queries
unnecessary COUNT(*)
missing indexes
large OFFSET pagination
unnecessary transactions
```

---

# 6. FIX ATTRIBUTE UPDATE N+1

The vendor attribute update flow currently performs repeated database operations for individual attributes.

Avoid:

```text
for each attribute:
    SELECT
    UPSERT
```

Instead:

```text
fetch required attributes in bulk
 ↓
validate in memory
 ↓
bulk/batched writes
```

Preserve validation and ownership checks.

---

# 7. SEARCH PERFORMANCE

Search is one of the most important performance-sensitive systems.

Keep the existing PostgreSQL search architecture unless benchmarking proves it insufficient.

Audit:

* trigram search
* similarity calculation
* category filtering
* city filtering
* service-area filtering
* dynamic attributes
* price filters
* verification
* sorting
* pagination
* `COUNT(*)`

Use PostgreSQL `EXPLAIN ANALYZE` where possible.

Do not introduce Elasticsearch/OpenSearch merely because it sounds more scalable.

First optimize PostgreSQL.

Benchmark with realistic datasets such as:

```text
10k vendors
50k vendors
100k vendors
500k vendors
```

Document query latency and identify the actual bottleneck.

---

# 8. REDUCE EXPENSIVE COUNT QUERIES

Audit endpoints that perform:

```text
fetch results
+
COUNT(*)
```

for every request.

For high-volume discovery/search endpoints, consider returning:

```text
hasNextPage
```

instead of an exact total where the UI does not require the total count.

Keep exact totals where they are genuinely needed.

---

# 9. PAGINATION

Continue using normal page pagination where it makes sense for user-facing search.

Introduce cursor pagination for high-volume internal/data streams such as:

```text
Analytics
Audit logs
Notifications
Leads
Invoices
Payments
```

Avoid large:

```sql
OFFSET 20000
```

operations.

---

# 10. PUBLIC DATA CACHING

Identify relatively static data that is repeatedly requested.

Candidates include:

```text
Categories
Locations
Featured categories
Popular searches
Featured vendors
Wedding stories
Homepage gallery
Blog homepage content
SEO metadata
```

Use appropriate Next.js caching/server caching and Redis where justified.

Do not add Redis caching to everything.

Cache data according to actual volatility.

---

# 11. HOMEPAGE PERFORMANCE

Audit the public homepage carefully.

The homepage currently contains many sections.

Ensure it does not create unnecessary independent database/API calls.

Where appropriate:

```text
parallelize independent requests
+
cache static/slow-changing data
+
server-render
+
lazy-load heavy sections
```

Do not block the entire homepage on optional content.

---

# 12. WEDDING WEBSITE PERFORMANCE

Audit wedding website rendering.

For galleries:

* Use thumbnails in grids.
* Use medium variants for normal viewing.
* Load large variants only for full-screen/detail viewing.
* Lazy-load images.
* Avoid eagerly loading hundreds of full-resolution images.
* Use responsive image sizes.
* Avoid unnecessary client-side rendering.

A wedding website with 200–500 photos should remain usable.

---

# 13. ANALYTICS PERFORMANCE

Audit:

```text
AnalyticsEvent
SearchLog
PageViewTracker
```

Do not allow analytics writes to interfere with transactional application requests.

Where appropriate:

```text
Browser
 ↓
analytics endpoint
 ↓
BullMQ
 ↓
worker
 ↓
batched database writes
```

Do not over-engineer this if current traffic does not justify it, but structure it so analytics can scale independently.

---

# 14. VENDOR PROFILE SAVE FLOW

Audit vendor profile saving.

Avoid unnecessary request fan-out such as:

```text
update city
validate media
update profile
recalculate completeness
...
```

Where logically related changes can be handled together, consolidate them into a backend service operation.

Prefer:

```text
PUT /vendors/me/profile
        ↓
single service operation
        ↓
transaction where appropriate
```

Do not sacrifice modularity or validation.

---

# 15. VENDOR PROFILE COMPLETENESS

Audit profile completeness recalculation.

Avoid repeatedly:

```text
update
 ↓
fetch vendor
 ↓
calculate
 ↓
update vendor
```

when the same information is already available.

Where appropriate:

```text
mutation
 ↓
calculate using current state
 ↓
single transaction/update
```

---

# 16. SECURITY & OWNERSHIP AUDIT

Perform a complete authorization audit.

Pay special attention to:

```text
vendors
leads
reviews
invoices
stores
wedding websites
media
subscriptions
payments
admin resources
```

Every `/me/*` or vendor-specific endpoint must verify ownership server-side.

Never trust:

```text
vendorId
userId
mediaId
invoiceId
weddingWebsiteId
```

from the client without resolving and validating ownership.

Do not weaken:

* authentication
* authorization
* rate limiting
* CORS
* Helmet
* CSP
* MIME validation
* file validation
* webhook signatures
* audit logging

---

# 17. PAYMENT RELIABILITY

Audit Razorpay/payment flows thoroughly.

Ensure webhook processing is:

```text
idempotent
transaction-safe
retry-safe
```

A webhook retry must not:

```text
create duplicate payment
create duplicate subscription
create duplicate invoice
apply coupon twice
activate subscription twice
```

Test important payment state transitions.

---

# 18. BACKEND TEST COVERAGE

The backend has significantly less automated coverage than the number of backend modules warrants.

Add integration/unit tests for critical domains:

```text
Authentication
Authorization
Vendor ownership
Vendor approval
Enquiries
Leads
Reviews
Subscriptions
Payments
Razorpay webhooks
Media
Wedding websites
Invoices
Stores
Admin authorization
```

Prioritize business-critical flows over trivial getter/setter tests.

---

# 19. ERROR HANDLING

Audit API and frontend error handling.

Ensure errors are:

```text
consistent
typed
actionable
safe
```

Do not leak:

* stack traces
* SQL errors
* internal paths
* secrets
* sensitive implementation details

to public clients.

Frontend should distinguish:

```text
network failure
validation error
authorization error
server error
upload failure
processing failure
```

---

# 20. MULTI-UPLOAD FAILURE RECOVERY

For image/media uploads:

If one image fails:

```text
retry only that image
```

Do not restart the complete batch.

Support:

```text
Retry
Remove
Continue
```

where appropriate.

---

# 21. DATABASE INDEX AUDIT

Review all high-frequency Prisma queries against actual indexes.

Ensure indexes exist for:

```text
foreign keys
status filters
createdAt sorting
vendor ownership
user ownership
search filters
subscription status
payment identifiers
media ownership
wedding website identifiers
lead status
review lookups
```

Do not create unnecessary indexes everywhere.

Every new index should have a query/use-case justification.

---

# 22. REDIS / BULLMQ AUDIT

Review all background jobs.

Ensure:

* retries are bounded
* failed jobs are observable
* duplicate jobs are handled
* jobs are idempotent
* concurrency is controlled
* large payloads are not unnecessarily stored in Redis
* long-running image processing does not exhaust worker memory

Separate heavy jobs logically where useful:

```text
media processing
analytics
notifications
emails
Telegram
```

---

# 23. FRONTEND API REQUEST AUDIT

Find:

* duplicate requests
* requests triggered unnecessarily by `useEffect`
* requests triggered on every render
* repeated requests caused by state changes
* sequential requests that can safely run in parallel

Use:

```text
Promise.all()
```

for genuinely independent operations.

Do not blindly parallelize dependent requests.

---

# 24. FRONTEND BUNDLE PERFORMANCE

Audit:

* large dependencies
* unnecessary client imports
* heavy libraries loaded globally
* unnecessary JavaScript sent to public pages
* editor libraries
* chart libraries
* PDF libraries
* image processing libraries

Use dynamic imports for genuinely heavy client-only functionality where appropriate.

Do not remove libraries simply to reduce package count.

---

# 25. CODE DUPLICATION

Find duplicated:

* API request logic
* media upload logic
* validation
* formatting
* pagination
* error handling
* permission checks
* image handling

Create shared utilities only when the duplication is genuinely common.

Do not create a giant `utils.ts` containing unrelated functions.

---

# 26. TYPE SAFETY

Audit TypeScript for:

```text
any
unsafe casts
duplicated types
incorrect nullable handling
API response mismatches
```

Prioritize areas involving:

```text
payments
media
authentication
vendor ownership
subscriptions
invoices
```

Do not perform a meaningless "remove every any" refactor.

Fix types that can cause actual runtime bugs.

---

# 27. OBSERVABILITY

Ensure important operations have enough logging/metrics to diagnose future production issues.

Track where appropriate:

```text
API latency
p95
p99
database query latency
queue latency
worker failures
image processing time
R2 upload time
payment failures
search latency
```

Do not log sensitive user information.

---

# 28. DO NOT OVER-ENGINEER

Do NOT:

* convert to microservices
* replace PostgreSQL
* replace Prisma
* replace R2
* replace BullMQ
* introduce Elasticsearch without evidence
* introduce Kubernetes
* introduce WebSockets unnecessarily
* rewrite the frontend framework
* rewrite the backend framework
* rewrite the entire codebase

WedHub should remain a **modular monolith** unless actual scale proves otherwise.

---

# 29. PRIORITY CLASSIFICATION

After the audit, classify every discovered issue:

## 🔴 CRITICAL

Issues that can cause:

* security vulnerabilities
* data leakage
* incorrect payments
* data corruption
* serious production failures
* severe user-facing performance problems

## 🟠 HIGH

Issues that significantly affect:

* scalability
* performance
* maintainability
* reliability
* important user workflows

## 🟡 MEDIUM

Issues that improve:

* code quality
* architecture
* developer experience
* moderate performance

## 🟢 NICE-TO-HAVE

Optional improvements that are useful but not urgent.

---

# 30. IMPLEMENTATION ORDER

Use this order unless the codebase reveals a stronger dependency:

```text
PHASE 1
Critical security/reliability issues
        ↓
PHASE 2
Image/media upload performance
        ↓
PHASE 3
Payment/webhook reliability
        ↓
PHASE 4
Backend N+1/database optimization
        ↓
PHASE 5
Search benchmarking and optimization
        ↓
PHASE 6
Public-page caching
        ↓
PHASE 7
Frontend architecture/refactoring
        ↓
PHASE 8
Analytics/background processing
        ↓
PHASE 9
Medium-priority cleanup
        ↓
PHASE 10
Nice-to-have improvements
```

---

# 31. IMPORTANT — DO NOT JUST REPORT

Do not only produce a list of recommendations.

For issues that are clearly actionable and safe:

**implement the fixes.**

For larger architectural changes:

1. explain the issue
2. explain the proposed solution
3. implement only if it can be done without breaking existing behavior

After implementation:

* run existing tests
* add/update tests where needed
* run TypeScript checks
* run linting
* build frontend
* build backend
* verify affected API contracts
* verify Prisma changes/migrations
* verify no existing feature was accidentally broken

---

# FINAL DELIVERABLE

At the end, provide a concise report containing:

## Architecture Audit

```text
Current architecture
Strengths
Weaknesses
Architectural risks
Recommended structure
```

## Performance Audit

For every important bottleneck:

```text
Issue
File/module
Why it is slow
Impact
Fix implemented/recommended
```

## Priority Roadmap

```text
CRITICAL
- ...

HIGH
- ...

MEDIUM
- ...

NICE-TO-HAVE
- ...
```

Also provide:

```text
Files changed
Tests added/updated
Database changes
API changes
Remaining risks
```

The objective is to make WedHub **faster, more reliable, easier to maintain, and ready to scale**, while preserving the existing product architecture and functionality.
s