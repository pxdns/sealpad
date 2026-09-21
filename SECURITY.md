# Security Policy

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: security@sealpad.app *(or open a private GitHub security advisory)*

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We aim to acknowledge reports within 48 hours and provide an initial assessment within 7 days.

## Scope

Security reports are especially valued for:

- **Cryptographic weaknesses** — anything that could expose plaintext to the server or an attacker
- **Key leakage** — session keys, message keys, or file keys reaching the server or a third party
- **Authentication bypass** — allowing access to another user's messages or files
- **Client-side injection** — XSS or script injection in webviews or rendered content
- **Expiring content bypass** — accessing messages or links past their expiry

## Out of scope

- Denial-of-service attacks
- Social engineering
- Physical access to a device
- Issues in upstream vscode that are not specific to Sealpad

## Known limitations

- **Metadata is not hidden.** The server can see who talks to whom, when, and approximate message/file sizes, even though it cannot see content.
- **Self-destruct is best-effort.** Expiring messages can be screenshotted or copied before deletion. We cannot prevent this.
- **Unverified identity.** Sealpad does not currently implement key verification (e.g., safety numbers). A future phase will add this.
