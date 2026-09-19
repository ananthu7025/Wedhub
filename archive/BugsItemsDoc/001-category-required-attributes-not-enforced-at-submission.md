# Bug: Category-required attributes are not enforced when a vendor submits for review

**Found:** 2026-09-15, during vendor onboarding functional test pass
**Severity:** Medium — data-quality/product-integrity issue, not a security hole
**Status:** Open, not fixed

## Summary

Admins mark individual Category Attributes as "required" per category (`CategoryAttribute.isRequired`, e.g. Photography & Videography has 7 required attributes: Services Offered, Photography Style Specialty, Standard Delivery Time for Photos/Video, Deliverables Included, Team Size, Equipment & Backups — see `prisma/seed.ts`'s `CATEGORY_ATTRIBUTES`). The intent is clearly that a vendor cannot get approved without filling these in — `ProfileEditor.tsx`'s `handleSave()` (frontend) explicitly blocks saving if any are empty, with a comment saying this "mirrors the backend's setAttributeValues check."

In practice, this enforcement never reaches the actual submission gate:

- `vendor.service.ts`'s `setAttributeValues()` only validates required attributes **against whatever values are included in that specific `PUT /vendors/me/attributes` call**. If a vendor never calls this endpoint at all (skips the tab, or calls the API directly), this check never runs — there's nothing to validate.
- `vendor.service.ts`'s `submitForReview()` — the actual gate that decides whether a vendor can move from DRAFT/REJECTED to PENDING_VERIFICATION/PENDING_APPROVAL — only checks `vendor.completeness.ts`'s `REQUIRED_FOR_SUBMISSION_LABELS`, which is a fixed list of exactly 5 items: Business name, Full description, Primary category, Primary city, A contact method. Category attribute values are **not** in this list (see `vendor.completeness.ts` lines 45-51).

Net effect: a vendor can fill in business name, description, category, city, and a phone number, skip every category-specific "required" attribute entirely, and successfully submit — the backend will happily move them to `PENDING_APPROVAL` and an admin can approve them, all without ever seeing whether they actually offer the services/specs those required fields were meant to capture.

## How this was found

Live-verified against the test server (194.77.89.10, `wedhub_prod` DB):
- `POST /vendors/me/submit` for a vendor with primary category "Photography & Videography" (which has 7 required attributes) but **zero attribute values ever set**, plus business name + description + category + city + a contact method filled in, returned `200 OK` with `status: PENDING_VERIFICATION`.
- The `missing` array returned by an earlier incomplete-submission test (`{"missing":["Full description","Primary category","Primary city","A contact method"]}`) never lists any category attribute label, confirming they aren't part of the checked set at all.

## Where the fix likely belongs

`wedhub-backend/src/modules/vendors/vendor.completeness.ts`'s `missingRequiredForSubmission` (or `REQUIRED_FOR_SUBMISSION_LABELS`) needs to also check the vendor's primary category's required attributes against `vendor.attributeValues` — mirroring the per-call check already in `setAttributeValues()`, but evaluated against the vendor's *persisted* state at submit time, not just whatever was in the most recent PUT body. This is a backend logic fix; the frontend's existing client-side check in `ProfileEditor.tsx` can stay as an early-UX nicety once the backend is the actual source of truth.

Not fixed as part of this testing pass — flagging for a decision on priority/scope before touching `submitForReview`'s completeness logic, since it affects what "ready for approval" means platform-wide, not just onboarding.
