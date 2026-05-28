import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, CheckCircle, AlertTriangle, FileText, 
  RefreshCw, Edit2, Shield, Eye, Layers, HelpCircle 
} from 'lucide-react';

// frontend/src/App.jsx

// Agar internet par live link mile toh wo use karo, nahi toh laptop ka localhost use karo
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://scopestream-backend.onrender.com';
// const API_BASE = 'http://localhost:8000/api';

function App() {
  // State management
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState(''); // Paste your UUID generated from the backend seed script here
  const [sourceType, setSourceType] = useState('SAP');
  const [file, setFile] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  
  // Modal / Editing state
  const [editingRecord, setEditingRecord] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editReason, setEditReason] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // Load data rows from API
  const fetchRecords = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/records/?tenant_id=${tenantId}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (scopeFilter) url += `&scope=${scopeFilter}`;
      
      const res = await axios.get(url);
      setRecords(res.data.results || res.data);
    } catch (err) {
      alert('Error fetching environmental records. Check backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load whenever filters or tenant parameters change
  useEffect(() => {
    fetchRecords();
  }, [tenantId, statusFilter, scopeFilter]);

  // Handle ingestion file submissions
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId || !file) {
      alert('Please guarantee both a Tenant UUID is set and a target data payload is attached.');
      return;
    }

    const formData = new FormData();
    formData.append('tenant_id', tenantId);
    formData.append('source_type', sourceType);
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Ingestion Successful!\nImported: ${res.data.records_imported}\nFailed: ${res.data.records_failed}`);
      setFile(null);
      e.target.reset();
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || 'Structural translation parsing error encountered.');
    } finally {
      setLoading(false);
    }
  };

  // Inline Quick Approval Hook
  const handleApprove = async (id) => {
    try {
      await axios.post(`${API_BASE}/records/${id}/approve/`);
      fetchRecords();
    } catch (err) {
      alert('Approval processing failure.');
    }
  };

  // Inline Flagging Hook
  const handleFlag = async (id) => {
    try {
      await axios.post(`${API_BASE}/records/${id}/flag/`);
      fetchRecords();
    } catch (err) {
      alert('Flagging action failure.');
    }
  };

  // Handle Edit Submission and pass reason into our backend audit pipeline
  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/records/${editingRecord.id}/`, {
        tenant: tenantId,
        source: editingRecord.source,
        scope: editingRecord.scope,
        category: editingRecord.category,
        activity_date_start: editingRecord.activity_date_start,
        activity_date_end: editingRecord.activity_date_end,
        normalized_quantity: editQuantity,
        normalized_unit: editingRecord.normalized_unit,
        status: 'PENDING', // Reset back to pending for manual reviewer sign-off
        reason_for_change: editReason
      });
      setEditingRecord(null);
      setEditQuantity('');
      setEditReason('');
      fetchRecords();
    } catch (err) {
      alert('Data modification engine rejected payload requirements.');
    }
  };

  // Quick KPI calculation summaries
  const countStatus = (statusStr) => records.filter(r => r.status === statusStr).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Banner Navigation Bar */}
      <header className="bg-emerald-900 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Layers className="h-6 w-6 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-wide">ScopeStream <span className="text-xs text-emerald-300 font-normal">| Breathe ESG Platform</span></h1>
        </div>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-emerald-100">Active Tenant UUID:</label>
          <input 
            type="text" 
            placeholder="Paste Tenant UUID here..."
            className="px-3 py-1.5 rounded bg-emerald-800 text-white placeholder-emerald-400 text-sm border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-80"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Row 1: Informative Banner if Tenant UUID missing */}
        {!tenantId && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-900 rounded-r shadow-sm">
            <p className="font-semibold">Tenant Context Identification Required</p>
            <p className="text-sm">Please paste the Tenant UUID generated during the backend seed script configuration into the top bar input field to manage and browse streaming records.</p>
          </div>
        )}

        {/* Row 2: Ingestion Controls and Operational KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* File Upload Control Point */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-600" /> Stream Data Ingestion
            </h2>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Source Stream Channel</label>
                <select 
                  className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                >
                  <option value="SAP">SAP ERP (Fuel & Procurement)</option>
                  <option value="UTILITY_CSV">Utility Portal Export (Electricity)</option>
                  <option value="CONCUR_API">Concur Platform (Business Travel)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Target Document Payload</label>
                <input 
                  type="file" 
                  accept=".csv,.json,.txt"
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
              <button 
                type="submit"
                disabled={loading || !tenantId}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded text-sm transition shadow-sm disabled:opacity-50"
              >
                {loading ? 'Processing Normalization Pipeline...' : 'Run Ingestion Conversion Engine'}
              </button>
            </form>
          </div>

          {/* Operational Metrics Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Records</span>
              <span className="text-3xl font-extrabold text-slate-800 mt-2">{records.length}</span>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Suspicious
              </span>
              <span className="text-3xl font-extrabold text-amber-800 mt-2">{countStatus('FLAGGED')}</span>
            </div>
            <div className="bg-sky-50 p-4 rounded-lg border border-sky-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wide flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Pending Review
              </span>
              <span className="text-3xl font-extrabold text-sky-800 mt-2">{countStatus('PENDING')}</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Approved / Locked
              </span>
              <span className="text-3xl font-extrabold text-emerald-800 mt-2">{countStatus('APPROVED')}</span>
            </div>
          </div>
        </div>

        {/* Row 3: Grid Control Filtering Toolbars */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <span className="text-sm font-semibold text-slate-600">Filters:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded p-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Verification Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="FLAGGED">Flagged Suspicious</option>
              <option value="APPROVED">Approved for Audit</option>
            </select>
            <select 
              value={scopeFilter} 
              onChange={(e) => setScopeFilter(e.target.value)}
              className="border border-slate-300 rounded p-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All GHG Scope Categories</option>
              <option value="SCOPE_1">Scope 1 (Direct)</option>
              <option value="SCOPE_2">Scope 2 (Indirect)</option>
              <option value="SCOPE_3">Scope 3 (Chain)</option>
            </select>
          </div>
          <button 
            onClick={fetchRecords}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 bg-white"
          >
            <RefreshCw className="h-3 w-3" /> Refresh Grid View
          </button>
        </div>

        {/* Row 4: Primary Master-Detail Data Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
                  <th className="p-4">Scope Line</th>
                  <th className="p-4">Operational Category</th>
                  <th className="p-4">Interval Duration</th>
                  <th className="p-4 text-right">Normalized Quantity</th>
                  <th className="p-4">Source Channel</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions / History</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-slate-400">No telemetry record rows loaded for the provided active context scope.</td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          rec.scope === 'SCOPE_1' ? 'bg-red-50 text-red-700 border border-red-200' :
                          rec.scope === 'SCOPE_2' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {rec.scope}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">{rec.category}</td>
                      <td className="p-4 text-xs text-slate-500">
                        {rec.activity_date_start} to {rec.activity_date_end}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-900">
                        {parseFloat(rec.normalized_quantity).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-xs font-normal text-slate-500">{rec.normalized_unit}</span>
                        {rec.is_edited && (
                          <span className="block text-[10px] text-amber-600 font-medium">✏️ Modded by Analyst</span>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-medium text-slate-700">{rec.source_detail?.source_type_display}</div>
                        <div className="text-slate-400 max-w-[150px] truncate">{rec.source_detail?.upload_filename}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          rec.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          rec.status === 'FLAGGED' ? 'bg-amber-100 text-amber-800' :
                          'bg-sky-100 text-sky-800'
                        }`}>
                          {rec.status === 'APPROVED' && <CheckCircle className="h-3 w-3" />}
                          {rec.status === 'FLAGGED' && <AlertTriangle className="h-3 w-3" />}
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          {rec.status !== 'APPROVED' && (
                            <>
                              <button 
                                onClick={() => handleApprove(rec.id)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleFlag(rec.id)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition"
                              >
                                Flag
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingRecord(rec);
                                  setEditQuantity(rec.normalized_quantity);
                                }}
                                className="p-1 text-slate-500 hover:bg-slate-100 rounded transition"
                                title="Edit Row Metrics"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setSelectedAuditLog(rec)}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded transition flex items-center gap-0.5 text-xs"
                            title="Review Traceability Logs"
                          >
                            <Shield className="h-3.5 w-3.5" /> ({rec.audit_logs?.length || 0})
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-component Modal 1: Audit Log History Viewport */}
        {selectedAuditLog && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" /> Audit Trail Log History
                </h3>
                <button onClick={() => setSelectedAuditLog(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
                <div className="text-xs bg-slate-50 p-2 rounded text-slate-500 border border-slate-100">
                  <span className="font-bold text-slate-700">Source Raw Capture:</span> {JSON.stringify(selectedAuditLog.raw_data)}
                </div>
                {selectedAuditLog.audit_logs?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No structural adjustments records have occurred on this row since initial machine parsing.</p>
                ) : (
                  selectedAuditLog.audit_logs.map((log) => (
                    <div key={log.id} className="border-l-2 border-emerald-500 bg-slate-50 p-3 rounded text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 text-[10px]">
                        <span>By: {log.changed_by_detail?.username || 'Analyst Session'}</span>
                        <span>{new Date(log.changed_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 font-medium">Modified Field: <span className="font-mono bg-slate-200 px-1 rounded">{log.field_changed}</span></p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] py-1">
                        <span className="text-red-600 truncate">Old: {log.old_value}</span>
                        <span className="text-emerald-600 truncate">New: {log.new_value}</span>
                      </div>
                      <p className="text-slate-500 italic">"Reason: {log.reason_for_change}"</p>
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => setSelectedAuditLog(null)}
                className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded text-xs transition"
              >
                Close Trace Log Viewport
              </button>
            </div>
          </div>
        )}

        {/* Sub-component Modal 2: Manual Analyst Modification Terminal */}
        {editingRecord && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-emerald-600" /> Manual Adjustments Interface
                </h3>
                <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <form onSubmit={handleUpdateRecord} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Category Context</label>
                  <input type="text" disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 p-2 rounded text-xs" value={editingRecord.category} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Normalized Value</label>
                    <input 
                      type="number" step="any" required
                      className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-emerald-500"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fixed Standard Unit</label>
                    <input type="text" disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 p-2 rounded text-xs" value={editingRecord.normalized_unit} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Justification Reason for Audit Trail</label>
                  <textarea 
                    rows="3" required
                    placeholder="Provide a logical reason for modifying this regulatory source value..."
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button 
                    type="button" onClick={() => setEditingRecord(null)}
                    className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded text-xs transition"
                  >
                    Cancel Action
                  </button>
                  <button 
                    type="submit"
                    className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded text-xs transition shadow-sm"
                  >
                    Commit Mod Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;