import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const typeColors = {
  Critical: 'red',
  Active: 'orange',
  Observed: 'blue',
  Other: 'gray'
};

function createIcon(type) {
  const color = typeColors[type] || 'gray';
  return L.divIcon({
    className: 'report-marker',
    html: `<span class="marker-dot marker-${color}"></span>`,
    iconSize: [16, 16]
  });
}

export default function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'Observed',
    latitude: '',
    longitude: ''
  });
  const [message, setMessage] = useState('');

  async function loadReports() {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/api/reports`);
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        type: form.type
      };
      await axios.post(`${apiBase}/api/reports`, payload);
      setMessage('Report submitted for moderation.');
      setForm({
        title: '',
        description: '',
        type: 'Observed',
        latitude: '',
        longitude: ''
      });
      await loadReports();
    } catch (err) {
      console.error('Failed to submit report', err);
      setMessage('Error submitting report.');
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ICETracker</h1>
        <p className="tagline">
          Community-submitted, moderated reports of ICE activity. Cross-check with trusted local
          networks before acting.
        </p>
      </header>

      <main className="layout">
        <section className="left">
          <h2>Submit a report</h2>
          <form className="report-form" onSubmit={handleSubmit}>
            <label>
              Title (optional)
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label>
              Description
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="Critical">Critical</option>
                <option value="Active">Active</option>
                <option value="Observed">Observed</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <div className="coords-row">
              <label>
                Latitude
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                />
              </label>
            </div>
            <button type="submit">Submit report</button>
          </form>
          {message && <p className="message">{message}</p>}

          <section className="disclaimer">
            <h3>Disclaimers & Ethics</h3>
            <ul>
              <li>Information is community-submitted and may be incomplete or inaccurate.</li>
              <li>
                This tool does not encourage violence, harassment, or any unlawful activity. Use
                responsibly.
              </li>
              <li>Always cross-reference with trusted rapid response networks or legal aid.</li>
              <li>No compensation is provided for reports.</li>
            </ul>
          </section>
        </section>

        <section className="right">
          <div className="map-header">
            <h2>Map of moderated reports</h2>
            {loading && <span className="badge">Loading…</span>}
            <button onClick={loadReports} className="refresh-btn">
              Refresh
            </button>
          </div>
          <MapContainer
            center={[44.9778, -93.2650]} // Minneapolis as default
            zoom={11}
            className="map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {reports.map((r) => (
              <Marker key={r.id} position={[r.latitude, r.longitude]} icon={createIcon(r.type)}>
                <Popup>
                  <strong>{r.title || r.type}</strong>
                  <br />
                  {r.description}
                  <br />
                  <small>
                    Type: {r.type} | Status: {r.confirmation_status}
                  </small>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>
      </main>
    </div>
  );
}

