import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';
import TransitMap from './components/TransitMap';

const lineColors = {
  1: '#ef4444',
  2: '#3b82f6',
  3: '#10b981',
};

const initialLines = [
  { id: 1, name: 'Ligne 1' },
  { id: 2, name: 'Ligne 2' },
  { id: 3, name: 'Ligne 3' },
];

export default function App() {
  const [stations, setStations] = useState([]);
  const [selectedLine, setSelectedLine] = useState(1);
  const [etaStations, setEtaStations] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedBusPosition, setSelectedBusPosition] = useState(null);
  const [selectedBusTelemetry, setSelectedBusTelemetry] = useState(null);
  const [selectedBusHistory, setSelectedBusHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [historyRange, setHistoryRange] = useState({ from: '', to: '' });
  const [status, setStatus] = useState('Loading live transit data...');
  const [connectedAt, setConnectedAt] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('siv_token') || '');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [buses, setBuses] = useState([]);
  const [activeFleet, setActiveFleet] = useState([]);
  const [busSearch, setBusSearch] = useState('');
  const [lines, setLines] = useState([]);
  const [stationsAdmin, setStationsAdmin] = useState([]);
  const [opsStatus, setOpsStatus] = useState('Sign in to unlock the operations panel.');
  const [adminTab, setAdminTab] = useState('bus');
  const [busForm, setBusForm] = useState({ immatriculation: '', numero: '', ligne_id: 1, etat: 'inactif', capacite: 50 });
  const [lineForm, setLineForm] = useState({ nom: '', description: '', couleur: '#3B82F6' });
  const [stationForm, setStationForm] = useState({ nom: '', latitude: '', longitude: '', ligne_id: 1, ordre: 1 });
  const [crudError, setCrudError] = useState('');
  const [crudBusy, setCrudBusy] = useState('');
  const [busEditId, setBusEditId] = useState(null);
  const [lineEditId, setLineEditId] = useState(null);
  const [stationEditId, setStationEditId] = useState(null);

  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await apiFetch('/public/stations');
        setStations(Array.isArray(data) ? data : []);
        setStatus('Live station feed ready');
        setConnectedAt(new Date().toISOString());
      } catch {
        setStatus('Unable to reach backend');
      }
    };

    loadStations();
  }, []);

  useEffect(() => {
    if (!token) {
      setBuses([]);
      setActiveFleet([]);
      setLines([]);
      setStationsAdmin([]);
      setOpsStatus('Sign in to unlock the operations panel.');
      return;
    }

    const loadOperations = async () => {
      try {
        const [busData, activeData, lineData, stationData] = await Promise.all([
          apiFetch('/bus', token),
          apiFetch('/bus/active', token),
          apiFetch('/lignes', token),
          apiFetch('/public/stations'),
        ]);

        setBuses(Array.isArray(busData) ? busData : []);
        setActiveFleet(Array.isArray(activeData) ? activeData : []);
        setLines(Array.isArray(lineData) ? lineData : []);
        setStationsAdmin(Array.isArray(stationData) ? stationData : []);
        setBusForm((current) => ({
          ...current,
          ligne_id: lineData?.[0]?.id ?? current.ligne_id,
        }));
        setLineForm((current) => ({
          ...current,
          nom: current.nom || `Ligne ${lineData?.length ? lineData.length + 1 : 1}`,
        }));
        setStationForm((current) => ({
          ...current,
          ligne_id: lineData?.[0]?.id ?? current.ligne_id,
        }));
        setOpsStatus('Operations feed ready');
      } catch (error) {
        setOpsStatus(error.message);
      }
    };

    loadOperations();
  }, [token]);

  useEffect(() => {
    const loadEta = async () => {
      try {
        const data = await apiFetch(`/public/lignes/${selectedLine}/eta`);
        setEtaStations(Array.isArray(data) ? data : []);
      } catch {
        setEtaStations([]);
      }
    };

    loadEta();
  }, [selectedLine]);

  useEffect(() => {
    if (!token) return undefined;

    const interval = setInterval(async () => {
      try {
        const [busData, activeData] = await Promise.all([apiFetch('/bus', token), apiFetch('/bus/active', token)]);
        setBuses(Array.isArray(busData) ? busData : []);
        setActiveFleet(Array.isArray(activeData) ? activeData : []);

        if (selectedBusId) {
          const [busSnapshot, positionSnapshot, telemetrySnapshot] = await Promise.all([
            apiFetch(`/bus/${selectedBusId}`, token),
            apiFetch(`/bus/${selectedBusId}/position`, token),
            apiFetch(`/bus/${selectedBusId}/telemetrie`, token),
          ]);

          setSelectedBus(busSnapshot);
          setSelectedBusPosition(positionSnapshot);
          setSelectedBusTelemetry(telemetrySnapshot);
        }
      } catch {
        // Keep the last good snapshot visible.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [token, selectedBusId]);

  const stationsCount = stations.length;
  const activeBuses = buses.filter((bus) => bus.etat === 'actif').length;
  const filteredBuses = useMemo(() => {
    const query = busSearch.trim().toLowerCase();
    if (!query) return buses;

    return buses.filter((bus) =>
      [bus.numero, bus.immatriculation, bus.ligne_nom, bus.etat]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [buses, busSearch]);
  const activeLineStations = useMemo(
    () => stations.filter((station) => station.ligne_id === selectedLine),
    [stations, selectedLine],
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const payload = await apiFetch('/auth/login', '', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      localStorage.setItem('siv_token', payload.token);
      setToken(payload.token);
      setOpsStatus('Operations feed ready');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('siv_token');
    setToken('');
    setBuses([]);
  };

  const reloadOperations = async () => {
    const [busData, activeData, lineData, stationData] = await Promise.all([
      apiFetch('/bus', token),
      apiFetch('/bus/active', token),
      apiFetch('/lignes', token),
      apiFetch('/public/stations'),
    ]);

    setBuses(Array.isArray(busData) ? busData : []);
    setActiveFleet(Array.isArray(activeData) ? activeData : []);
    setLines(Array.isArray(lineData) ? lineData : []);
    setStationsAdmin(Array.isArray(stationData) ? stationData : []);
  };

  const loadSelectedBus = async (busId) => {
    setSelectedBusId(busId);
    setHistoryMeta({ page: 1, limit: 20, total: 0 });
    try {
      const query = new URLSearchParams({ page: '1', limit: '20' });
      const [busData, positionData, telemetryData, historyData] = await Promise.all([
        apiFetch(`/bus/${busId}`, token),
        apiFetch(`/bus/${busId}/position`, token),
        apiFetch(`/bus/${busId}/telemetrie`, token),
        apiFetch(`/bus/${busId}/historique?${query.toString()}`, token),
      ]);

      setSelectedBus(busData);
      setSelectedBusPosition(positionData);
      setSelectedBusTelemetry(telemetryData);
      setSelectedBusHistory(Array.isArray(historyData?.data) ? historyData.data : []);
      setHistoryMeta(historyData?.meta || { page: 1, limit: 20, total: 0 });
      setHistoryRange({ from: '', to: '' });
    } catch (error) {
      setCrudError(error.message);
    }
  };

  const reloadBusHistory = async (pageOverride) => {
    if (!selectedBusId) return;

    const query = new URLSearchParams();
    if (historyRange.from) query.set('from', historyRange.from);
    if (historyRange.to) query.set('to', historyRange.to);
    query.set('page', String(pageOverride || historyMeta.page || 1));
    query.set('limit', String(historyMeta.limit || 20));

    const historyData = await apiFetch(`/bus/${selectedBusId}/historique${query.toString() ? `?${query.toString()}` : ''}`, token);
    setSelectedBusHistory(Array.isArray(historyData?.data) ? historyData.data : []);
    setHistoryMeta(historyData?.meta || historyMeta);
  };

  const runCrud = async (action, runner) => {
    setCrudError('');
    setCrudBusy(action);
    try {
      await runner();
      await reloadOperations();
    } catch (error) {
      setCrudError(error.message);
    } finally {
      setCrudBusy('');
    }
  };

  const createBus = (event) => {
    event.preventDefault();
    const method = busEditId ? 'PUT' : 'POST';
    const endpoint = busEditId ? `/bus/${busEditId}` : '/bus';
    return runCrud(busEditId ? `bus-update-${busEditId}` : 'bus-create', () =>
      apiFetch(endpoint, token, {
        method,
        body: JSON.stringify(busForm),
      }),
    ).then(() => {
      setBusEditId(null);
      setBusForm({ immatriculation: '', numero: '', ligne_id: lines?.[0]?.id ?? 1, etat: 'inactif', capacite: 50 });
    });
  };

  const editBus = (bus) => {
    setAdminTab('bus');
    setBusEditId(bus.id);
    setBusForm({
      immatriculation: bus.immatriculation || '',
      numero: bus.numero || '',
      ligne_id: bus.ligne_id || lines?.[0]?.id || 1,
      etat: bus.etat || 'inactif',
      capacite: bus.capacite || 50,
    });
  };

  const cancelBusEdit = () => {
    setBusEditId(null);
    setBusForm({ immatriculation: '', numero: '', ligne_id: lines?.[0]?.id ?? 1, etat: 'inactif', capacite: 50 });
  };

  const deleteBus = (id) => runCrud(`bus-delete-${id}`, () => apiFetch(`/bus/${id}`, token, { method: 'DELETE' }));

  const createLine = (event) => {
    event.preventDefault();
    const method = lineEditId ? 'PUT' : 'POST';
    const endpoint = lineEditId ? `/lignes/${lineEditId}` : '/lignes';
    return runCrud(lineEditId ? `line-update-${lineEditId}` : 'line-create', () =>
      apiFetch(endpoint, token, {
        method,
        body: JSON.stringify(lineForm),
      }),
    ).then(() => {
      setLineEditId(null);
      setLineForm({ nom: '', description: '', couleur: '#3B82F6' });
    });
  };

  const editLine = (line) => {
    setAdminTab('line');
    setLineEditId(line.id);
    setLineForm({
      nom: line.nom || '',
      description: line.description || '',
      couleur: line.couleur || '#3B82F6',
    });
  };

  const cancelLineEdit = () => {
    setLineEditId(null);
    setLineForm({ nom: '', description: '', couleur: '#3B82F6' });
  };

  const deleteLine = (id) => runCrud(`line-delete-${id}`, () => apiFetch(`/lignes/${id}`, token, { method: 'DELETE' }));

  const createStation = (event) => {
    event.preventDefault();
    const method = stationEditId ? 'PUT' : 'POST';
    const endpoint = stationEditId ? `/stations/${stationEditId}` : '/stations';
    return runCrud(stationEditId ? `station-update-${stationEditId}` : 'station-create', () =>
      apiFetch(endpoint, token, {
        method,
        body: JSON.stringify(stationForm),
      }),
    ).then(() => {
      setStationEditId(null);
      setStationForm({ nom: '', latitude: '', longitude: '', ligne_id: lines?.[0]?.id ?? 1, ordre: 1 });
    });
  };

  const editStation = (station) => {
    setAdminTab('station');
    setStationEditId(station.id);
    setStationForm({
      nom: station.nom || '',
      latitude: station.latitude ?? '',
      longitude: station.longitude ?? '',
      ligne_id: station.ligne_id || lines?.[0]?.id || 1,
      ordre: station.ordre || 1,
    });
  };

  const cancelStationEdit = () => {
    setStationEditId(null);
    setStationForm({ nom: '', latitude: '', longitude: '', ligne_id: lines?.[0]?.id ?? 1, ordre: 1 });
  };

  const deleteStation = (id) => runCrud(`station-delete-${id}`, () => apiFetch(`/stations/${id}`, token, { method: 'DELETE' }));

  return (
    <div className="shell">
      <main className="page">
        <header className="topbar">
          <div>
            <p className="eyebrow">Passenger information system</p>
            <h1>Transit operations dashboard</h1>
          </div>
          <div className="topbar-meta">
            <span className="status-chip status-live">{status}</span>
            <span className="topbar-note">Real-time data from MQTT, REST, and MySQL.</span>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">SIV MVP / Version 1</p>
            <h2 className="hero-title">Live transit visibility for buses, stations, and line ETAs.</h2>
            <p className="lede">
              A starter web dashboard for the IoT-based SIV project. It shows public stations, simple line ETAs, and a clean operations view.
            </p>
            <div className="hero-actions">
              {initialLines.map((line) => (
                <button
                  key={line.id}
                  className={`line-pill ${selectedLine === line.id ? 'active' : ''}`}
                  onClick={() => setSelectedLine(line.id)}
                  style={{ '--line-color': lineColors[line.id] }}
                  type="button"
                >
                  {line.name}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-panel">
            {!token ? (
              <form className="auth-card" onSubmit={handleLogin}>
                <div className="panel-head compact">
                  <div>
                    <p className="panel-label">Operations login</p>
                    <h2>Sign in to view buses</h2>
                  </div>
                  <span className="panel-badge">Protected</span>
                </div>
                <div className="auth-credentials">
                  <span>Demo access</span>
                  <strong>admin / admin123</strong>
                </div>
                <label>
                  <span>Username</span>
                  <input value={username} onChange={(event) => setUsername(event.target.value)} />
                </label>
                <label>
                  <span>Password</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                {authError ? <div className="error-box">{authError}</div> : null}
                <button className="primary-btn" type="submit" disabled={authLoading}>
                  {authLoading ? 'Signing in...' : 'Login'}
                </button>
                <p className="hint-text">Default demo account: admin / admin123</p>
              </form>
            ) : (
              <>
                <div className="panel-head compact">
                  <div>
                    <p className="panel-label">Operations panel</p>
                    <h2>Authenticated bus overview</h2>
                  </div>
                  <button className="ghost-btn" type="button" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
                <p className="panel-subtitle">{opsStatus}</p>
                <div className="metric-grid">
                  <article className="metric-card metric-primary">
                    <span>Stations</span>
                    <strong>{stationsCount}</strong>
                    <small>Public stops available on the network.</small>
                  </article>
                  <article className="metric-card">
                    <span>Active buses</span>
                    <strong>{activeBuses}</strong>
                  </article>
                  <article className="metric-card">
                    <span>Last sync</span>
                    <strong>{connectedAt ? new Date(connectedAt).toLocaleTimeString() : '--:--'}</strong>
                  </article>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="content-grid">
          <article className="panel map-panel panel-accent">
            <div className="panel-head">
              <div>
                <p className="panel-label">Live map</p>
                <h2>Route snapshot</h2>
              </div>
              <span className="panel-badge">Line {selectedLine}</span>
            </div>
            <TransitMap buses={activeFleet.length ? activeFleet : buses} onSelectBus={loadSelectedBus} />
            <div className="route-rail">
              {activeLineStations.length > 0 ? (
                activeLineStations.map((station, index) => (
                  <div className="station-row" key={station.id ?? `${station.nom}-${index}`}>
                    <span className="station-dot" />
                    <div>
                      <strong>{station.nom}</strong>
                      <p>
                        {station.latitude}, {station.longitude}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No stations loaded for this line yet.</div>
              )}
            </div>
          </article>

          <article className="panel eta-panel">
            <div className="panel-head">
              <div>
                <p className="panel-label">Traveler ETA</p>
                <h2>Station arrivals</h2>
              </div>
              <span className="panel-badge">Public view</span>
            </div>
            <div className="eta-list">
              {etaStations.length > 0 ? (
                etaStations.map((station) => (
                  <div className="eta-item" key={station.id}>
                    <div>
                      <strong>{station.nom}</strong>
                      <p>{station.ligne_nom || `Ligne ${selectedLine}`}</p>
                    </div>
                    <div className="eta-bubbles">
                      {(station.bus_etas || []).slice(0, 2).map((eta) => (
                        <span key={`${station.id}-${eta.bus_id}`}>
                          {eta.bus_numero}: {eta.eta_minutes ?? '--'} min
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Waiting for ETA data from the backend.</div>
              )}
            </div>
            <div className="panel-footer-note">ETA is based on live bus speed and distance to each station.</div>
          </article>
        </section>

        <section className="panel table-panel">
          <div className="panel-head">
            <div>
              <p className="panel-label">Public stations</p>
              <h2>All stations from the current feed</h2>
            </div>
            <span className="panel-badge">MySQL-backed</span>
          </div>
          <div className="station-table">
            {stations.map((station) => (
              <div className="station-card" key={station.id}>
                <strong>{station.nom}</strong>
                <p>{station.ligne_nom || 'Unassigned line'}</p>
                <small>
                  {station.latitude}, {station.longitude}
                </small>
              </div>
            ))}
            {stations.length === 0 && <div className="empty-state">No stations available yet.</div>}
          </div>
        </section>

        {token ? (
          <section className="panel bus-panel">
            <div className="panel-head">
              <div>
                <p className="panel-label">Protected API</p>
                <h2>Live bus fleet</h2>
              </div>
              <span className="panel-badge">GET /api/bus</span>
            </div>
            <div className="bus-toolbar">
              <input
                className="bus-search"
                value={busSearch}
                onChange={(event) => setBusSearch(event.target.value)}
                placeholder="Search bus number, immatriculation, line, status"
              />
              <span className="panel-subtitle">Auto-refresh every 5 seconds</span>
            </div>
            <div className="bus-grid">
              {filteredBuses.map((bus) => (
                <article className={`bus-card ${selectedBusId === bus.id ? 'selected' : ''}`} key={bus.id} onClick={() => loadSelectedBus(bus.id)}>
                  <div className="bus-card-top">
                    <div>
                      <strong>{bus.numero}</strong>
                      <p>{bus.immatriculation}</p>
                    </div>
                    <span className={`bus-state ${bus.etat}`}>{bus.etat}</span>
                  </div>
                  <div className="bus-facts">
                    <span>Line: {bus.ligne_nom || 'N/A'}</span>
                    <span>Speed: {bus.can_speed ?? bus.vitesse ?? 0} km/h</span>
                    <span>Fuel: {bus.fuel ?? '--'}%</span>
                    <span>Temp: {bus.engine_temp ?? '--'}°C</span>
                    <span>Doors: {bus.doors ?? 'closed'}</span>
                  </div>
                  <div className="crud-actions bus-actions">
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        editBus(bus);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="ghost-btn danger"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteBus(bus.id);
                      }}
                      disabled={crudBusy === `bus-delete-${bus.id}`}
                    >
                      {crudBusy === `bus-delete-${bus.id}` ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
              {filteredBuses.length === 0 ? <div className="empty-state">No buses match your search or the protected API returned nothing yet.</div> : null}
            </div>
          </section>
        ) : null}

        {token ? (
          <section className="panel admin-panel">
            <div className="panel-head">
              <div>
                <p className="panel-label">CRUD manager</p>
                <h2>Buses, lines, and stations</h2>
              </div>
              <div className="tab-row">
                {['bus', 'line', 'station'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tab-btn ${adminTab === tab ? 'active' : ''}`}
                    onClick={() => setAdminTab(tab)}
                  >
                    {tab === 'bus' ? 'Buses' : tab === 'line' ? 'Lines' : 'Stations'}
                  </button>
                ))}
              </div>
            </div>

            {crudError ? <div className="error-box">{crudError}</div> : null}

            {adminTab === 'bus' ? (
              <div className="crud-layout">
                <form className="crud-form" onSubmit={createBus}>
                  <h3>{busEditId ? 'Update bus' : 'Create bus'}</h3>
                  <label>
                    <span>Immatriculation</span>
                    <input value={busForm.immatriculation} onChange={(event) => setBusForm({ ...busForm, immatriculation: event.target.value })} />
                  </label>
                  <label>
                    <span>Numero</span>
                    <input value={busForm.numero} onChange={(event) => setBusForm({ ...busForm, numero: event.target.value })} />
                  </label>
                  <label>
                    <span>Line</span>
                    <select value={busForm.ligne_id} onChange={(event) => setBusForm({ ...busForm, ligne_id: Number(event.target.value) })}>
                      {lines.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={busForm.etat} onChange={(event) => setBusForm({ ...busForm, etat: event.target.value })}>
                      <option value="actif">actif</option>
                      <option value="inactif">inactif</option>
                      <option value="maintenance">maintenance</option>
                    </select>
                  </label>
                  <label>
                    <span>Capacity</span>
                    <input type="number" value={busForm.capacite} onChange={(event) => setBusForm({ ...busForm, capacite: Number(event.target.value) })} />
                  </label>
                  <button className="primary-btn" type="submit" disabled={crudBusy.startsWith('bus-')}>
                    {crudBusy.startsWith('bus-update') || crudBusy === 'bus-create' ? 'Saving...' : busEditId ? 'Update bus' : 'Create bus'}
                  </button>
                  {busEditId ? (
                    <button className="ghost-btn" type="button" onClick={cancelBusEdit}>
                      Cancel edit
                    </button>
                  ) : null}
                </form>

                <div className="crud-list">
                  {buses.map((bus) => (
                    <article className="crud-item" key={bus.id}>
                      <div>
                        <strong>{bus.numero}</strong>
                        <p>{bus.immatriculation}</p>
                        <small>{bus.ligne_nom || 'No line'}</small>
                      </div>
                      <div className="crud-actions">
                        <button className="ghost-btn" type="button" onClick={() => editBus(bus)}>
                          Edit
                        </button>
                        <button className="ghost-btn danger" type="button" onClick={() => deleteBus(bus.id)} disabled={crudBusy === `bus-delete-${bus.id}`}>
                          {crudBusy === `bus-delete-${bus.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {adminTab === 'line' ? (
              <div className="crud-layout">
                <form className="crud-form" onSubmit={createLine}>
                  <h3>{lineEditId ? 'Update line' : 'Create line'}</h3>
                  <label>
                    <span>Name</span>
                    <input value={lineForm.nom} onChange={(event) => setLineForm({ ...lineForm, nom: event.target.value })} />
                  </label>
                  <label>
                    <span>Description</span>
                    <input value={lineForm.description} onChange={(event) => setLineForm({ ...lineForm, description: event.target.value })} />
                  </label>
                  <label>
                    <span>Color</span>
                    <input type="color" value={lineForm.couleur} onChange={(event) => setLineForm({ ...lineForm, couleur: event.target.value })} />
                  </label>
                  <button className="primary-btn" type="submit" disabled={crudBusy.startsWith('line-')}>
                    {crudBusy.startsWith('line-update') || crudBusy === 'line-create' ? 'Saving...' : lineEditId ? 'Update line' : 'Create line'}
                  </button>
                  {lineEditId ? (
                    <button className="ghost-btn" type="button" onClick={cancelLineEdit}>
                      Cancel edit
                    </button>
                  ) : null}
                </form>

                <div className="crud-list">
                  {lines.map((line) => (
                    <article className="crud-item" key={line.id}>
                      <div>
                        <strong>{line.nom}</strong>
                        <p>{line.description || 'No description'}</p>
                        <small>{line.couleur}</small>
                      </div>
                      <div className="crud-actions">
                        <button className="ghost-btn" type="button" onClick={() => editLine(line)}>
                          Edit
                        </button>
                        <button className="ghost-btn danger" type="button" onClick={() => deleteLine(line.id)} disabled={crudBusy === `line-delete-${line.id}`}>
                          {crudBusy === `line-delete-${line.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {adminTab === 'station' ? (
              <div className="crud-layout">
                <form className="crud-form" onSubmit={createStation}>
                  <h3>{stationEditId ? 'Update station' : 'Create station'}</h3>
                  <label>
                    <span>Name</span>
                    <input value={stationForm.nom} onChange={(event) => setStationForm({ ...stationForm, nom: event.target.value })} />
                  </label>
                  <label>
                    <span>Latitude</span>
                    <input value={stationForm.latitude} onChange={(event) => setStationForm({ ...stationForm, latitude: event.target.value })} />
                  </label>
                  <label>
                    <span>Longitude</span>
                    <input value={stationForm.longitude} onChange={(event) => setStationForm({ ...stationForm, longitude: event.target.value })} />
                  </label>
                  <label>
                    <span>Line</span>
                    <select value={stationForm.ligne_id} onChange={(event) => setStationForm({ ...stationForm, ligne_id: Number(event.target.value) })}>
                      {lines.map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Order</span>
                    <input type="number" value={stationForm.ordre} onChange={(event) => setStationForm({ ...stationForm, ordre: Number(event.target.value) })} />
                  </label>
                  <button className="primary-btn" type="submit" disabled={crudBusy.startsWith('station-')}>
                    {crudBusy.startsWith('station-update') || crudBusy === 'station-create' ? 'Saving...' : stationEditId ? 'Update station' : 'Create station'}
                  </button>
                  {stationEditId ? (
                    <button className="ghost-btn" type="button" onClick={cancelStationEdit}>
                      Cancel edit
                    </button>
                  ) : null}
                </form>

                <div className="crud-list">
                  {stationsAdmin.map((station) => (
                    <article className="crud-item" key={station.id}>
                      <div>
                        <strong>{station.nom}</strong>
                        <p>{station.ligne_nom || 'No line'}</p>
                        <small>{station.latitude}, {station.longitude}</small>
                      </div>
                      <div className="crud-actions">
                        <button className="ghost-btn" type="button" onClick={() => editStation(station)}>
                          Edit
                        </button>
                        <button className="ghost-btn danger" type="button" onClick={() => deleteStation(station.id)} disabled={crudBusy === `station-delete-${station.id}`}>
                          {crudBusy === `station-delete-${station.id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {token && selectedBus ? (
          <section className="panel detail-panel">
            <div className="panel-head">
              <div>
                <p className="panel-label">Bus detail</p>
                <h2>{selectedBus.numero}</h2>
              </div>
              <span className="panel-badge">GET /api/bus/:id</span>
            </div>

            <div className="detail-grid">
              <article className="detail-card">
                <strong>Bus information</strong>
                <p>Immatriculation: {selectedBus.immatriculation}</p>
                <p>Line: {selectedBus.ligne_nom || 'N/A'}</p>
                <p>Status: {selectedBus.etat}</p>
                <p>Capacity: {selectedBus.capacite ?? 50}</p>
              </article>

              <article className="detail-card">
                <strong>Latest position</strong>
                {selectedBusPosition ? (
                  <>
                    <p>Latitude: {selectedBusPosition.latitude}</p>
                    <p>Longitude: {selectedBusPosition.longitude}</p>
                    <p>Speed: {selectedBusPosition.vitesse ?? 0} km/h</p>
                    <p>Timestamp: {selectedBusPosition.date_position}</p>
                  </>
                ) : (
                  <p>No position data yet.</p>
                )}
              </article>

              <article className="detail-card">
                <strong>Latest telemetry</strong>
                {selectedBusTelemetry ? (
                  <>
                    <p>Speed: {selectedBusTelemetry.speed ?? 0} km/h</p>
                    <p>Fuel: {selectedBusTelemetry.fuel ?? 0}%</p>
                    <p>Engine temp: {selectedBusTelemetry.engine_temp ?? 0}°C</p>
                    <p>Doors: {selectedBusTelemetry.doors ?? 'closed'}</p>
                  </>
                ) : (
                  <p>No telemetry data yet.</p>
                )}
              </article>
            </div>

            <div className="history-toolbar">
              <div className="history-filters">
                <label>
                  <span>From</span>
                  <input type="datetime-local" value={historyRange.from} onChange={(event) => setHistoryRange({ ...historyRange, from: event.target.value })} />
                </label>
                <label>
                  <span>To</span>
                  <input type="datetime-local" value={historyRange.to} onChange={(event) => setHistoryRange({ ...historyRange, to: event.target.value })} />
                </label>
              </div>
              <button className="primary-btn" type="button" onClick={reloadBusHistory}>
                Refresh history
              </button>
            </div>

            <div className="history-pagination">
              <span>
                Page {historyMeta.page} of {Math.max(1, Math.ceil((historyMeta.total || 0) / (historyMeta.limit || 20)))}
              </span>
              <div className="history-pagination-actions">
                <button
                  className="ghost-btn"
                  type="button"
                  disabled={historyMeta.page <= 1}
                  onClick={async () => {
                    await reloadBusHistory(Math.max(1, (historyMeta.page || 1) - 1));
                  }}
                >
                  Previous
                </button>
                <button
                  className="ghost-btn"
                  type="button"
                  disabled={historyMeta.page * (historyMeta.limit || 20) >= (historyMeta.total || 0)}
                  onClick={async () => {
                    await reloadBusHistory((historyMeta.page || 1) + 1);
                  }}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="history-list">
              {selectedBusHistory.length > 0 ? (
                selectedBusHistory.map((entry) => (
                  <article className="history-item" key={entry.id}>
                    <strong>{entry.date_position}</strong>
                    <p>
                      {entry.latitude}, {entry.longitude} | {entry.vitesse ?? 0} km/h
                    </p>
                  </article>
                ))
              ) : (
                <div className="empty-state">No history records loaded for this bus.</div>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
