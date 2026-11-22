# Security Specification — Smile Masters & Jaw Joint Matters CMS

## Data Invariants
1. **Default Deny**: Any unmatched path in Firestore is denied for both reads and writes.
2. **Admin Authorization (`isAdmin()`)**:
   - Verified Firebase Auth token (`request.auth != null`) AND either:
     - Bootstrapped primary admin email (`request.auth.token.email == "arhandanawala@gmail.com" && request.auth.token.email_verified == true`), OR
     - Existence of `/admins/$(request.auth.uid)` with `role in ['admin', 'super_admin']`.
3. **Public Content Isolation**:
   - `siteContent/main` is publicly readable (`docId == 'main'`), writable only by verified admins.
   - `doctors`, `treatments`, and `testimonials` allow public `read` ONLY when `resource.data.published == true`; unpublished drafts are readable only by admins.
4. **PII Isolation (`leads` & `appointments`)**:
   - Public visitors may `create` a lead or appointment request, strictly enforcing:
     - Exact allowed key set (`hasAll` + `hasOnly`).
     - Initial status locked (`leads.status == 'New'`, `appointments.status == 'Pending'`).
     - Internal `notes == ''` on creation.
     - `createdAt == request.time` and `updatedAt == request.time`.
     - Strict type and `.size()` upper bounds on every string field to prevent storage bloat.
   - Public visitors may NEVER `read`, `list`, `update`, or `delete` any `leads` or `appointments` document.
   - Verified admins may `read`, `update` (preserving immutable `createdAt`), and `delete` leads and appointments.
5. **Privilege Escalation Prevention (`admins`)**:
   - Unauthenticated users cannot read or write `/admins`.
   - Non-admin signed-in users may only `get` their own `/admins/$(request.auth.uid)` record to verify access; they can never `list`, `create`, `update`, or `delete` `/admins`.
   - Only verified admins may add or modify `/admins/{uid}` documents with strict schema validation.

## Dirty Dozen Adversarial Payloads
1. Unauthenticated `get` / `list` on `/leads` -> DENIED.
2. Unauthenticated `get` / `list` on `/appointments` -> DENIED.
3. Unauthenticated `create` on `/leads` with `status: "Converted"` or non-empty `notes` -> DENIED.
4. Unauthenticated `create` on `/appointments` with `status: "Confirmed"` -> DENIED.
5. Unauthenticated `create` on `/leads` with 100KB `message` payload or extra injected field `isAdmin: true` -> DENIED.
6. Unauthenticated `read` on unpublished `/doctors/{id}` (`published: false`) -> DENIED.
7. Non-admin authenticated user creating `/admins/$(request.auth.uid)` with `role: "super_admin"` -> DENIED.
8. Non-admin authenticated user updating `/siteContent/main` -> DENIED.
9. Admin updating `/leads/{id}` and mutating `createdAt` -> DENIED.
10. Unauthenticated user writing to arbitrary path `/siteContent/injected` -> DENIED.
11. Unauthenticated `create` on `/leads` with forged past `createdAt` timestamp (`!= request.time`) -> DENIED.
12. Unauthenticated `delete` on `/doctors/{id}` or `/treatments/{id}` -> DENIED.
