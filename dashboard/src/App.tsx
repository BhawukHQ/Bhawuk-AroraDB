import { useState, useEffect } from 'react';
import { 
  Activity, Database, FileCode, BookOpen, 
  RefreshCw, Plus, Trash2, Edit, Search, 
  Folder, Play, ChevronRight, X, Clipboard, CheckCircle,
  Download, Upload, AlignLeft, Sliders, Server, Info,
  Table, Cpu, Shield, ShieldCheck, Lock, LogOut, UserCheck, PlayCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
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

interface LogEntry {
  timestamp: string;
  message: string;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  target: string;
  user: string;
  details: string;
}

interface ChartDataPoint {
  time: string;
  ops: number;
  mem: number;
}

interface Notification {
  message: string;
  type: 'success' | 'warning' | 'error';
  id: number;
}

interface QueryRule {
  field: string;
  op: string;
  value: string;
}

interface ColumnDefinition {
  name: string;
  type: string;
}

interface SchemaInfo {
  table_name: string;
  columns: ColumnDefinition[];
  row_count: number;
}

interface SQLResult {
  columns: string[];
  rows: any[][];
  message: string;
}

type UserRole = 'admin_proj' | 'admin_db' | 'user_db' | 'visitor';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'kv' | 'docs' | 'sql' | 'logs' | 'api-docs'>('overview');
  
  // Auth Session state
  const [token, setToken] = useState(localStorage.getItem('arora_token') || '');
  const [userRole, setUserRole] = useState<UserRole>((localStorage.getItem('arora_role') as UserRole) || 'visitor');
  const [username, setUsername] = useState(localStorage.getItem('arora_username') || '');
  
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [isConnected, setIsConnected] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  // Dark / Light theme toggle
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem('arora_theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('arora_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('arora_theme', 'light');
    }
  }, [isDark]);

  // Telemetry Telemetry
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(
    Array(20).fill(0).map((_, i) => ({ time: `:${i * 2}s`, ops: 0, mem: 0 }))
  );
  const [metricsTimeframe, setMetricsTimeframe] = useState<'1m' | '5m' | '15m'>('1m');

  // KV Store
  const [kvSearch, setKvSearch] = useState('');
  const [kvData, setKvData] = useState<KeyVal[]>([]);
  const [loadingKV, setLoadingKV] = useState(false);
  const [showKVModal, setShowKVModal] = useState(false);
  const [kvEditKey, setKvEditKey] = useState('');
  const [kvEditVal, setKvEditVal] = useState('');
  const [selectedKV, setSelectedKV] = useState<KeyVal | null>(null);
  const [kvPage, setKvPage] = useState(1);
  const kvPageSize = 10;

  // Documents
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [docQuery, setDocQuery] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docEditId, setDocEditId] = useState('');
  const [docEditJson, setDocEditJson] = useState('');
  
  // Query Builder State
  const [qbRules, setQbRules] = useState<QueryRule[]>([]);
  const [qbField, setQbField] = useState('');
  const [qbOp, setQbOp] = useState('$eq');
  const [qbVal, setQbVal] = useState('');

  // SQL Engine State
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM users;');
  const [sqlResult, setSqlResult] = useState<SQLResult | null>(null);
  const [sqlTables, setSqlTables] = useState<SchemaInfo[]>([]);
  const [loadingSQL, setLoadingSQL] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string>('');

  // Logs Explorer
  const [sysLogs, setSysLogs] = useState<LogEntry[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsLevel, setLogsLevel] = useState<'ALL' | 'HTTP' | 'SYSTEM' | 'ERROR'>('ALL');
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);

  // Security Audit Log (NEW in v4.0)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [autoScrollAudit, setAutoScrollAudit] = useState(true);

  // Dev Integration
  const [codeLang, setCodeLang] = useState<'curl' | 'js' | 'python'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  // Backup & Restore
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch utilities with Token
  const aroraFetch = async (path: string, options: RequestInit = {}) => {
    options.headers = options.headers || {};
    if (token) {
      (options.headers as any)['X-Arora-Token'] = token;
    }
    try {
      const res = await fetch(path, options);
      if (res.status === 401) {
        // If session expired, auto logout
        if (token) {
          addNotification('Session expired. Please log in again.', 'error');
          handleClientLogout();
        }
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
    }, 4500);
  };

  // Poll metrics, logs, and audit logs
  useEffect(() => {
    if (!token) return;

    const shouldPollMetrics = activeTab === 'overview';
    const shouldPollLogs = activeTab === 'logs' && userRole === 'admin_proj';
    const shouldPollAudit = activeTab === 'overview' && userRole === 'admin_proj';

    const getMetrics = async () => {
      try {
        const res = await aroraFetch('/api/metrics');
        if (res.ok) {
          const data: TelemetryMetrics = await res.json();
          setMetrics(data);

          const totalOps = data.system.read_rate + data.system.write_rate;
          const memoryAlloc = data.system.allocated_mem_mb;
          const secondsStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newPoint = { time: secondsStr, ops: totalOps, mem: Number(memoryAlloc.toFixed(1)) };
          setChartData(prev => {
            const next = [...prev, newPoint];
            if (next.length > 120) next.shift(); // keep max 120 points
            return next;
          });
        }
      } catch (err) {
        // silent
      }
    };

    const getLogs = async () => {
      if (!shouldPollLogs) return;
      try {
        const res = await aroraFetch('/api/logs');
        if (res.ok) {
          const data: LogEntry[] = await res.json();
          setSysLogs(data || []);
        }
      } catch (err) {}
    };

    const getAuditLogs = async () => {
      if (!shouldPollAudit) return;
      try {
        const res = await aroraFetch('/api/admin/audit');
        if (res.ok) {
          const data: AuditEntry[] = await res.json();
          setAuditLogs(data || []);
        }
      } catch (err) {}
    };

    if (shouldPollMetrics) getMetrics();
    if (shouldPollLogs) getLogs();
    if (shouldPollAudit) getAuditLogs();

    const intervalVal = metricsTimeframe === '1m' ? 2000 : metricsTimeframe === '5m' ? 6000 : 18000;
    const metricsInterval = shouldPollMetrics ? setInterval(getMetrics, intervalVal) : null;
    const logsInterval = shouldPollLogs ? setInterval(getLogs, 2500) : null;
    const auditInterval = shouldPollAudit ? setInterval(getAuditLogs, 2500) : null;

    return () => {
      if (metricsInterval) clearInterval(metricsInterval);
      if (logsInterval) clearInterval(logsInterval);
      if (auditInterval) clearInterval(auditInterval);
    };
  }, [token, metricsTimeframe, activeTab, userRole]);


  // Load tabs-specific data
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'kv') {
      loadKVData();
    } else if (activeTab === 'docs') {
      loadCollections();
    } else if (activeTab === 'sql') {
      loadSQLTables();
    }
  }, [activeTab, token]);

  // KV operations
  const loadKVData = async () => {
    if (userRole === 'visitor') return;
    setLoadingKV(true);
    try {
      const res = await aroraFetch(`/api/kv?prefix=${encodeURIComponent(kvSearch)}`);
      if (res.ok) {
        const data: KeyVal[] = await res.json();
        setKvData(data ? data.filter(item => !item.Key.startsWith('doc:') && !item.Key.startsWith('sql:')) : []);
        setKvPage(1);
      }
    } catch (err) {
      addNotification('Failed to retrieve KV records.', 'error');
    } finally {
      setLoadingKV(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'kv') {
      const timer = setTimeout(loadKVData, 300);
      return () => clearTimeout(timer);
    }
  }, [kvSearch]);

  const saveKV = async () => {
    if (userRole === 'user_db' || userRole === 'visitor') {
      addNotification('Permission Denied: Database users cannot write keys.', 'error');
      return;
    }
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
    if (userRole === 'user_db' || userRole === 'visitor') {
      addNotification('Permission Denied: Database users cannot delete keys.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to delete key "${key}"?`)) return;
    try {
      const res = await aroraFetch(`/api/kv/${encodeURIComponent(key)}`, { method: 'DELETE' });
      if (res.ok) {
        addNotification(`Key "${key}" deleted.`, 'success');
        if (selectedKV?.Key === key) setSelectedKV(null);
        loadKVData();
      }
    } catch (err) {
      addNotification('Failed to delete key.', 'error');
    }
  };

  // Document operations
  const loadCollections = async () => {
    if (userRole === 'visitor') return;
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
    if (!activeCollection || userRole === 'visitor') return;
    setLoadingDocs(true);
    try {
      let res;
      if (docQuery.trim()) {
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
    if (userRole === 'user_db' || userRole === 'visitor') {
      addNotification('Permission Denied: Database users cannot write documents.', 'error');
      return;
    }
    try {
      JSON.parse(docEditJson);
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
    if (userRole === 'user_db' || userRole === 'visitor') {
      addNotification('Permission Denied: Database users cannot delete documents.', 'error');
      return;
    }
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
    if (userRole === 'user_db' || userRole === 'visitor') {
      addNotification('Permission Denied: Database users cannot create collections.', 'error');
      return;
    }
    const colName = prompt('Enter new collection name:');
    if (!colName) return;
    const cleanColName = colName.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanColName) {
      addNotification('Invalid collection name.', 'error');
      return;
    }
    setActiveCollection(cleanColName);
    aroraFetch(`/api/documents/${cleanColName}?id=init_meta`, {
      method: 'POST',
      body: JSON.stringify({ description: 'Collection initialized', _id: 'init_meta' })
    }).then(() => {
      loadCollections();
    });
  };

  // SQL Operations
  const loadSQLTables = async () => {
    if (userRole === 'visitor') return;
    try {
      const res = await aroraFetch('/api/sql/tables');
      if (res.ok) {
        const data: SchemaInfo[] = await res.json();
        setSqlTables(data || []);
      }
    } catch (err) {
      addNotification('Failed to retrieve SQL metadata.', 'error');
    }
  };

  // Visual SQL browser helper: Single click query execution
  const viewSQLTableData = (tableName: string) => {
    const query = `SELECT * FROM ${tableName};`;
    setSqlQuery(query);
    setSqlQueryAndRun(query);
  };

  const setSqlQueryAndRun = async (query: string) => {
    setLoadingSQL(true);
    setSqlError('');
    setSqlResult(null);

    try {
      const res = await aroraFetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (res.ok) {
        setSqlResult(data);
      } else {
        setSqlError(data.error || 'SQL execution failed.');
      }
    } catch (err: any) {
      setSqlError('Failed to communicate with SQL engine: ' + err.message);
    } finally {
      setLoadingSQL(false);
    }
  };

  const runSQLQuery = () => {
    setSqlQueryAndRun(sqlQuery);
  };

  // Session Authentication triggers
  const handleClientLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setLoadingLogin(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUserRole(data.role);
        setUsername(loginUser);
        
        localStorage.setItem('arora_token', data.token);
        localStorage.setItem('arora_role', data.role);
        localStorage.setItem('arora_username', loginUser);

        addNotification(`Welcome back, ${loginUser}!`, 'success');
        setActiveTab('overview');
      } else {
        setLoginError(data.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setLoginError('Failed to establish connection to server: ' + err.message);
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleClientLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Arora-Token': token }
      });
    } catch {}

    // Clear local storage
    setToken('');
    setUserRole('visitor');
    setUsername('');
    localStorage.removeItem('arora_token');
    localStorage.removeItem('arora_role');
    localStorage.removeItem('arora_username');
    
    setLoginUser('');
    setLoginPass('');
    setSqlResult(null);
    setSqlError('');
    addNotification('Logged out successfully.', 'success');
  };

  // Compaction
  const runCompaction = async () => {
    if (userRole !== 'admin_proj') {
      addNotification('Permission Denied: Project Admins only.', 'error');
      return;
    }
    setIsCompacting(true);
    try {
      const res = await aroraFetch('/api/admin/compact', { method: 'POST' });
      if (res.ok) {
        addNotification('Database compaction completed. Stale logs purged.', 'success');
      }
    } catch (err) {
      addNotification('Failed to execute database compaction.', 'error');
    } finally {
      setIsCompacting(false);
    }
  };

  // Backup & Restore
  const triggerBackup = () => {
    if (userRole !== 'admin_proj') {
      addNotification('Permission Denied: Project Admins only.', 'error');
      return;
    }
    const url = `/api/admin/backup${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.location.href = url;
    addNotification('Downloading database backup archive...', 'success');
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin_proj') {
      addNotification('Permission Denied: Project Admins only.', 'error');
      return;
    }
    if (!restoreFile) {
      addNotification('Please select a backup zip file first.', 'warning');
      return;
    }

    if (!confirm('WARNING: Restoring will overwrite ALL current database records. Proceed?')) return;
    
    setIsRestoring(true);
    const formData = new FormData();
    formData.append('backup', restoreFile);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['X-Arora-Token'] = token;
      }
      
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        addNotification('Database restore complete! Hot-reload loaded successfully.', 'success');
        setRestoreFile(null);
        if (activeTab === 'kv') loadKVData();
        else if (activeTab === 'docs') loadCollections();
        else if (activeTab === 'sql') loadSQLTables();
      } else {
        const data = await res.json();
        addNotification(data.error || 'Restore failed.', 'error');
      }
    } catch (err) {
      addNotification('Failed to upload and restore backup.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Query Builder helper additions
  const addQueryRule = () => {
    if (!qbField.trim()) {
      addNotification('Field path cannot be empty.', 'warning');
      return;
    }
    if (!qbVal.trim()) {
      addNotification('Value field cannot be empty.', 'warning');
      return;
    }
    const newRule: QueryRule = { field: qbField, op: qbOp, value: qbVal };
    setQbRules(prev => [...prev, newRule]);
    compileRulesToQuery([...qbRules, newRule]);
    setQbField('');
    setQbVal('');
  };

  const removeQueryRule = (idx: number) => {
    const updated = qbRules.filter((_, i) => i !== idx);
    setQbRules(updated);
    compileRulesToQuery(updated);
  };

  const compileRulesToQuery = (rules: QueryRule[]) => {
    if (rules.length === 0) {
      setDocQuery('');
      return;
    }
    const filterObj: Record<string, any> = {};
    rules.forEach(rule => {
      let parsedVal: any = rule.value;
      if (rule.value === 'true') parsedVal = true;
      else if (rule.value === 'false') parsedVal = false;
      else if (!isNaN(Number(rule.value)) && rule.value.trim() !== '') parsedVal = Number(rule.value);
      else if (rule.value.startsWith('[') && rule.value.endsWith(']')) {
        try {
          parsedVal = JSON.parse(rule.value);
        } catch {
          parsedVal = rule.value;
        }
      }

      if (rule.op === '$eq') {
        filterObj[rule.field] = parsedVal;
      } else {
        filterObj[rule.field] = filterObj[rule.field] || {};
        filterObj[rule.field][rule.op] = parsedVal;
      }
    });
    setDocQuery(JSON.stringify(filterObj, null, 2));
  };

  const clearQueryBuilder = () => {
    setQbRules([]);
    setDocQuery('');
  };

  // Code snippets generator
  const getCodeSnippet = () => {
    const host = window.location.origin;
    const tokenHeader = token ? ` -H "X-Arora-Token: ${token}"` : '';
    const tokenHeaderJS = token ? `, 'X-Arora-Token': '${token}'` : '';

    if (codeLang === 'curl') {
      return `# Execute SQL statement
curl -X POST ${host}/api/sql${tokenHeader} \\
  -H "Content-Type: application/json" \\
  -d '{"query": "SELECT * FROM users WHERE age > 25"}'

# Fetch database metrics
curl ${host}/api/metrics${tokenHeader}

# Save Document to Collection
curl -X POST ${host}/api/documents/users${tokenHeader} \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Alice", "role": "admin"}'`;
    }

    if (codeLang === 'js') {
      return `// JS SQL Query
async function querySQL() {
  const res = await fetch('${host}/api/sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'${tokenHeaderJS}
    },
    body: JSON.stringify({ query: 'SELECT * FROM users WHERE age > 25' })
  });
  console.log(await res.json());
}`;
    }

    return `import requests

# Set Token if active
headers = {}
${token ? `headers['X-Arora-Token'] = '${token}'` : '# No authentication configured'}

# Run SELECT Query
payload = {"query": "SELECT * FROM users WHERE age > 25"}
res = requests.post('${host}/api/sql', json=payload, headers=headers)
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

  // Filter logs based on filters
  const filteredLogs = sysLogs.filter(log => {
    const textMatch = log.message.toLowerCase().includes(logsSearch.toLowerCase());
    if (!textMatch) return false;
    
    if (logsLevel === 'ALL') return true;
    if (logsLevel === 'ERROR') return log.message.toLowerCase().includes('error') || log.message.toLowerCase().includes('critical');
    if (logsLevel === 'HTTP') return log.message.includes('GET ') || log.message.includes('POST ') || log.message.includes('DELETE ');
    if (logsLevel === 'SYSTEM') return !log.message.includes('GET ') && !log.message.includes('POST ') && !log.message.includes('DELETE ');
    return true;
  });

  const totalKVPages = Math.ceil(kvData.length / kvPageSize) || 1;
  const paginatedKVData = kvData.slice((kvPage - 1) * kvPageSize, kvPage * kvPageSize);

  // Gated Login View if not authenticated
  if (!token) {
    return (
      <div className="login-container" style={{
        display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center',
        background: '#070913', position: 'relative', overflow: 'hidden'
      }}>
        <div className="glow-bg glow-purple" style={{ top: '-10%', left: '-10%', width: '60vw', height: '60vh' }}></div>
        <div className="glow-bg glow-cyan" style={{ bottom: '-10%', right: '-10%', width: '60vw', height: '60vh' }}></div>

        <div className="login-card" style={{
          width: '420px', padding: '2.5rem', background: 'rgba(18, 22, 35, 0.65)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1.5rem'
        }}>
          <div className="text-center">
            <div className="logo-icon" style={{ margin: '0 auto 1rem auto', width: '48px', height: '48px', borderRadius: '14px' }}>
              <Cpu size={24} style={{ color: '#070913' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>AroraDB Server</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Enterprise Hybrid DB Console v4.0</p>
          </div>

          {loginError && (
            <div className="sql-error-box code-font" style={{ color: '#ff5555', padding: '0.75rem 1rem', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,85,85,0.1)' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleClientLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                placeholder="e.g. owner" 
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glow)', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glow)', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={loadingLogin} style={{ padding: '0.75rem' }}>
              {loadingLogin ? <RefreshCw size={16} className="spinner" /> : 'Authenticate Session'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Demo Account Roles:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }} onClick={() => { setLoginUser('owner'); setLoginPass('admin123'); }}>owner (Admin)</button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }} onClick={() => { setLoginUser('dba'); setLoginPass('dba123'); }}>dba (DBA)</button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }} onClick={() => { setLoginUser('dev'); setLoginPass('dev123'); }}>dev (User)</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="glow-bg glow-purple"></div>
      <div className="glow-bg glow-cyan"></div>

      {/* Notifications Drawer */}
      <div className="notifications-container">
        {notifications.map(n => (
          <div key={n.id} className={`notification-toast toast-${n.type}`}>
            <Info size={16} />
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="logo-area">
          <div className="logo-icon">
            <Cpu size={22} />
          </div>
          <div className="logo-text">
            <h1>AroraDB</h1>
            <span>v4.0.0</span>
          </div>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} /> Telemetry
          </button>
          
          {userRole !== 'visitor' && (
            <>
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
                className={`nav-item ${activeTab === 'sql' ? 'active' : ''}`}
                onClick={() => setActiveTab('sql')}
              >
                <Table size={18} /> SQL Workspace
              </button>
            </>
          )}

          {userRole === 'admin_proj' && (
            <button 
              className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <AlignLeft size={18} /> System Logs
            </button>
          )}
          
          {userRole !== 'visitor' && (
            <button 
              className={`nav-item ${activeTab === 'api-docs' ? 'active' : ''}`}
              onClick={() => setActiveTab('api-docs')}
            >
              <BookOpen size={18} /> Documentation
            </button>
          )}
        </nav>

        {/* Privacy Policy toggle */}
        <button 
          className="btn btn-secondary btn-sm mb-3 w-full"
          onClick={() => setShowPrivacyModal(true)}
          style={{ fontSize: '0.8rem', background: 'none', borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <Lock size={12} style={{ marginRight: '4px' }} /> Privacy Policy
        </button>

        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></div>
          <div className="status-info">
            <p>{isConnected ? 'Connected' : 'Offline'}</p>
            <span>{window.location.host}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        <header className="top-bar">
          <h2>
            {activeTab === 'overview' && 'System Telemetry & Telemetry'}
            {activeTab === 'kv' && 'Key-Value Store Browser'}
            {activeTab === 'docs' && 'Document Collection Explorer'}
            {activeTab === 'sql' && 'SQL Database Workspace'}
            {activeTab === 'logs' && 'Real-time System Logs Console'}
            {activeTab === 'api-docs' && 'Database Integration Guides'}
          </h2>
          
          <div className="auth-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* User details badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-glow)' }}>
              <UserCheck size={14} style={{ color: 'var(--color-cyan)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span className="code-font" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{username}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-purple)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.15rem' }}>
                  {userRole === 'admin_proj' && 'Project Admin'}
                  {userRole === 'admin_db' && 'DB Admin (DBA)'}
                  {userRole === 'user_db' && 'DB User'}
                  {userRole === 'visitor' && 'Visitor'}
                </span>
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleClientLogout}>
              <LogOut size={14} /> Log Out
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsDark(!isDark)} title="Toggle theme">
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
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
                  <h3>Active Keys</h3>
                  <p>{metrics?.key_count.toLocaleString() ?? '0'}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon cyan">
                  <Activity size={20} />
                </div>
                <div className="stat-details">
                  <h3>Logical Size</h3>
                  <p>{formatBytes(metrics?.db_size_bytes ?? 0)}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">
                  <FileCode size={20} />
                </div>
                <div className="stat-details">
                  <h3>Catalog Files</h3>
                  <p>{metrics?.file_count ?? '0'}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <Server size={20} />
                </div>
                <div className="stat-details">
                  <h3>RAM Footprint</h3>
                  <p>{metrics?.system.allocated_mem_mb.toFixed(2) ?? '0.00'} MB</p>
                </div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: (userRole === 'admin_proj' ? '2fr 1.2fr' : '1fr'), display: 'grid', gap: '1.5rem' }}>
              {/* Telemetry charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="dashboard-panel" style={{ marginBottom: 0 }}>
                  <div className="panel-header">
                    <h3>Telemetry Charts</h3>
                    <div className="flex gap-2">
                      <button 
                        className={`btn btn-sm ${metricsTimeframe === '1m' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMetricsTimeframe('1m')}
                      >1m</button>
                      <button 
                        className={`btn btn-sm ${metricsTimeframe === '5m' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMetricsTimeframe('5m')}
                      >5m</button>
                      <button 
                        className={`btn btn-sm ${metricsTimeframe === '15m' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMetricsTimeframe('15m')}
                      >15m</button>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-purple)" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="var(--color-purple)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={9} />
                          <Tooltip contentStyle={{ background: '#07080c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }} />
                          <Area name="Ops/sec" type="monotone" dataKey="ops" stroke="var(--color-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorOps)" />
                          <Area name="RAM (MB)" type="monotone" dataKey="mem" stroke="var(--color-purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" />
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

                {/* Audit logs terminal (Project Admin only) */}
                {userRole === 'admin_proj' && (
                  <div className="dashboard-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: 0, minHeight: '300px' }}>
                    <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                      <h3><Shield size={16} /> Live Project Activity Audit Feed</h3>
                      <label className="flex gap-2 align-center code-font text-xs text-muted" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoScrollAudit} onChange={(e) => setAutoScrollAudit(e.target.checked)} />
                        Auto-Scroll
                      </label>
                    </div>
                    <div className="panel-body p-0" style={{ flexGrow: 1, position: 'relative', background: '#030406', minHeight: '220px' }}>
                      <div className="logs-terminal code-font" style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        padding: '1rem 1.5rem', overflowY: 'auto', fontSize: '0.8rem', lineHeight: 1.5,
                        display: 'flex', flexDirection: 'column', gap: '0.35rem'
                      }}>
                        {auditLogs.map((entry, idx) => (
                          <div key={idx} style={{ color: entry.action.includes('LOGIN') || entry.action.includes('LOGOUT') ? 'var(--color-purple)' : entry.action.includes('PUT') || entry.action.includes('EXECUTE') ? 'var(--color-cyan)' : '#ff5555' }}>
                            <span style={{ color: '#4f5e71', marginRight: '0.5rem' }}>
                              [{new Date(entry.timestamp).toLocaleTimeString()}]
                            </span>
                            <strong style={{ color: '#fff', marginRight: '0.5rem' }}>{entry.user}</strong>
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', marginRight: '0.5rem' }}>{entry.action}</span>
                            {entry.details}
                          </div>
                        ))}
                        {auditLogs.length === 0 && (
                          <div className="text-center text-muted py-5" style={{ margin: 'auto' }}>No operations logged yet.</div>
                        )}
                        {autoScrollAudit && <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Maintenance & Backups (Project Admin Only) */}
              {userRole === 'admin_proj' && (
                <div className="dashboard-panel" style={{ height: 'fit-content', marginBottom: 0 }}>
                  <div className="panel-header">
                    <h3>Operations & backups</h3>
                  </div>
                  <div className="panel-body">
                    <div className="sys-info-list">
                      <div className="info-row">
                        <span>Compaction Ratio:</span>
                        <strong>{metrics?.compaction_ratio.toFixed(3) ?? '1.000'}</strong>
                      </div>
                      <div className="info-row">
                        <span>Goroutines:</span>
                        <strong>{metrics?.system.num_goroutines ?? 0}</strong>
                      </div>
                    </div>
                    
                    <div className="flex flex-column gap-3 mt-3">
                      <button 
                        className="btn btn-secondary w-full"
                        onClick={triggerBackup}
                      >
                        <Download size={14} /> Download Backup
                      </button>
                      
                      <form onSubmit={handleRestoreSubmit} className="flex gap-2 align-center w-full">
                        <input 
                          type="file" 
                          accept=".zip" 
                          onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                          style={{ display: 'none' }}
                          id="restore-file-upload"
                        />
                        <label htmlFor="restore-file-upload" className="btn btn-secondary flex-grow-1" style={{ cursor: 'pointer' }}>
                          {restoreFile ? restoreFile.name : 'Select Zip Backup'}
                        </label>
                        <button 
                          type="submit" 
                          className="btn btn-primary-outline"
                          disabled={isRestoring}
                        >
                          {isRestoring ? <RefreshCw size={14} className="spinner" /> : <Upload size={14} />} Restore
                        </button>
                      </form>

                      <button 
                        className="btn btn-glow-purple w-full"
                        disabled={isCompacting}
                        onClick={runCompaction}
                      >
                        {isCompacting ? <RefreshCw size={14} className="spinner" /> : <RefreshCw size={14} />} Compaction
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: KV Store */}
        {activeTab === 'kv' && userRole !== 'visitor' && (
          <div className="tab-content">
            <div className="kv-view-split" style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
              <div className="kv-main-panel" style={{ flexGrow: 1, minWidth: 0 }}>
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
                    
                    {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                      <button className="btn btn-primary" onClick={() => {
                        setKvEditKey('');
                        setKvEditVal('');
                        setShowKVModal(true);
                      }}>
                        <Plus size={16} /> Add Key
                      </button>
                    )}
                  </div>
                  <div className="panel-body p-0">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Value Preview</th>
                            {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                              <th style={{ width: '150px' }} className="text-right">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {loadingKV ? (
                            <tr>
                              <td colSpan={3} className="text-center py-5">
                                <RefreshCw className="spinner" /> Loading KV records...
                              </td>
                            </tr>
                          ) : paginatedKVData.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center text-muted py-5">
                                No records found.
                              </td>
                            </tr>
                          ) : paginatedKVData.map(item => (
                            <tr 
                              key={item.Key} 
                              className={selectedKV?.Key === item.Key ? 'selected-row' : ''}
                              onClick={() => setSelectedKV(item)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="code-font font-weight-bold" style={{ color: 'var(--color-cyan)' }}>{item.Key}</td>
                              <td className="code-font text-muted">
                                {item.Value.length > 50 ? item.Value.substring(0, 50) + '...' : item.Value}
                              </td>
                              
                              {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                                <td className="text-right" onClick={(e) => e.stopPropagation()}>
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
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalKVPages > 1 && (
                      <div className="pagination-bar" style={{ display: 'flex', justifySelf: 'end', padding: '1rem 1.5rem', gap: '0.5rem', borderTop: '1px solid var(--border-glow)' }}>
                        <button className="btn btn-secondary btn-sm" disabled={kvPage === 1} onClick={() => setKvPage(p => p - 1)}>Prev</button>
                        <span className="code-font" style={{ alignSelf: 'center', fontSize: '0.85rem' }}>Page {kvPage} of {totalKVPages}</span>
                        <button className="btn btn-secondary btn-sm" disabled={kvPage === totalKVPages} onClick={() => setKvPage(p => p + 1)}>Next</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Side Detail Panel (UX Upgrade) */}
              {selectedKV && (
                <div className="kv-side-sheet dashboard-panel" style={{ width: '380px', flexShrink: 0, height: 'fit-content' }}>
                  <div className="panel-header">
                    <h3 style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Detail: {selectedKV.Key}</h3>
                    <button className="btn-close-modal" onClick={() => setSelectedKV(null)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="panel-body">
                    <div className="form-group">
                      <label>Payload Size</label>
                      <span className="code-font text-muted" style={{ fontSize: '0.85rem' }}>{selectedKV.Value.length} bytes</span>
                    </div>
                    <div className="form-group">
                      <label>Raw Value</label>
                      <pre className="code-font" style={{
                        background: '#040507', padding: '1rem', borderRadius: '8px', 
                        overflowX: 'auto', maxHeight: '300px', fontSize: '0.8rem', color: '#dfdfe5',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {selectedKV.Value}
                      </pre>
                    </div>
                    
                    <div className="flex gap-2">
                      {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                        <button className="btn btn-primary-outline w-full" onClick={() => {
                          setKvEditKey(selectedKV.Key);
                          setKvEditVal(selectedKV.Value);
                          setShowKVModal(true);
                        }}>Edit</button>
                      )}
                      <button className="btn btn-secondary" onClick={() => {
                        navigator.clipboard.writeText(selectedKV.Value);
                        addNotification('Copied value to clipboard.', 'success');
                      }}>Copy</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: Document Collections */}
        {activeTab === 'docs' && userRole !== 'visitor' && (
          <div className="tab-content">
            <div className="doc-layout">
              {/* Collection list */}
              <div className="doc-sidebar dashboard-panel">
                <div className="panel-header">
                  <h3>Collections</h3>
                </div>
                <div className="panel-body">
                  {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                    <button className="btn btn-sm btn-primary-outline w-full mb-3" onClick={createCollection}>
                      <Plus size={14} /> Create Collection
                    </button>
                  )}
                  
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
              <div className="doc-main" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Advanced Query Builder */}
                <div className="dashboard-panel m-0">
                  <div className="panel-header">
                    <h3><Sliders size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> MongoDB Query Builder</h3>
                    <button className="btn btn-secondary btn-sm" onClick={clearQueryBuilder}>Clear Filters</button>
                  </div>
                  <div className="panel-body">
                    <div className="query-builder-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="Path (e.g., profile.age)" 
                        value={qbField}
                        onChange={(e) => setQbField(e.target.value)}
                        className="code-font"
                      />
                      <select value={qbOp} onChange={(e) => setQbOp(e.target.value)}>
                        <option value="$eq">Equals ($eq)</option>
                        <option value="$ne">Not Equals ($ne)</option>
                        <option value="$gt">Greater Than ($gt)</option>
                        <option value="$gte">Greater or Equal ($gte)</option>
                        <option value="$lt">Less Than ($lt)</option>
                        <option value="$lte">Less or Equal ($lte)</option>
                        <option value="$in">In Array ($in)</option>
                        <option value="$contains">Contains ($contains)</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Value (e.g. 25, admin)" 
                        value={qbVal}
                        onChange={(e) => setQbVal(e.target.value)}
                        className="code-font"
                      />
                      <button className="btn btn-primary" onClick={addQueryRule}>Add Rule</button>
                    </div>

                    {qbRules.length > 0 && (
                      <div className="rules-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {qbRules.map((rule, i) => (
                          <span key={i} className="rule-badge" style={{
                            padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid var(--border-glow)', borderRadius: '6px', fontSize: '0.8rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)'
                          }}>
                            <strong className="code-font" style={{ color: 'var(--color-purple)' }}>{rule.field}</strong> {rule.op} <span className="code-font" style={{ color: 'var(--color-cyan)' }}>{rule.value}</span>
                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeQueryRule(i)} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-panel m-0">
                  <div className="panel-header">
                    <div className="search-bar flex-grow-1 mr-3">
                      <Search size={16} />
                      <input 
                        type="text" 
                        placeholder='JSON Raw Filter query (e.g. {"role":"admin"})' 
                        value={docQuery}
                        onChange={(e) => setDocQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="btn btn-secondary" onClick={fetchDocuments}>
                        <Play size={14} /> Query
                      </button>
                      
                      {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                        <button className="btn btn-primary" onClick={() => {
                          if (!activeCollection) return;
                          setDocEditId('');
                          setDocEditJson(JSON.stringify({ name: 'New Document', active: true }, null, 2));
                          setShowDocModal(true);
                        }}>
                          <Plus size={14} /> Add Doc
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="panel-body p-0">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '200px' }}>ID</th>
                            <th>Document Payload</th>
                            {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                              <th style={{ width: '150px' }} className="text-right">Actions</th>
                            )}
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
                                No matching documents.
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
                                
                                {(userRole === 'admin_proj' || userRole === 'admin_db') && (
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
                                )}
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
          </div>
        )}

        {/* VIEW: SQL Workspace */}
        {activeTab === 'sql' && userRole !== 'visitor' && (
          <div className="tab-content" style={{ padding: '1.5rem', display: 'flex', flexGrow: 1 }}>
            <div className="sql-workspace-split" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', width: '100%', height: '100%' }}>
              
              {/* Left Column: Schema browser with click-to-view rows (UX Upgrade) */}
              <div className="sql-schemas-sidebar dashboard-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                <div className="panel-header">
                  <h3><Table size={16} /> SQL Tables Browser</h3>
                </div>
                <div className="panel-body" style={{ flexGrow: 1, overflowY: 'auto' }}>
                  {sqlTables.length === 0 ? (
                    <p className="text-muted text-center text-sm">No tables created yet.</p>
                  ) : sqlTables.map(tbl => (
                    <div key={tbl.table_name} className="table-schema-card" style={{
                      marginBottom: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glow)',
                      borderRadius: '8px', padding: '0.65rem 0.85rem'
                    }}>
                      <div className="flex justify-between align-center" style={{ marginBottom: '0.25rem' }}>
                        <span className="code-font font-weight-bold" style={{ color: 'var(--color-purple)', fontSize: '0.9rem' }}>{tbl.table_name}</span>
                        
                        {/* Inspect icon (visual table browser trigger) */}
                        <button className="btn-action btn-view" title="Browse table content visually" onClick={() => viewSQLTableData(tbl.table_name)}>
                          <PlayCircle size={14} />
                        </button>
                      </div>

                      <div className="flex justify-between text-xs text-muted" style={{ marginBottom: '0.35rem' }}>
                        <span>Columns: {tbl.columns.length}</span>
                        <span>Rows: {tbl.row_count}</span>
                      </div>

                      <div className="table-cols-list" style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', marginTop: '0.35rem', paddingTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {tbl.columns.map(col => (
                          <div key={col.name} className="flex justify-between text-xs code-font text-muted">
                            <span>{col.name}</span>
                            <span style={{ color: 'var(--color-cyan)', fontSize: '0.7rem' }}>{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: SQL editor and result table */}
              <div className="sql-editor-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minWidth: 0 }}>
                {/* Editor console */}
                <div className="dashboard-panel" style={{ marginBottom: 0 }}>
                  <div className="panel-header">
                    <h3>SQL Query Editor {userRole === 'user_db' && <span className="text-xs text-muted">(Read-Only SELECT permitted)</span>}</h3>
                  </div>
                  <div className="panel-body" style={{ padding: '1rem' }}>
                    <textarea 
                      rows={6}
                      className="code-font"
                      style={{ background: '#040507', border: '1px solid var(--border-glow)', color: '#a8ffb2', fontSize: '0.85rem', lineHeight: 1.6 }}
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                    />
                    <div className="flex justify-between mt-3 align-center">
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => setSqlQuery('SELECT * FROM users;')}>SELECT Template</button>
                        
                        {(userRole === 'admin_proj' || userRole === 'admin_db') && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSqlQuery('CREATE TABLE users (\n  id TEXT,\n  name TEXT,\n  age INT\n);')}>CREATE TABLE Template</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSqlQuery('INSERT INTO users VALUES (\'usr_10\', \'Alice\', 32);')}>INSERT Template</button>
                          </>
                        )}
                      </div>
                      <button className="btn btn-primary" onClick={runSQLQuery} disabled={loadingSQL}>
                        {loadingSQL ? <RefreshCw size={14} className="spinner" /> : <Play size={14} />} Run Query
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results Panel */}
                <div className="dashboard-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginBottom: 0, minHeight: '250px' }}>
                  <div className="panel-header">
                    <h3>Execution Result</h3>
                  </div>
                  <div className="panel-body p-0" style={{ flexGrow: 1, overflowY: 'auto', background: '#030406', display: 'flex', flexDirection: 'column' }}>
                    {sqlError && (
                      <div className="sql-error-box code-font" style={{ color: '#ff5555', padding: '1.5rem', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                        <Lock size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                        {sqlError}
                      </div>
                    )}
                    
                    {sqlResult && !sqlError && (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {sqlResult.message && (
                          <div className="code-font text-xs" style={{ color: 'var(--color-cyan)', padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--border-glow)', background: 'rgba(0,245,212,0.02)' }}>
                            {sqlResult.message}
                          </div>
                        )}
                        
                        {sqlResult.columns && sqlResult.columns.length > 0 && (
                          <div className="table-container" style={{ flexGrow: 1 }}>
                            <table>
                              <thead>
                                <tr>
                                  {sqlResult.columns.map(col => (
                                    <th key={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sqlResult.rows && sqlResult.rows.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="code-font text-muted">
                                        {cell === null ? 'NULL' : typeof cell === 'boolean' ? String(cell) : String(cell)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!sqlResult && !sqlError && (
                      <div className="text-center text-muted py-5" style={{ margin: 'auto' }}>
                        Select a table from the sidebar or type a query above to browse content.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW: System Logs Explorer */}
        {activeTab === 'logs' && userRole === 'admin_proj' && (
          <div className="tab-content">
            <div className="dashboard-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
              <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="search-bar">
                  <Search size={16} />
                  <input 
                    type="text" 
                    placeholder="Filter logs by content..." 
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3 align-center">
                  <div className="flex gap-2">
                    <button 
                      className={`btn btn-sm ${logsLevel === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setLogsLevel('ALL')}
                    >All Logs</button>
                    <button 
                      className={`btn btn-sm ${logsLevel === 'HTTP' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setLogsLevel('HTTP')}
                    >HTTP</button>
                    <button 
                      className={`btn btn-sm ${logsLevel === 'SYSTEM' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setLogsLevel('SYSTEM')}
                    >System</button>
                    <button 
                      className={`btn btn-sm ${logsLevel === 'ERROR' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setLogsLevel('ERROR')}
                    >Errors</button>
                  </div>
                  
                  <label className="flex gap-2 align-center code-font text-sm" style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={autoScrollLogs} 
                      onChange={(e) => setAutoScrollLogs(e.target.checked)} 
                    />
                    Auto-Scroll
                  </label>
                </div>
              </div>
              <div className="panel-body p-0" style={{ flexGrow: 1, position: 'relative', background: '#030406', minHeight: '400px' }}>
                <div className="logs-terminal code-font" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  padding: '1.5rem', overflowY: 'auto', fontSize: '0.85rem', lineHeight: 1.5,
                  display: 'flex', flexDirection: 'column', gap: '0.25rem'
                }}>
                  {filteredLogs.map((entry, idx) => {
                    const isError = entry.message.toLowerCase().includes('error') || entry.message.toLowerCase().includes('critical');
                    const isHttp = entry.message.includes('GET ') || entry.message.includes('POST ') || entry.message.includes('DELETE ');
                    
                    let logColor = '#94a1b2';
                    if (isError) logColor = '#ff5555';
                    else if (isHttp) logColor = 'var(--color-cyan)';
                    else if (entry.message.includes('starting') || entry.message.includes('available')) logColor = 'var(--color-purple)';

                    return (
                      <div key={idx} style={{ color: logColor }}>
                        <span style={{ color: '#4f5e71', marginRight: '0.75rem' }}>
                          [{new Date(entry.timestamp).toLocaleTimeString()}]
                        </span>
                        {entry.message}
                      </div>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <div className="text-center text-muted py-5">No logs available matching current criteria.</div>
                  )}
                  {autoScrollLogs && <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: API Docs */}
        {activeTab === 'api-docs' && userRole !== 'visitor' && (
          <div className="tab-content">
            <div className="dashboard-grid">
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

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="modal">
          <div className="modal-content" style={{ width: '560px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} style={{ color: 'var(--color-cyan)' }} /> AroraDB Privacy Policy
              </h3>
              <button className="btn-close-modal" onClick={() => setShowPrivacyModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              <div>
                <strong style={{ color: '#fff' }}>1. Local-First Offline Guarantee</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  AroraDB runs 100% offline on your own local environment. No data records, logs, or metadata are ever transmitted to external cloud servers or metrics collectors. Your data is strictly yours.
                </p>
              </div>
              
              <div>
                <strong style={{ color: '#fff' }}>2. API Security Authentication</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  When token protection is enabled (`--token` flag), API requests require a matching `X-Arora-Token` header. Auth tokens are held in-memory or in local client browser session storage and are never uploaded to any remote logging facility.
                </p>
              </div>

              <div>
                <strong style={{ color: '#fff' }}>3. Logging & Telemetry Retention</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  The real-time log viewer pulls from an in-memory ring buffer stored in RAM on your local machine. These buffer entries expire automatically and do not persist to disk, preventing logs leak.
                </p>
              </div>

              <div>
                <strong style={{ color: '#fff' }}>4. GDPR & HIPAA Regulatory Compliance</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                  Since AroraDB doesn't act as a third-party data processor and processes all query pipelines locally, you retain full data custody, making it trivially simple to satisfy GDPR data subject requests and HIPAA strict safety guidelines.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowPrivacyModal(false)}>I Understand</button>
            </div>
          </div>
        </div>
      )}

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
