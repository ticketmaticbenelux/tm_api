# Security

This file tracks security vulnerability assessments for this project.

---

## CVE-2026-40175 — Axios Header Injection / Cloud Metadata Exfiltration

**Severity:** Critical (upstream)
**Package:** axios 1.7.3
**Assessed:** 2026-04-20
**Decision:** No immediate action — low actual risk in this context

### Aanvalsvector

De kwetsbaarheid vereist een twee-staps keten:

1. **Prototype pollution** via een third-party dependency (`qs`, `minimist`, `ini`, `body-parser`) die `Object.prototype` vergiftigt met kwaadaardige header properties.
2. Axios pikt gepollute properties op tijdens config-merge zonder CRLF-sanitization → header injection → request smuggling naar cloud metadata endpoint (`169.254.169.254`).

### Waarom laag risico in dit project

- **Geen kwetsbare dependencies:** `qs`, `minimist`, `ini` en `body-parser` komen niet voor in de directe of transient dependency tree.
- **Library, geen server:** `tm_api` verwerkt geen onbetrouwbare user input. Headers worden intern opgebouwd via HMAC (`getHeaders`), URLs via een whitelist in `tm3_api.json`.
- **Geen cloud metadata endpoint bereikbaar:** De code draait niet op AWS/GCP/Azure-instances met een toegankelijke IMDS.

### Aanbeveling

Upgrade bij de volgende reguliere dependency-update naar axios ≥ 1.15.0. Geen spoedactie vereist.

```bash
sfw npm install axios@latest
```
