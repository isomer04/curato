# Production Deployment (AWS Lightsail)

For the release/rollback process, see [release-checklist.md](release-checklist.md).
For configuration values, see [configuration.md](configuration.md).

## Live Endpoint

- Current public endpoint: https://infinitesevens.com/
- Current state: publicly reachable HTTPS endpoint on a Lightsail static IP with Let's Encrypt TLS certificate.
- Static IP: 44.215.251.252 — DNS A record points `infinitesevens.com` to this IP.

## Deployed Stack

- AWS Lightsail Ubuntu instance
- Nginx serving Angular static files from `/var/www/healthcare`
- Backend API running in Docker via Compose
- Reverse proxy from Nginx `/api/` to backend `127.0.0.1:3000`
- Lightsail Managed MySQL (TLS-enabled)

## Runtime Topology

```text
Browser
  -> Nginx (public :80/:443)
       -> Angular static assets (/var/www/healthcare)
       -> /api/* reverse proxy to backend (127.0.0.1:3000)
            -> Lightsail Managed MySQL (TLS)
```

## Production Environment Notes

For production, use `backend/.env.docker` with production values.

- Set `NODE_ENV=production`
- Set `DB_HOST` to the Lightsail managed MySQL endpoint (not `db`)
- Set `FRONTEND_URL` to the exact browser origin with scheme, for example `https://infinitesevens.com`
- Use strong values (at least 32 chars) for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MFA_TOKEN_SECRET`, and `ENCRYPTION_KEY`

## Managed MySQL TLS Configuration

Production DB connections enforce TLS certificate validation. If startup fails
with `self-signed certificate in certificate chain`, add the AWS RDS CA bundle
and mount it into the API container.

Download CA bundle on VM and verify it before use:

```bash
mkdir -p /home/ubuntu/certs

# Download the PEM bundle and the PKCS#7 bundle (used for verification)
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  -o /home/ubuntu/certs/aws-rds-global-bundle.pem
curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.p7b \
  -o /home/ubuntu/certs/aws-rds-global-bundle.p7b

# Verify the PEM bundle against the PKCS#7 container.
# openssl pkcs7 extracts the certs embedded in the signed p7b and compares
# them to the downloaded PEM. A mismatch or empty result aborts the deploy.
EXPECTED=$(openssl pkcs7 -print_certs \
  -in /home/ubuntu/certs/aws-rds-global-bundle.p7b \
  -inform DER 2>/dev/null | sha256sum)
ACTUAL=$(cat /home/ubuntu/certs/aws-rds-global-bundle.pem | sha256sum)

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "ERROR: CA bundle verification failed — PEM does not match p7b. Aborting." >&2
  rm -f /home/ubuntu/certs/aws-rds-global-bundle.pem \
        /home/ubuntu/certs/aws-rds-global-bundle.p7b
  exit 1
fi

echo "CA bundle verified OK."
```

In `docker-compose.prod.yml` under the `api` service:

```yaml
environment:
  - NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-global-bundle.pem
volumes:
  - /home/ubuntu/certs/aws-rds-global-bundle.pem:/etc/ssl/certs/aws-rds-global-bundle.pem:ro
```

## Deploy or Restart Commands

```bash
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
docker compose -f docker-compose.prod.yml ps
```

Health checks:

```bash
curl -i http://127.0.0.1:3000/api/v1/health
curl -i http://127.0.0.1/api/v1/health
```

## Automated Deployment (GitHub Actions)

This repository includes an automated Lightsail deployment workflow at
`.github/workflows/deploy-lightsail.yml`.

Behavior:

- Trigger source: successful completion of CI workflow (`Healthcare Appointment System CI`)
- Branch policy: deploys only for `push` events on `main`
- Target server path: `/home/ubuntu/Healthcare-Appointment-System`
- Scope: backend container rebuild/restart, backend migrations, frontend build + sync to Nginx web root, Nginx reload, and post-deploy health checks

Required GitHub repository secrets:

- `LIGHTSAIL_HOST` (public IP or hostname)
- `LIGHTSAIL_USER` (for example `ubuntu`)
- `LIGHTSAIL_SSH_KEY` (private key content for the VM)
- Optional: `LIGHTSAIL_SSH_PORT` (defaults to `22`)

Notes:

- The workflow fails fast when required secrets are missing.
- Health checks are executed at the end of deployment:
  - `http://127.0.0.1:3000/api/v1/health`
  - `http://127.0.0.1/api/v1/health`
- Re-running a failed deployment is supported from the GitHub Actions UI once the root cause is fixed.

## Troubleshooting 502 Bad Gateway

If frontend actions return 502 from Nginx:

- Check container status: `docker compose -f docker-compose.prod.yml ps`
- Check backend logs in container file outputs:
  - `/app/logs/error.log`
  - `/app/logs/combined.log`
- Check Nginx errors: `/var/log/nginx/error.log`
- If you see `connect() failed (111: Connection refused)`, backend is not running
- If backend logs show `self-signed certificate in certificate chain`, apply the TLS CA bundle steps above

Note: Docker Compose may warn that `version` is obsolete. This warning does not
block deployment.
