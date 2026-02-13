# System Design & Tradeoffs

## Architecture Choice

Used Helm + namespace-per-store pattern for strong isolation and easy cleanup.

Namespace-level isolation simplifies:
- Resource limits
- Security boundaries
- Cleanup guarantees

---

## Idempotency

Used:

```
helm upgrade --install
```

Ensures:
- Safe retries
- No duplicate releases
- Recoverable provisioning

---

## Failure Handling

If provisioning does not become ready:
- Mark store as Failed
- Automatically uninstall Helm release

Ensures no zombie resources.

---

## Cleanup Guarantees

Deleting store:
- Helm uninstall
- Namespace deletion
- Removes PVCs, pods, ingress, secrets

---

## Production Differences

| Local | VPS |
|-------|-----|
| kind cluster | k3s |
| *.localhost | real domain |
| no TLS | TLS via cert-manager |
| default storage | cloud storage class |

---

## Scaling Plan

Provisioning can be improved by:
- Using Redis queue
- Limiting concurrent Helm installs
- Adding HPA to platform API
- Adding DB to persist store metadata
