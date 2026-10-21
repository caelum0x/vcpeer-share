# VCPeer Send — deploy runbook

**Status: LIVE at `share.vcpeer.com`** (deployed 2026-10-15, redeployed
2026-10-21 for bug fixes — see "Current deployment" below). The sections
below describing a future first-time deploy are kept for disaster-recovery
(rebuilding on a fresh box from scratch), but the "Target box" section's
original choice (`89.168.106.142`) was corrected before that first deploy —
see "Current deployment" for where this actually runs.

Follows the same shape as `/Users/arhansubasi/products/vcpeer/deploy/README.md`
(the MiroTalk-fork runbook) for consistency across the two VCPeer products.

## What this is

VCPeer Send = the "Send a link" product in the VCPeer suite. It is an adopted
fork of **Pingvin Share X** (`smp46/pingvin-share-x`, BSD-2-Clause, active fork
of the now-archived original Pingvin Share) — not hand-written code. See
`README.md` and `NOTICE.md` for upstream credit, and
`/Users/arhansubasi/products/plans/vcpeer.md` → "Send a link = adopted OSS
(2026-10-15)" for why it was picked over Erugo / psitransfer / timvisee/send /
Gokapi.

It runs as a single prebuilt multi-arch Docker image
(`ghcr.io/smp46/pingvin-share-x:v2.0.0`, `linux/amd64` + `linux/arm64`) — no
build step on the box, just pull and run.

## Current deployment (actual, as of 2026-10-21)

Runs on Oracle box **`box` (130.61.180.42)**, not the `89.168.106.142` micro
instance named in the original plan below (that box only has 956MB RAM —
too tight; see `plans/vcpeer.md` "Send a link = adopted OSS" for the
2026-10-14 correction to use `box` instead). `ssh box` (alias already in
`~/.ssh/config`).

- Source lives at `/srv/src/vcpeer-share` on the box (plain rsync'd
  checkout, not a git clone — redeploy by rsyncing this repo's working tree
  there, excluding `.git`/`node_modules`, then rebuilding).
- Image is **built locally on the box from this repo's own `Dockerfile`**
  (tagged `vcpeer-send:local`), not the upstream prebuilt
  `ghcr.io/smp46/pingvin-share-x` image referenced in the "Steps" section
  below — the rebrand (logo, copy, email templates) only exists in our fork,
  not upstream's image.
- Compose file + `config.yaml` live at `/opt/infra-box/stacks/vcpeer-share/`
  on the box (separate from the source checkout). To redeploy after a code
  change:
  ```
  rsync -az --delete --exclude .git --exclude node_modules \
    ./ box:/srv/src/vcpeer-share/
  ssh box "cd /srv/src/vcpeer-share && docker build -t vcpeer-send:local ."
  ssh box "cd /opt/infra-box/stacks/vcpeer-share && docker compose up -d"
  ```
  The build takes several minutes on this box (shared Ampere core) — run it
  as a single foreground command over one persistent SSH connection rather
  than trying to background+disown it; this box's sshd/PAM session teardown
  kills orphaned background jobs even under `setsid`/`nohup`/`disown`.
- Fronted by the box's existing reverse proxy at `share.vcpeer.com` (DNS
  already live, Cloudflare).
- Before any deploy that touches data (none of the fixes above did):
  `docker run --rm -v vcpeer-send_vcpeer-send-data:/data -v /opt/infra-box/stacks/vcpeer-share:/backup alpine tar czf /backup/vcpeer-send-data-backup-$(date +%Y%m%d%H%M%S).tgz -C /data .`
  Rollback = `docker compose up -d` after `docker build` from a previous git
  commit, or `docker tag <previous-image-id> vcpeer-send:local && docker
  compose up -d` if an older image is still present locally (`docker images
  vcpeer-send`).

## Target box and a real gap to close first (original plan, superseded above)

Owner-specified target: **Oracle E2.1.Micro, `89.168.106.142`**, same box as
the VCPeer (MiroTalk) product, per `vcpeer/deploy/README.md` conventions:
`ssh ubuntu@89.168.106.142 -i ~/.ssh/vcpeer_newbox_ed25519`.

That box, as documented in the VCPeer runbook, has **956MB RAM (~400MB free),
no Docker installed, Node 20 running the MiroTalk fork directly via pm2**.
VCPeer Send needs Docker (upstream only ships/supports a Docker image) and a
Node 24 Alpine multi-process container (Caddy + Next.js frontend + Nest
backend) that's noticeably heavier than a bare pm2 process. 400MB free is too
tight to assume this "just works" — treat the two prerequisites below as part
of this runbook, not optional:

1. **Install Docker + the compose plugin** (not present on this box today):
   ```
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu
   sudo apt-get install -y docker-compose-plugin   # if get.docker.com didn't pull it in
   ```
