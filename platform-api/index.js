const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const rateLimit = require("express-rate-limit");
const k8s = require("@kubernetes/client-node");
const path = require("path");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());

const kc = new k8s.KubeConfig();
kc.loadFromFile(path.join(os.homedir(), ".kube", "config"));

const coreApi = kc.makeApiClient(k8s.CoreV1Api);

let stores = [];

const storeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Try again later." }
});

app.use("/stores", storeLimiter);

async function waitForWordpressReady(namespace, storeObj, releaseName) {
  let retries = 0;
  const maxRetries = 60;

  const poll = async () => {
    try {
      const response = await coreApi.listNamespacedPod({ namespace });
      const pods = response.items || response.body?.items;

      if (!pods || pods.length === 0) {
        console.log(`[POLL] ${storeObj.name}: No pods yet`);
        return retry();
      }

      // Find WordPress pod
      const wpPod = pods.find(p =>
        p.metadata.name.toLowerCase().includes("wordpress")
      );

      if (!wpPod) {
        console.log(`[POLL] ${storeObj.name}: WP pod not found`);
        return retry();
      }

      const status = wpPod.status;

      const containersReady =
        status.containerStatuses &&
        status.containerStatuses.length > 0 &&
        status.containerStatuses.every(c => c.ready);

      const isReady = status.phase === "Running" && containersReady;

      console.log(
        `[POLL] ${storeObj.name}: phase=${status.phase}, containersReady=${containersReady}`
      );

      if (isReady) {
        storeObj.status = "Ready";
        console.log(`[SUCCESS] ${storeObj.name} Ready`);
        return;
      }

    } catch (err) {
      console.error(`[POLL ERROR] ${storeObj.name}:`, err.message);
    }

    retry();
  };

  function retry() {
    retries++;
    if (retries >= maxRetries) {
      storeObj.status = "Failed";
      console.log(`[TIMEOUT] ${storeObj.name} failed`);

      exec(`helm uninstall ${releaseName} -n ${namespace}`);
      return;
    }

    setTimeout(poll, 10000);
  }

  poll();

}
app.get("/", (req, res) => {
  res.json("Platform API is running..");
});
app.get("/stores", (req, res) => {
  res.json(stores);
});

app.post("/stores", async (req, res) => {
  const { name, type } = req.body;

  if (!name || !type)
    return res.status(400).json({ message: "Name and type required" });

  if (stores.length >= 5)
    return res.status(403).json({ error: "Maximum stores reached" });

  const cleanName = name.trim().toLowerCase();
  const namespace = `store-${cleanName}`;
  const hostname = `${namespace}.localhost`;
  const releaseName = namespace;


  console.log(`[AUDIT] Creating store ${name}`);

  const helmCommand =
    `helm upgrade --install ${releaseName} bitnami/wordpress ` +
    `--namespace ${namespace} --create-namespace ` +
    `--set ingress.enabled=true ` +
    `--set ingress.ingressClassName=nginx ` +
    `--set ingress.hostname=${hostname} ` +
    `--set wordpressUsername=admin ` +
    `--set wordpressPassword=admin123 ` +
    `--set wordpressEmail=admin@test.com ` +
    `--set wordpressPlugins=woocommerce `;

  exec(helmCommand, async (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: "Provisioning failed",
        details: stderr
      });
    }

    try {
      await coreApi.createNamespacedSecret({
        namespace,
        body: {
          metadata: { name: "wp-secret" },
          stringData: { wordpressPassword: "admin123" }
        }
      });

      await coreApi.createNamespacedResourceQuota({
        namespace,
        body: {
          metadata: { name: "store-quota" },
          spec: {
            hard: {
              pods: "10",
              "requests.cpu": "2",
              "requests.memory": "2Gi",
              "limits.cpu": "4",
              "limits.memory": "4Gi"
            }
          }
        }
      });

      await coreApi.createNamespacedLimitRange({
        namespace,
        body: {
          metadata: { name: "store-limit-range" },
          spec: {
            limits: [{
              type: "Container",
              default: { cpu: "1000m", memory: "1Gi" },
              defaultRequest: { cpu: "500m", memory: "512Mi" }
            }]
          }
        }
      });

    } catch (e) {
      console.error("Isolation setup error:", e.body || e);
    }

    const newStore = {
      id: Date.now(),
      name: cleanName,
      type,
      status: "Provisioning",
      namespace,
      url: `http://${hostname}`,
      createdAt: new Date().toISOString()
    };

    stores.push(newStore);

    waitForWordpressReady(namespace, newStore, releaseName);

    res.status(201).json(newStore);
  });
});


app.delete("/stores/:name", (req, res) => {
  const name = req.params.name.toLowerCase().trim();
  const releaseName = `store-${name}`;
  const namespace = releaseName;

  exec(`helm uninstall ${releaseName} -n ${namespace}`, (error) => {
    if (error) {
      console.error(`[ERROR] Delete failed for ${name}:`, error.message);
    }
    stores = stores.filter(s => s.name.toLowerCase() !== name);
    res.json({ message: "Store deleted" });
  });
});

app.listen(4000, () => {
  console.log("Platform API running at http://localhost:4000");
});
