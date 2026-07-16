# Security and HIPAA Controls

For detailed threat analysis, see [threat-model.md](threat-model.md).

## PHI Audit Logging

- PHI access routes are instrumented with route-level audit middleware
- Logs are written after response completion so outcome reflects real HTTP status
- Audit records include actor, action, resource type, patient context, IP, user-agent, and success or failure outcome
- Persistence retries are built in for transient failures

## Encryption at Rest

- Sensitive secrets are encrypted with AES-256-GCM
- MFA secrets are fully encrypted at rest to protect authenticator seeds
- Refresh tokens are stored strictly as cryptographically secure hashes (never in plaintext)
- Current ciphertext format is versioned as v1 with HKDF-based key derivation
- Legacy encrypted values remain decryptable for backward compatibility

## Request and Runtime Protections

- Input validation with Zod on DTO-backed routes
- Security middleware including Helmet, CORS controls, and rate limiting
- Production startup validates critical secrets and rejects weak values

## Account Lockout Protection

- 5 failed login attempts trigger a 15-minute lockout
- Lockout is enforced even with the correct password during the lockout period
- Prevents brute-force and credential-stuffing attacks
- Aligned with NIST SP 800-63B authentication guidelines (Section 5.2.2 — rate limiting / lockout controls); the implementation covers the throttling and temporary lockout controls in that section but has not undergone a formal third-party assessment against the full SP 800-63B suite
- Automatic lockout expiration with clear user feedback