2. **Add swap** — 956MB physical RAM is not enough headroom for a Node 24
   multi-process container next to the existing MiroTalk pm2 process. Add at
   least 2GB of swap before starting the container:
   ```
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
   If the container still OOMs or the box becomes unresponsive under load even
   with swap, the honest fallback is to run VCPeer Send on one of the other
   three free Oracle boxes instead (e.g. `recoder.xyz` / `92.5.156.133`, which
   already runs Docker workloads) and point `share.vcpeer.com` DNS there
   instead of `89.168.106.142`. Note that as a decision point for whoever runs
   this, not a blocker — default to trying `89.168.106.142` first since that's
   what was specified, fall back to the other box only if it doesn't fit.

## Why a subdomain, not a subpath

Owner's instruction allowed either `share.vcpeer.com` or `vcpeer.com/send`
("subpath only if the app supports it cleanly"). Pingvin Share X's frontend is
a Next.js app with `manifest.json` `scope`/`start_url` hardcoded to `/`, its
own `API_URL` base assumption, and its own bundled Caddy doing path-based
frontend/backend routing inside the container — reverse-proxying it cleanly
under a subpath of the existing VCPeer (MiroTalk) Express app on the same box
would mean rewriting asset paths and API base URLs throughout a codebase we
deliberately chose *not* to hand-modify beyond branding. A subdomain needs
zero path-rewriting: **chosen: `share.vcpeer.com`**.

`vcpeer.com/send` (the hand-written branch `feat/vcpeer-share-suite-2026-10-14`
in the `vcpeer` repo, see below) becomes a simple page that links out to
`https://share.vcpeer.com` with a "Send a link" CTA, rather than a reverse
proxy.

## Steps

1. **Prerequisites** — Docker + swap on the box, see above.

