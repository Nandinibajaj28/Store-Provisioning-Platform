# 🏪 Multi-Tenant Store Provisioning Platform

A Kubernetes-based platform that provisions isolated WooCommerce stores on-demand using Helm.

Each store runs in its own namespace with full isolation, quotas, and guardrails.


# 🚀 Features

- On-demand WordPress + WooCommerce provisioning
- Namespace-level isolation per store
- ResourceQuota + LimitRange guardrails
- Helm-based deployment (local & VPS)
- Ingress-based domain routing
- Rate limiting & abuse protection
- Automatic cleanup on failure
- Idempotent provisioning (`helm upgrade --install`)
- Dashboard for managing stores


# 🏗 Architecture Overview

User → Dashboard (React) → Platform API (Express) → Helm → Kubernetes → Store Namespace

Each store gets:
- Dedicated namespace
- WordPress pod
- MariaDB pod
- PVCs
- Ingress
- ResourceQuota
- LimitRange
- Secret

# 🖥 Local Setup (Kind)

## 1️⃣ Install Dependencies

- Docker
- Node.js
- kubectl
- Helm
- Kind

## 2️⃣ Create Kind Cluster

```bash
kind create cluster
```

---

## 3️⃣ Install NGINX Ingress

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

Wait until the ingress controller is running.


## 4️⃣ Update Hosts File

Add:

```
127.0.0.1 *.localhost
```

## 5️⃣ Start Backend

```bash
cd platform-api
npm install
node index.js
```

Runs at:
```
http://localhost:4000
```

## 6️⃣ Start Dashboard

```bash
cd dashboard
npm install
npm start
```

Runs at:
```
http://localhost:3000
```
# 🏪 Create a Store

Via Dashboard  
OR

```bash
POST http://localhost:4000/stores
{
  "name": "store1",
  "type": "woocommerce"
}
```

Then open:

```
http://store-store1.localhost
```

# 🛒 Place Order

1. Complete WooCommerce setup
2. Add product
3. Add to cart
4. Checkout

# 🗑 Delete Store

Via Dashboard  
OR

```bash
DELETE http://localhost:4000/stores/store1
```
# 🔒 Isolation & Guardrails

Each store namespace includes:

## ResourceQuota

- Max pods: 10
- CPU requests: 2 cores
- Memory requests: 2Gi
- CPU limits: 4 cores
- Memory limits: 4Gi

## LimitRange

- Default container request: 250m CPU / 256Mi memory
- Default container limit: 500m CPU / 512Mi memory

# 🛡 Security

- Per-store namespace isolation
- Dedicated secrets per store
- Rate limiting (100 req/min)
- Max 5 stores per platform
- Helm idempotent installs
- Cleanup on provisioning failure

# 📈 Horizontal Scaling Plan

| Component        | Scaling Strategy |
|------------------|-----------------|
| Dashboard        | Stateless, scale replicas |
| Platform API     | Stateless, scale replicas |
| Provisioning     | Controlled concurrency |
| WordPress stores | Independent scaling per namespace |

For production:
- Use Redis queue for provisioning jobs
- Use HPA for API
- Use dedicated StorageClass

# 🌍 VPS Deployment (k3s)

Install k3s:

```bash
curl -sfL https://get.k3s.io | sh -
```

Install Helm and deploy the same charts.

Differences handled via:

```
helm/values-prod.yaml
```

Changes:
- Real domain
- TLS enabled
- Production storage class
- Strong secrets

# 🔁 Upgrade & Rollback

Helm provides safe upgrades:

```bash
helm upgrade <release>
```

Rollback:

```bash
helm rollback <release> <revision>
```


# 📊 Observability

Future improvements:
- Prometheus metrics
- Store-level activity log
- Provisioning duration metrics

# 📌 System Design & Tradeoffs

See `system-design.md`


# 💡 Improvements (Future Work)

- Per-user authentication
- Store ownership
- NetworkPolicies
- Cert-manager TLS
- Async job queue
- Persistent store metadata database

# 📄 License

MIT
