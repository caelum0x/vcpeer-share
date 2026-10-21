# VCPeer Send — working notes

## Needs redeploy + live verification once box access returns (not done this pass)

Box `box` (130.61.180.42) was unreachable on port 22 this session (rate-limited /
another process mid-retry) per standing instructions — no SSH, no Docker, no
deploy was attempted. Everything below is code-only, committed to `main`, and
**not yet live** at `share.vcpeer.com`.

Whoever has box access next:
1. Redeploy per `deploy/RUNBOOK.md`'s "Current deployment" section (rsync →
   `docker build -t vcpeer-send:local .` → `docker compose up -d`), run as one
   foreground command over a persistent SSH session (background/disown gets
   killed by this box's sshd/PAM teardown — documented in the runbook).
2. Before deploying, confirm via `docker inspect vcpeer-send...` (image build
   timestamp) that the **currently running** container actually matches the
   latest committed fix, not an older image — there's prior history here (see
   memory: a DoS fix once sat un-deployed on the live container for a while
   before a later pass caught and redeployed it). Don't assume a past "fix
   committed" session also means "fix live".
3. After redeploy, manually verify the maxViews race fix (see below) against
   the live site: create a share with `maxViews: 1`, hit `POST
   /api/shares/:id/token` twice back-to-back (e.g. two parallel curl
   requests) and confirm only one succeeds instead of both.

## What shipped this pass (code only, needs the redeploy above)

1. **Fixed a real TOCTOU race in share `maxViews` enforcement**
   (`backend/src/share/share.service.ts`, `getShareToken`/`consumeView`).
   The old code read `share.views` once, checked
   `maxViews <= share.views`, then issued a *separate* `update` for
   `views + 1`. Two (or more) concurrent requests for the same share could
   all read the same pre-increment view count, all pass the check, and all
   increment afterward — so a share with `maxViews: 1` could let in more
   than one viewer if requests landed close together, defeating the whole
   point of the limit (this is the same bug *class* as the view-counting
   issue fixed in `c3dc3cc2`, just a race instead of a double-count). Fixed
   by folding the check into the increment's SQL `WHERE` clause via
   `prisma.share.updateMany({ where: { id, views: { lt: maxViews } }, data:
   { views: { increment: 1 } } })` — one atomic UPDATE statement, so at most
   `maxViews` requests can ever win the write no matter how many arrive at
   once. Added 3 new unit tests in `share.service.spec.ts` covering: the
   atomic update is used, the request is rejected when the atomic update's
   `count` is 0 (lost the race / limit already hit), and the maxViews-unset
   case still falls back to a plain unconditional increment.
   Also hardened `increaseViewCount` itself to use `{ increment: 1 }`
   instead of `share.views + 1` (same class of staleness, lower severity
   since it's only hit when no maxViews is set).

2. **Audited sibling DoS/resource-exhaustion patterns** per the standing
   incident history (the earlier un-deployed DoS fix). Checked:
   upload chunk size (capped server-side in `local.service.ts` against
   `share.maxSize`/quota/disk space before every chunk write — already
   solid), zip generation (`ShareService.createZip` already de-dupes
   concurrent builds per share via `activeZipBuilds`), and the global
   request body parser (raw-body middleware in `main.ts` already caps at
   `share.chunkSize`). No second unfixed instance of the exact
   "two requests race past the same check" class found elsewhere — the
   `maxViews` path above was the one live gap.

3. **Checked whether deleting/expiring a share invalidates already-issued
   download tokens** (the inverse of `066e0d08`'s session-revocation fix).
   Confirmed this is *not* a gap: `ShareSecurityGuard` and
   `FileSecurityGuard` both re-fetch the share row from the DB on every
   request and re-check `!share` (404 after delete) and expiration
   (`moment().isAfter(share.expiration)`, re-evaluated fresh every request,
   not trusted from the JWT) — a previously issued `share_<id>_token`
   cookie cannot be used to access a deleted or expired share. No fix
   needed here.

4. **Built a real `/wetransfer-alternative` SEO landing page**
   (`frontend/src/pages/wetransfer-alternative/index.tsx`), matching how
   the `vcpeer` core product already has one. Previously `share.vcpeer.com`
   only had a one-line WeTransfer-alternative meta description on the
   homepage (`47632591`) — thin compared to core's dedicated page. New page
   has: a hero targeting "WeTransfer alternative" search intent, a real
   feature-comparison table (account requirement, size limit, link expiry,
   password protection, data ownership, source code — vs. WeTransfer's free
   plan), a 4-question FAQ, and outbound cross-links to VCPeer Live and the
   booking page (same pattern as the Send footer's existing cross-links).
   Added it to `robots.txt` (`Allow`) and `sitemap.xml` (priority 0.8,
   monthly), and linked to it from the homepage for internal linking. Copy
   lives in `frontend/src/i18n/translations/en-US.ts` only for now (new
   keys picked up by the existing Crowdin pipeline over time, same pattern
   as every other new-copy commit in this repo).

## Verified before committing

- Backend: `npx jest` — 37/37 passing (was 34/34 before this pass's 3 new
  tests). `npx eslint src/share/share.service.ts src/share/share.service.spec.ts`
  — 0 errors (pre-existing `no-explicit-any` warnings only, consistent with
  the rest of the file).
- Frontend: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build`
  succeeds and `/wetransfer-alternative` compiles as a normal SSR route
  (4.08 kB, 742 kB first load — in line with other pages).

## Did not touch

- No SSH, no `docker`, no box access, no deploy attempt.
- No CI/CD or GitHub Actions.
- No other repo (vcpeer, vcpeer-book, vcpeer-live untouched).
- No amended commits, no force-push — all new commits on `main`.