2. **DNS** (owner-only step, not done in this session): add an `A`/`CNAME` for
   `share.vcpeer.com` → `89.168.106.142` (or the fallback box's IP), same
   provider/zone as the rest of `vcpeer.com`.

3. **Clone and configure on the box:**
   ```
   git clone https://github.com/caelum0x/vcpeer-share.git   # once pushed; see "Repo" below
   cd vcpeer-share/deploy
   cp ../.env.example .env
   # config.yaml is already here (committed) — edit the REPLACE_* placeholders:
   #   smtp.username / smtp.password  — real Scribase Mail SMTP creds (mail.scribase.com)
   #   initUser.email / initUser.password — real owner email + `openssl rand -base64 24`
   #   s3.* — only if switching to Cloudflare R2 instead of local disk (leave s3.enabled: "false" otherwise)
   vi config.yaml
   vi .env
   ```

4. **Start the container:**
   ```
   docker compose up -d
   docker compose logs -f vcpeer-send   # confirm clean startup, Prisma migration, seed
   curl -fs http://127.0.0.1:3010/api/health   # should return 200 from the box itself
   ```

5. **Caddy:** add a new site block to the box's existing Caddyfile (append,
   don't replace — same file that already serves `vcpeer.com`):
   ```
   share.vcpeer.com {
       reverse_proxy 127.0.0.1:3010
   }
   ```
   ```
   caddy validate
   caddy reload
   ```
   (If Cloudflare Tunnel is used instead of direct Caddy+DNS, add a tunnel
   ingress rule for `share.vcpeer.com` → `http://127.0.0.1:3010` instead of the
   Caddyfile block — whichever the box already uses for `vcpeer.com`.)

6. **First-login admin setup:**
   - Visit `https://share.vcpeer.com/admin`, log in with the `initUser`
     credentials from `config.yaml`.
   - Change the admin password immediately (the config-set password is not
     rotated by the app itself).
   - Since `config.yaml` is mounted read-only and sets most settings, most of
     `/admin/config` will show as locked (this is expected — see
     `docs/docs/setup/configuration.md`: YAML-set keys can't be changed in the
     UI). To change a setting permanently, edit `deploy/config.yaml` and
     `docker compose restart vcpeer-send`.

7. **Smoke test from outside** (or write a `deploy/smoke-test.sh` mirroring
   `vcpeer/deploy/smoke-test.sh`):
   - `curl -I https://share.vcpeer.com` → 200
   - Upload 2 files anonymously (no login — `allowUnauthenticatedShares: true`
     in `config.yaml`), get a share link, open it in a private/incognito
     window, download the zip, confirm contents match.
   - Create a share with an email recipient, confirm the recipient email
     arrives via Scribase Mail SMTP (check the recipient inbox, or Scribase
     Mail Studio's send log at `mail.scribase.com`) and that it carries the
     "Sent with VCPeer — send your own" line and no Pingvin Share branding.
   - Download the shared file as the recipient, confirm the share creator gets
     the "Your file was downloaded" notification email
     (`enableShareDownloadNotifications: true`).
   - `vcpeer.com/send` page link correctly lands on `share.vcpeer.com`.
   - Footer on every page reads "Sent with VCPeer — send your own" linking to
     `vcpeer.com` / `vcpeer.com/send`, not `github.com/smp46/pingvin-share-x`.
   - If a Railyard Insights snippet already exists on other VCPeer pages
     (per `menivor-is-distribution-engine` / Railyard Insights memory notes),
     add the same tag to `config.yaml` → `appearance.customCss` is CSS-only, so
     the tracking `<script>` tag instead needs to go in `frontend/src/pages/_document.tsx`
     or `frontend/src/components/Meta.tsx` (whichever upstream uses for
     site-wide `<head>` injection) as a small source patch on top of this fork
     — not done in this build session, flagged here as the one piece of actual
     app-code (not just config) still needed before this fully matches the
     "add Railyard Insights tag" instruction.

## Rollback

```
cd vcpeer-share/deploy
docker compose down
```
Remove the `share.vcpeer.com` Caddy block (or tunnel ingress rule) and
`caddy reload`. No DNS change needed to roll back if you leave the A record in
place pointing nowhere useful short-term, or remove it if you want
`share.vcpeer.com` to stop resolving entirely. Data (`vcpeer-send-data` /
`vcpeer-send-images` Docker volumes) is preserved unless you also run
`docker compose down -v` — only do that if the rollback is permanent, since it
deletes every uploaded share's files and the SQLite database.

## Upstream-sync procedure

`upstream` remote (`smp46/pingvin-share-x`) is kept. To pull a new release:
```
git fetch upstream
git log upstream/main --oneline -10   # check what's new, read CHANGELOG.md
git merge upstream/main
```
After merging, re-check for reintroduced "Pingvin Share" / "smp46" / 🐧
strings (the same places patched in this fork: `Footer.tsx`,
`defaultConfig.util.ts`, `admin/intro.tsx`, `config.seed.ts`, `manifest.json`,
`backend/src/main.ts` Swagger title, `frontend/public/img/logo*.png` +
`favicon.ico` + `icons/*`) — a `grep -rn "Pingvin\|smp46" --include="*.ts" --include="*.tsx" --include="*.json"`
across `frontend/src` and `backend/src` (excluding `i18n/translations`, which
upstream owns) is the fast check. Then bump the pinned image tag in
`deploy/docker-compose.yml` to match the new release and redeploy via steps
4-7 above.

## Repo

Pushed to **`caelum0x/vcpeer-share`** (private). All rebrand + deploy-artifact
work is merged to `main` (fast-forward from `vcpeer-2026-10-15`, which is also
pushed and kept as a reference branch, not deleted). `upstream` remote stays
`smp46/pingvin-share-x` as the sync source — see "Upstream-sync procedure"
below. The box should `git clone https://github.com/caelum0x/vcpeer-share.git`
and check out `main` directly; no branch switch needed.

Checked before pushing: none of this repo's GitHub Actions workflows trigger
on push to `main` in a way that deploys anywhere. `docker-build-push.yml`
(the only one that publishes images) only runs on `release: published` or
manual `workflow_dispatch`, not on push. `docker-security.yml` runs a local
Trivy scan on push to `main` but only builds the image with `load: true`
(no registry push, no deploy). Pushing `main` is therefore safe and does not
touch production.

## Owner-only (still open as of 2026-10-21)

Everything in the original list below this line was resolved by the
2026-10-15 deploy + the 2026-10-21 bug-fix redeploy **except**:

- If/when Cloudflare R2 is wanted instead of local disk: create the R2
  bucket + API token, fill `deploy/config.yaml` → `s3.*` and flip
  `s3.enabled: "true"` (still on local disk today, by choice, not a gap).
- Railyard Insights site key `ry_site_vcpeer_send_80cdc14ff6bc` (shipped in
  `frontend/src/pages/_document.tsx` 2026-10-21) only starts actually
  counting once it's registered server-side in the `railyard` repo (a D1
  `signups` row + `SITES` KV `site:<key>` entry, mirroring `createSite` in
  `railyard/apps/insights-edge/src/selfserve.mjs`) and that Worker is
  redeployed — a production write in a *different* repo, out of scope for
  this pass. Also add `share.vcpeer.com` to
  `railyard/apps/insights-edge/docs/FIRST-PARTY-SITES.md`'s table and (as the
  belt-and-suspenders fallback) `inject/wrangler.jsonc`'s `SITE_KEYS`, same
  pattern as yokharita.com/oxhanatelier.com.
- Resolved and no longer blockers (kept here only as a historical note):
  DNS for `share.vcpeer.com` (live), Scribase Mail SMTP creds (configured,
  confirmed delivering), real admin password (set), Docker on the deploy box
  (box `130.61.180.42` always had it — the swap/Docker-install problem below
  was specific to the originally-named `89.168.106.142`, which was never
  used).
