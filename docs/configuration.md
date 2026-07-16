# Configuration

Use [backend/.env.example](../backend/.env.example) for local development and
[backend/.env.docker.example](../backend/.env.docker.example) for containerized
setup.

## Core Variables

| Variable     | Description              | Default               | Required in Production |
| ------------ | ------------------------ | --------------------- | ---------------------- |
| NODE_ENV     | App runtime environment  | development           | Yes                    |
| PORT         | API port                 | 3000                  | Yes                    |
| API_VERSION  | API base version segment | v1                    | Yes                    |
| FRONTEND_URL | Allowed CORS origin      | http://localhost:4200 | Yes                    |
| LOG_LEVEL    | Logger verbosity         | debug                 | Yes                    |

`FRONTEND_URL` must be an exact origin and include the protocol (`http://` or
`https://`) with no path or trailing slash.

## Database

| Variable       | Description                       | Default                | Required in Production |
| -------------- | --------------------------------- | ---------------------- | ---------------------- |
| DB_DIALECT     | Database dialect                  | mysql                  | Yes                    |
| DB_HOST        | Database host                     | localhost              | Yes                    |
| DB_PORT        | Database port                     | 3306                   | Yes                    |
| DB_NAME        | Database name                     | healthcare_db          | Yes                    |
| DB_USER        | Database user                     | root                   | Yes                    |
| DB_PASSWORD    | Database password                 | empty in code fallback | Yes                    |
| DB_SSL_CA_PATH | Path to TLS CA bundle (e.g., RDS) | empty                  | No                     |

## Authentication and Secrets

| Variable               | Description                               | Default                         | Required in Production |
| ---------------------- | ----------------------------------------- | ------------------------------- | ---------------------- |
| JWT_SECRET             | Access token signing secret               | dev fallback outside production | Yes                    |
| JWT_EXPIRES_IN         | Access token duration                     | 15m                             | Yes                    |
| JWT_REFRESH_SECRET     | Refresh token signing secret              | dev fallback outside production | Yes                    |
| JWT_REFRESH_EXPIRES_IN | Refresh token duration                    | 7d                              | Yes                    |
| MFA_TOKEN_SECRET       | MFA/session token secret                  | dev fallback outside production | Yes                    |
| ENCRYPTION_KEY         | Encryption key for sensitive at-rest data | dev fallback outside production | Yes                    |

## Rate Limiting

| Variable                | Description            | Default | Required in Production |
| ----------------------- | ---------------------- | ------- | ---------------------- |
| RATE_LIMIT_WINDOW_MS    | Rate limit time window | 900000  | Yes                    |
| RATE_LIMIT_MAX_REQUESTS | Max requests in window | 500     | Yes                    |

## Redis (Future Expansion)

| Variable       | Description           | Default   | Required in Production |
| -------------- | --------------------- | --------- | ---------------------- |
| REDIS_ENABLED  | Use Redis for caching | false     | No                     |
| REDIS_HOST     | Redis host address    | localhost | No                     |
| REDIS_PORT     | Redis port number     | 6379      | No                     |
| REDIS_PASSWORD | Redis password        | empty     | No                     |

## Email (SendGrid)

| Variable         | Description                     | Default | Required in Production |
| ---------------- | ------------------------------- | ------- | ---------------------- |
| SENDGRID_API_KEY | SendGrid Web API key (`SG.xxx`) | empty   | Yes                    |
| EMAIL_FROM       | Verified sender email address   | empty   | Yes                    |

Email is sent via the SendGrid Web API (`@sendgrid/mail`). No SMTP credentials
are required. The sender address set in `EMAIL_FROM` must be verified in the
SendGrid dashboard under Settings → Sender Authentication before emails will be
delivered.

## Generating Strong Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Production startup validates critical variables and enforces minimum secret
strength.
