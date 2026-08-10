import { useState, useEffect } from 'react';
import { 
  Activity, Database, FileCode, Terminal, BookOpen, Key, 
  RefreshCw, Plus, Trash2, Edit, Search, 
  Folder, Play, ChevronRight, X, Clipboard, CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import './App.css';

// Type Definitions
interface SystemStats {
  total_reads: number;
  total_writes: number;
  total_deletes: number;
  total_queries: number;
  read_rate: number;
  write_rate: number;
  allocated_mem_mb: number;
  num_goroutines: number;
}

interface TelemetryMetrics {
  system: SystemStats;
  key_count: number;
  db_size_bytes: number;
  file_count: number;
  compaction_ratio: number;
}

interface KeyVal {
  Key: string;
  Value: string;
}

interface ChartDataPoint {
  time: string;
  ops: number;
}

interface Notification {
  message: string;
  type: 'success' | 'warning' | 'error';
  id: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'kv' | 'docs' | 'console' | 'api-docs'>('overview');
  const [token, setToken] = useState(localStorage.getItem('arora_token') || '');
  const [tokenInput, setTokenInput] = useState(token);
  const [isConnected, setIsConnected] = useState(true);

  // Telemetry Telemetry
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(Array(15).fill(0).map((_, i) => ({ time: `${i * 2}s`, ops: 0 })));

  // KV Store
  const [kvSearch, setKvSearch] = useState('');
  const [kvData, setKvData] = useState<KeyVal[]>([]);
  const [loadingKV, setLoadingKV] = useState(false);
  const [showKVModal, setShowKVModal] = useState(false);
  const [kvEditKey, setKvEditKey] = useState('');
  const [kvEditVal, setKvEditVal] = useState('');

  // Documents
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [docQuery, setDocQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docEditId, setDocEditId] = useState('');
  const [docEditJson, setDocEditJson] = useState('');

  // Console
  const [consoleMethod, setConsoleMethod] = useState<'GET' | 'POST' | 'DELETE'>('GET');
  const [consolePath, setConsolePath] = useState('/api/kv/test_key');
  const [consoleBody, setConsoleBody] = useState('{\n  "value": "sample payload"\n}');
  const [consoleStatus, setConsoleStatus] = useState<string>('Idle');
  const [consoleTime, setConsoleTime] = useState<string>('-- ms');
  const [consoleResponse, setConsoleResponse] = useState<string>('Waiting for execution...');

  // Dev Integration
  const [codeLang, setCodeLang] = useState<'curl' | 'js' | 'python'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Compaction Button Loader
  const [isCompacting, setIsCompacting] = useState(false);

  // Fetch utilities with Token
  const aroraFetch = async (path: string, options: RequestInit = {}) => {
    options.headers = options.headers || {};
    if (token) {
      (options.headers as any)['X-Arora-Token'] = token;
    }
    try {
      const res = await fetch(path, options);
      if (res.status === 401) {
        addNotification('Unauthorized request: invalid or missing API token', 'error');
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
      return res;
    } catch (err) {
      setIsConnected(false);
      throw err;
    }
  };

  const addNotification = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Poll metrics
  useEffect(() => {
    const getMetrics = async () => {
      try {
        const res = await aroraFetch('/api/metrics');
        if (res.ok) {
          const data: TelemetryMetrics = await res.json();
          setMetrics(data);

          // Update chart
          setChartData(prev => {
            const next = [...prev];
            next.shift();
            const totalOps = data.system.read_rate + data.system.write_rate;
            next.push({ time: `${new Date().toLocaleTimeString()}`, ops: totalOps });
            return next;
          });
        }
      } catch (err) {
        // Handle metric errors silently during boot or auth mismatches
      }
    };

    getMetrics();
    const interval = setInterval(getMetrics, 2000);
    return () => clearInterval(interval);
  }, [token]);

  // Load tabs-specific data
  useEffect(() => {
    if (activeTab === 'kv') {
      loadKVData();
    } else if (activeTab === 'docs') {
      loadCollections();
    }
  }, [activeTab, token]);

  // KV operations
  const loadKVData = async () => {
    setLoadingKV(true);
    try {
      const res = await aroraFetch(`/api/kv?prefix=${encodeURIComponent(kvSearch)}`);
      if (res.ok) {
        const data: KeyVal[] = await res.json();
        // Filter out JSON docs so only raw KVs remain in KV browser
        setKvData(data ? data.filter(item => !item.Key.startsWith('doc:')) : []);
      }
    } catch (err) {
      addNotification('Failed to retrieve KV records.', 'error');
    } finally {
      setLoadingKV(false);
    }
  };

  // Trigger search on debounce/delay
  useEffect(() => {
    if (activeTab === 'kv') {
      const timer = setTimeout(loadKVData, 300);
      return () => clearTimeout(timer);
    }
  }, [kvSearch]);

  const saveKV = async () => {
    if (!kvEditKey.trim()) {
      addNotification('Key name cannot be blank', 'warning');
      return;
    }
    try {
      const res = await aroraFetch(`/api/kv/${encodeURIComponent(kvEditKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: kvEditVal
      });
      if (res.ok) {
        addNotification(`Key "${kvEditKey}" saved successfully.`, 'success');
        setShowKVModal(false);
        loadKVData();
      } else {
        const errData = await res.json();
        addNotification(errData.error || 'Failed to save KV.', 'error');
      }
    } catch (err) {
      addNotification('Failed to save data.', 'error');
    }
  };

  const deleteKV = async (key: string) => {
    if (!confirm(`Are you sure you want to delete key "${key}"?`)) return;
    try {
      const res = await aroraFetch(`/api/kv/${encodeURIComponent(key)}`, { method: 'DELETE' });
      if (res.ok) {
        addNotification(`Key "${key}" deleted.`, 'success');
        loadKVData();
      }
    } catch (err) {
      addNotification('Failed to delete key.', 'error');
    }
  };

  // Document operations
  const loadCollections = async () => {
    try {
      const res = await aroraFetch('/api/collections');
      if (res.ok) {
        const cols: string[] = await res.json();
        setCollections(cols || []);
        if (cols && cols.length > 0 && !activeCollection) {
          setActiveCollection(cols[0]);
        }
      }
    } catch (err) {
      addNotification('Failed to retrieve collections.', 'error');
    }
  };

  const fetchDocuments = async () => {
    if (!activeCollection) return;
    setLoadingDocs(true);
    try {
      let res;
      if (docQuery.trim()) {
        // Validate filter syntax
        try {
          JSON.parse(docQuery);
        } catch (e) {
          addNotification('Invalid JSON filter syntax.', 'warning');
          setLoadingDocs(false);
          return;
        }

        res = await aroraFetch(`/api/documents/${activeCollection}/query`, {
          method: 'POST',
          body: docQuery
        });
      } else {
        res = await aroraFetch(`/api/documents/${activeCollection}`);
      }

      if (res.ok) {
        const docs = await res.json();
        setDocuments(docs || []);
      }
    } catch (err) {
      addNotification('Failed to fetch documents.', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeCollection]);

  const saveDocument = async () => {
    try {
      JSON.parse(docEditJson); // validate
    } catch (e) {
      addNotification('Body must be a valid JSON document.', 'warning');
      return;
    }

    const url = `/api/documents/${activeCollection}${docEditId ? `?id=${encodeURIComponent(docEditId)}` : ''}`;
    try {
      const res = await aroraFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: docEditJson
      });
      if (res.ok) {
        const data = await res.json();
        addNotification(`Document saved (ID: ${data._id})`, 'success');
        setShowDocModal(false);
        fetchDocuments();
      }
    } catch (err) {
      addNotification('Failed to insert document.', 'error');
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm(`Are you sure you want to delete document "${id}"?`)) return;
    try {
      const res = await aroraFetch(`/api/documents/${activeCollection}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addNotification('Document deleted.', 'success');
        fetchDocuments();
      }
    } catch (err) {
      addNotification('Failed to delete document.', 'error');
    }
  };

  const createCollection = () => {
    const colName = prompt('Enter new collection name:');
    if (!colName) return;
    const cleanColName = colName.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanColName) {
      addNotification('Invalid collection name (only alphanumeric, dashes, and underscores).', 'error');
      return;
    }
    setActiveCollection(cleanColName);
    // write init meta to instantiate
    aroraFetch(`/api/documents/${cleanColName}?id=init_meta`, {
      method: 'POST',
      body: JSON.stringify({ description: 'Collection initialized', _id: 'init_meta' })
    }).then(() => {
      loadCollections();
    });
  };

  // Compaction
  const runCompaction = async () => {
    setIsCompacting(true);
    try {
      const res = await aroraFetch('/api/admin/compact', { method: 'POST' });
      if (res.ok) {
        addNotification('Database compaction completed. Stale entries purged.', 'success');
      }
    } catch (err) {
      addNotification('Failed to execute db compaction.', 'error');
    } finally {
      setIsCompacting(false);
    }
  };

  // Execute console command
  const runConsoleQuery = async () => {
    setConsoleStatus('Running...');
    setConsoleTime('...');
    setConsoleResponse('Executing query...');

    const start = performance.now();
    try {
      const options: RequestInit = { method: consoleMethod };
      if (consoleMethod !== 'GET' && consoleBody.trim()) {
        options.body = consoleBody;
        if (consoleBody.trim().startsWith('{') || consoleBody.trim().startsWith('[')) {
          options.headers = { 'Content-Type': 'application/json' };
        }
      }

      const res = await aroraFetch(consolePath, options);
      const elapsed = (performance.now() - start).toFixed(1);
      setConsoleTime(`${elapsed} ms`);
      setConsoleStatus(`HTTP ${res.status}`);

      const text = await res.text();
      try {
        const jsonVal = JSON.parse(text);
        setConsoleResponse(JSON.stringify(jsonVal, null, 2));
      } catch {
        setConsoleResponse(text || '(Empty Response)');
      }
    } catch (err: any) {
      const elapsed = (performance.now() - start).toFixed(1);
      setConsoleTime(`${elapsed} ms`);
      setConsoleStatus('NET ERROR');
      setConsoleResponse(`Failed to establish connection to server:\n${err.message}`);
    }
  };

  // Save/Apply Auth Token
  const saveToken = () => {
    setToken(tokenInput);
    localStorage.setItem('arora_token', tokenInput);
    addNotification('Token applied.', 'success');
  };

  // Code snippets generator
  const getCodeSnippet = () => {
    const host = window.location.origin;
    const tokenHeader = token ? ` -H "X-Arora-Token: ${token}"` : '';
    const tokenHeaderJS = token ? `, 'X-Arora-Token': '${token}'` : '';

    if (codeLang === 'curl') {
      return `# Store key value
curl -X POST ${host}/api/kv/my_key${tokenHeader} -d "sample value"

# Fetch key value
curl ${host}/api/kv/my_key${tokenHeader}

# Save Document to Collection
curl -X POST ${host}/api/documents/users${tokenHeader} \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Alice", "role": "admin"}'

# Query Documents
curl -X POST ${host}/api/documents/users/query${tokenHeader} \\
  -H "Content-Type: application/json" \\
  -d '{"role": "admin"}'`;
    }

    if (codeLang === 'js') {
      return `// JS KV Fetch
async function saveKV() {
  const res = await fetch('${host}/api/kv/my_key', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'${tokenHeaderJS}
    },
    body: 'sample value'
  });
  console.log(await res.json());
}

async function queryDocs() {
  const res = await fetch('${host}/api/documents/users/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'${tokenHeaderJS}
    },
    body: JSON.stringify({ role: 'admin' })
  });
  console.log(await res.json());
}`;
    }

    return `import requests

# Set Token if active
headers = {}
${token ? `headers['X-Arora-Token'] = '${token}'` : '# No authentication configured'}

# Write KV
res = requests.post('${host}/api/kv/my_key', data="sample value", headers=headers)
print(res.json())

# Query Documents
query_payload = {"role": "admin"}
res = requests.post('${host}/api/documents/users/query', json=query_payload, headers=headers)
print(res.json())`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopiedCode(true);
    addNotification('Code snippet copied to clipboard.', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="app-container">
      {/* Background glow filters */}
      <div className="glow-bg glow-purple"></div>
      <div className="glow-bg glow-cyan"></div>

      {/* Notifications Drawer */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: n.type === 'success' ? 'rgba(46, 196, 182, 0.9)' : n.type === 'warning' ? 'rgba(255, 159, 28, 0.9)' : 'rgba(255, 51, 102, 0.9)',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <CheckCircle size={16} />
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-icon">
            <Database size={22} />
          </div>
          <div className="logo-text">
            <h1>AroraDB</h1>
            <span>v1.0.0</span>
          </div>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} /> Overview
          </button>
          <button 
            className={`nav-item ${activeTab === 'kv' ? 'active' : ''}`}
            onClick={() => setActiveTab('kv')}
          >
            <Database size={18} /> KV Store
          </button>
          <button 
            className={`nav-item ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            <FileCode size={18} /> Documents
          </button>
          <button 
            className={`nav-item ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            <Terminal size={18} /> Console
          </button>
          <button 
            className={`nav-item ${activeTab === 'api-docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-docs')}
          >
            <BookOpen size={18} /> API & Hosting
          </button>
        </nav>

        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></div>
          <div className="status-info">
            <p>Status: {isConnected ? 'Connected' : 'Offline'}</p>
            <span>{window.location.host}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        <header className="top-bar">
          <h2>
            {activeTab === 'overview' && 'Telemetry & System Health'}
            {activeTab === 'kv' && 'Key-Value Database Browser'}
            {activeTab === 'docs' && 'JSON Document Collections Manager'}
            {activeTab === 'console' && 'Interactive API Query Console'}
            {activeTab === 'api-docs' && 'Developer API Guides & Integration'}
          </h2>
          <div className="auth-bar">
            <div className="token-input-wrapper">
              <Key size={14} />
              <input 
                type="password" 
                placeholder="Auth Token (if required)" 
                value={tokenInput} 
                onChange={(e) => setTokenInput(e.target.value)} 
              />
            </div>
            <button className="btn btn-primary-outline" onClick={saveToken}>Apply</button>
          </div>
        </header>

        {/* VIEW: Overview */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Database size={20} />
                </div>
                <div className="stat-details">
                  <h3>Total Keys</h3>
                  <p>{metrics?.key_count.toLocaleString() ?? '0'}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon cyan">
                  <Activity size={20} />
                </div>
                <div className="stat-details">
                  <h3>Storage Size</h3>
                  <p>{formatBytes(metrics?.db_size_bytes ?? 0)}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">
                  <FileCode size={20} />
                </div>
                <div className="stat-details">
                  <h3>Data Files</h3>
                  <p>{metrics?.file_count ?? '0'}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <Terminal size={20} />
                </div>
                <div className="stat-details">
                  <h3>Heap Allocated</h3>
                  <p>{metrics?.system.allocated_mem_mb.toFixed(1) ?? '0.0'} MB</p>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Telemetry charts */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <h3>Operations Rates (Ops/sec)</h3>
                  <span className="live-tag">
                    <span className="pulse-dot"></span> LIVE
                  </span>
                </div>
                <div className="panel-body">
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip contentStyle={{ background: '#0b0c10', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <Area type="monotone" dataKey="ops" stroke="var(--color-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorOps)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-legend">
                    <div className="rate-indicator">
                      <span>{metrics?.system.read_rate ?? 0}</span>
                      <p>Read Ops/sec</p>
                    </div>
                    <div className="rate-indicator">
                      <span className="purple-text">{metrics?.system.write_rate ?? 0}</span>
                      <p>Write Ops/sec</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Actions */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <h3>System Status</h3>
                </div>
                <div className="panel-body">
                  <div className="sys-info-list">
                    <div className="info-row">
                      <span>Compaction Ratio:</span>
                      <strong>{metrics?.compaction_ratio.toFixed(3) ?? '1.000'}</strong>
                    </div>
                    <div className="info-row">
                      <span>Active Goroutines:</span>
                      <strong>{metrics?.system.num_goroutines ?? 0}</strong>
                    </div>
                    <div className="info-row">
                      <span>Reads Total:</span>
                      <strong>{metrics?.system.total_reads.toLocaleString() ?? 0}</strong>
                    </div>
                    <div className="info-row">
                      <span>Writes Total:</span>
                      <strong>{metrics?.system.total_writes.toLocaleString() ?? 0}</strong>
                    </div>
                  </div>
                  <div className="action-box">
                    <p>Clean database data logs and eliminate stale records, rebuilding the indexes.</p>
                    <button 
                      className="btn btn-glow-purple w-full"
                      disabled={isCompacting}
                      onClick={runCompaction}
                    >
                      {isCompacting ? <RefreshCw size={16} className="spinner" /> : <RefreshCw size={16} />} 
                      Trigger Compaction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: KV Store */}
        {activeTab === 'kv' && (
          <div className="tab-content">
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="search-bar">
                  <Search size={16} />
                  <input 
                    type="text" 
                    placeholder="Search keys by prefix..." 
                    value={kvSearch}
                    onChange={(e) => setKvSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => {
                  setKvEditKey('');
                  setKvEditVal('');
                  setShowKVModal(true);
                }}>
                  <Plus size={16} /> Add Key
                </button>
              </div>
              <div className="panel-body p-0">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Value Preview</th>
                        <th style={{ width: '150px' }} className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingKV ? (
                        <tr>
                          <td colSpan={3} className="text-center py-5">
                            <RefreshCw className="spinner" /> Loading KV records...
                          </td>
                        </tr>
                      ) : kvData.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-5">
                            No records found.
                          </td>
                        </tr>
                      ) : kvData.map(item => (
                        <tr key={item.Key}>
                          <td className="code-font font-weight-bold" style={{ color: 'var(--color-cyan)' }}>{item.Key}</td>
                          <td className="code-font text-muted">
                            {item.Value.length > 80 ? item.Value.substring(0, 80) + '...' : item.Value}
                          </td>
                          <td className="text-right">
                            <button className="btn-action btn-edit mr-2" onClick={() => {
                              setKvEditKey(item.Key);
                              setKvEditVal(item.Value);
                              setShowKVModal(true);
                            }}>
                              <Edit size={14} />
                            </button>
                            <button className="btn-action btn-delete" onClick={() => deleteKV(item.Key)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Document Collections */}
        {activeTab === 'docs' && (
          <div className="tab-content">
            <div className="doc-layout">
              {/* Collection list */}
              <div className="doc-sidebar dashboard-panel">
                <div className="panel-header">
                  <h3>Collections</h3>
                </div>
                <div className="panel-body">
                  <button className="btn btn-sm btn-primary-outline w-full mb-3" onClick={createCollection}>
                    <Plus size={14} /> Create Collection
                  </button>
                  <div className="collections-list">
                    {collections.map(col => (
                      <button 
                        key={col} 
                        className={`collection-item ${activeCollection === col ? 'active' : ''}`}
                        onClick={() => setActiveCollection(col)}
                      >
                        <span><Folder size={14} /> {col}</span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents table */}
              <div className="doc-main dashboard-panel">
                <div className="panel-header">
                  <div className="search-bar flex-grow-1 mr-3">
                    <Search size={16} />
                    <input 
                      type="text" 
                      placeholder='Filter query JSON, e.g. {"profile.role": "admin"}' 
                      value={docQuery}
                      onChange={(e) => setDocQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={fetchDocuments}>
                      <Play size={14} /> Query
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                      if (!activeCollection) return;
                      setDocEditId('');
                      setDocEditJson(JSON.stringify({ name: 'New Document', active: true }, null, 2));
                      setShowDocModal(true);
                    }}>
                      <Plus size={14} /> Add Doc
                    </button>
                  </div>
                </div>
                <div className="panel-body p-0">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '200px' }}>ID</th>
                          <th>Document Payload</th>
                          <th style={{ width: '150px' }} className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDocs ? (
                          <tr>
                            <td colSpan={3} className="text-center py-5">
                              <RefreshCw className="spinner" /> Querying collection...
                            </td>
                          </tr>
                        ) : documents.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center text-muted py-5">
                              No matching documents. Select a collection or clear your query filter.
                            </td>
                          </tr>
                        ) : documents.map(doc => {
                          const id = doc._id || '';
                          return (
                            <tr key={id}>
                              <td className="code-font font-weight-bold" style={{ color: 'var(--color-purple)' }}>{id}</td>
                              <td className="code-font text-muted">
                                {JSON.stringify(doc).length > 80 ? JSON.stringify(doc).substring(0, 80) + '...' : JSON.stringify(doc)}
                              </td>
                              <td className="text-right">
                                <button className="btn-action btn-edit mr-2" onClick={() => {
                                  setDocEditId(id);
                                  setDocEditJson(JSON.stringify(doc, null, 2));
                                  setShowDocModal(true);
                                }}>
                                  <Edit size={14} />
                                </button>
                                <button className="btn-action btn-delete" onClick={() => deleteDoc(id)}>
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Interactive API Console */}
        {activeTab === 'console' && (
          <div className="tab-content">
            <div className="console-grid">
              <div className="dashboard-panel">
                <div className="panel-header">
                  <h3>HTTP Request Builder</h3>
                </div>
                <div className="panel-body">
                  <div className="form-group">
                    <label>Method & Endpoint</label>
                    <div className="input-group">
                      <select 
                        value={consoleMethod} 
                        onChange={(e: any) => setConsoleMethod(e.target.value)}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                      <input 
                        type="text" 
                        value={consolePath}
                        onChange={(e) => setConsolePath(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>JSON Body Payload (POST only)</label>
                    <textarea 
                      rows={8} 
                      className="code-font"
                      value={consoleBody}
                      onChange={(e) => setConsoleBody(e.target.value)}
                      disabled={consoleMethod === 'GET' || consoleMethod === 'DELETE'}
                      style={{ opacity: (consoleMethod === 'GET' || consoleMethod === 'DELETE') ? 0.4 : 1 }}
                    />
                  </div>

                  <button className="btn btn-primary w-full" onClick={runConsoleQuery}>
                    <Terminal size={14} /> Send API Request
                  </button>
                </div>
              </div>

              {/* Console Output */}
              <div className="dashboard-panel console-output-panel">
                <div className="panel-header">
                  <h3>Response Payload</h3>
                  <div className="flex gap-3 align-center">
                    <span className={`status-badge ${consoleStatus.includes('200') ? 'status-200' : 'status-404'}`}>
                      {consoleStatus}
                    </span>
                    <span className="time-badge">{consoleTime}</span>
                  </div>
                </div>
                <div className="panel-body p-0">
                  <pre className="console-output code-font">
                    {consoleResponse}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: API Docs & Hosting */}
        {activeTab === 'api-docs' && (
          <div className="tab-content">
            <div className="dashboard-grid">
              {/* SDK Guides */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <h3>Client Code Integration</h3>
                </div>
                <div className="panel-body">
                  <p className="mb-4 text-sm text-secondary">
                    Call AroraDB directly from your programs and automated workflows using standard libraries.
                  </p>
                  <div className="doc-tabs">
                    <button className={`doc-tab-btn ${codeLang === 'curl' ? 'active' : ''}`} onClick={() => setCodeLang('curl')}>cURL</button>
                    <button className={`doc-tab-btn ${codeLang === 'js' ? 'active' : ''}`} onClick={() => setCodeLang('js')}>JavaScript</button>
                    <button className={`doc-tab-btn ${codeLang === 'python' ? 'active' : ''}`} onClick={() => setCodeLang('python')}>Python</button>
                  </div>

                  <div className="doc-code-block" style={{ position: 'relative' }}>
                    <button 
                      onClick={copyToClipboard}
                      style={{
                        position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', 
                        color: 'var(--text-secondary)', cursor: 'pointer', padding: '5px'
                      }}
                    >
                      {copiedCode ? <CheckCircle size={16} style={{ color: 'var(--color-green)' }} /> : <Clipboard size={16} />}
                    </button>
                    <pre className="code-font" style={{ fontSize: '0.8rem' }}>{getCodeSnippet()}</pre>
                  </div>
                </div>
              </div>

              {/* Hosting Guide */}
              <div className="dashboard-panel">
                <div className="panel-header">
                  <h3>Self-Hosting Guide</h3>
                </div>
                <div className="panel-body">
                  <p className="mb-3 text-sm text-secondary">
                    Deploy AroraDB on your own architecture in minutes.
                  </p>

                  <h4>1. Quickstart Docker</h4>
                  <p className="text-sm text-muted">Instantly spin up AroraDB with persistent volume mounts:</p>
                  <div className="doc-code-block mini">
                    <pre className="code-font" style={{ fontSize: '0.75rem' }}>
                      {`docker run -d -p 8080:8080 \\
  -v aroradb_data:/data \\
  -e ARORADB_TOKEN=my-secure-token \\
  bhawuk/aroradb:latest`}
                    </pre>
                  </div>

                  <h4 className="mt-3">2. Systemd Service</h4>
                  <p className="text-sm text-muted">Create a service descriptor at `/etc/systemd/system/aroradb.service`:</p>
                  <div className="doc-code-block mini">
                    <pre className="code-font" style={{ fontSize: '0.75rem' }}>
                      {`[Unit]
Description=AroraDB Service
After=network.target

[Service]
ExecStart=/usr/local/bin/aroradb -port 8080 -dir /var/lib/aroradb -token my-secure-token
Restart=always
User=dbuser

[Install]
WantedBy=multi-user.target`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: KV Creator */}
      {showKVModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{kvEditKey ? 'Edit Key' : 'Create Key'}</h3>
              <button className="btn-close-modal" onClick={() => setShowKVModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Key Name</label>
                <input 
                  type="text" 
                  value={kvEditKey} 
                  onChange={(e) => setKvEditKey(e.target.value)} 
                  disabled={!!kvEditKey} 
                  placeholder="user:100:profile"
                />
              </div>
              <div className="form-group">
                <label>Value Payload</label>
                <textarea 
                  rows={6}
                  value={kvEditVal} 
                  onChange={(e) => setKvEditVal(e.target.value)} 
                  className="code-font"
                  placeholder="Text details or JSON document..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowKVModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveKV}>Save Key</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Document Editor */}
      {showDocModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{docEditId ? 'Edit Document' : 'New Document'}</h3>
              <button className="btn-close-modal" onClick={() => setShowDocModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Document ID (Optional)</label>
                <input 
                  type="text" 
                  value={docEditId} 
                  onChange={(e) => setDocEditId(e.target.value)} 
                  disabled={!!docEditId} 
                  placeholder="Leave empty to auto-generate..."
                />
              </div>
              <div className="form-group">
                <label>JSON Structure</label>
                <textarea 
                  rows={8}
                  value={docEditJson} 
                  onChange={(e) => setDocEditJson(e.target.value)} 
                  className="code-font"
                  placeholder="JSON values..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveDocument}>Save Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
