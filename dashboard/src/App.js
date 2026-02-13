import React, { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:4000";

export default function App() {
  const [stores, setStores] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("woocommerce");
  const [loading, setLoading] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API_URL}/stores`);
      if (!res.ok) {
        console.error("Failed to fetch stores:", res.status);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStores(data);
      } else {
        console.error("Invalid data format:", data);
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
    }
  };

  useEffect(() => {
    fetchStores();
    const interval = setInterval(fetchStores, 5000);
    return () => clearInterval(interval);
  }, []);

  const createStore = async () => {
    if (!name) return;

    setLoading(true);

    try {
      await fetch(`${API_URL}/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });

      setName("");
      fetchStores();
    } catch (err) {
      console.error("Error creating store:", err);
    }

    setLoading(false);
  };

  const deleteStore = async (storeName) => {
    if (!window.confirm("Are you sure you want to delete this store?"))
      return;

    try {
      await fetch(`${API_URL}/stores/${storeName}`, {
        method: "DELETE",
      });
      fetchStores();
    } catch (err) {
      console.error("Error deleting store:", err);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Ready":
        return "status-ready";
      case "Provisioning":
        return "status-provisioning";
      case "Failed":
        return "status-failed";
      default:
        return "";
    }
  };

  const readyCount = stores.filter(s => s.status === "Ready").length;
  const provisioningCount = stores.filter(s => s.status === "Provisioning").length;

  return (
    <div className="app-container">
      <h1 className="app-title">
        Store Provisioning Platform
      </h1>
      <p className="app-subtitle">
        Auto-refresh every 5 seconds
      </p>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-title">Total Stores</p>
          <p className="stat-value">{stores.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Ready</p>
          <p className="stat-value" style={{ color: "#1a7f37" }}>
            {readyCount}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-title">Provisioning</p>
          <p className="stat-value" style={{ color: "#b26a00" }}>
            {provisioningCount}
          </p>
        </div>
      </div>

      {/* Create Store Form */}
      <div className="form-card">
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px" }}>Create New Store</h2>

        <input
          type="text"
          placeholder="Store Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="form-select"
        >
          <option value="woocommerce">WooCommerce</option>
        </select>

        <button
          onClick={createStore}
          disabled={loading}
          className="form-button"
        >
          {loading ? "Provisioning..." : "Create Store"}
        </button>
      </div>

      {/* Store Grid */}
      <div className="store-grid">
        {stores.map((store) => (
          <div key={store.id} className="store-card">
            <div className="store-header">
              <span className="store-name">{store.name}</span>
              <span className={`status-badge ${getStatusClass(store.status)}`}>
                {store.status}
              </span>
            </div>

            <p className="store-date">
              Created: {new Date(store.createdAt).toLocaleString()}
            </p>

            <div className="store-actions">
              <a
                href={store.url}
                target="_blank"
                rel="noreferrer"
                className="store-link"
              >
                Visit Store
              </a>

              <button
                onClick={() => deleteStore(store.name)}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
