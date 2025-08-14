import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Download, Clock, Play, Pause, Eye, Upload } from 'lucide-react';
import CompanyExportGuard from './CompanyExportGuard';
import { downloadCallsTemplate, uploadCallsExcel, uploadCallCorrections } from '../utils/api';
import { agentStatusClass } from '../utils/format';
import useAgents from '../hooks/useAgents';

const AgentsTable = ({
  user,
  agentSearch,
  setAgentSearch,
  showAgentExport,
  setShowAgentExport,
  filteredAgents,
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportToXML,
  refreshCalls,
  setShowAddModal,
  setFormData,
  setError,
  userRoleIsAdmin,
  openEditModal,
  handleDeleteAgent,
  deleteLoading,
  showAddModal,
  showEditModal,
  formData,
  setShowEditModal,
  handleAddAgent,
  handleEditAgent,
  loading,
  error,
  isBlocked
}) => {
  const [workingStatus, setWorkingStatus] = useState('Working');
  const [breakData, setBreakData] = useState({
    remark: ''
  });
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [agentBreakHistory, setAgentBreakHistory] = useState({});
  const [showAgentBreaksModal, setShowAgentBreaksModal] = useState(false);
  const [selectedAgentBreaks, setSelectedAgentBreaks] = useState({});
  const [selectedAgentNumber, setSelectedAgentNumber] = useState('');
  const [agentBreaksLoading, setAgentBreaksLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionRows, setCorrectionRows] = useState([]);
  const [correctionUploading, setCorrectionUploading] = useState(false);
  const [showUploadResultModal, setShowUploadResultModal] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);
  const [uploadErrorCount, setUploadErrorCount] = useState(0);
  const { saveAgentBreakStatus, closeLatestAgentBreak, getAllAgentBreaks, currentStatusMap, refreshAgentsCurrentStatus } = useAgents();
  const token = localStorage.getItem('token');
  const [breakTimeError, setBreakTimeError] = useState('');

  // Filter agents based on user role - Admin sees all, Agent sees only their own
  const displayAgents = user?.role === 'admin' ? filteredAgents : filteredAgents.filter(agent => agent.agent_number === user?.agent_number);

  // Format Date to MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
  const formatToMySQLDateTime = (dateObj) => {
    const pad = (n) => String(n).padStart(2, '0');
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    const seconds = pad(dateObj.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  // No scheduled from/to selection; break starts immediately when confirmed

  // Restore working status and ongoing break across sessions (persist until manually changed)
  useEffect(() => {
    if (!user?.agent_number) return;
    const storedStatus = localStorage.getItem(`workingStatus:${user.agent_number}`);
    const storedBreakStart = localStorage.getItem(`breakStartTime:${user.agent_number}`);
    if (storedStatus) {
      setWorkingStatus(storedStatus);
      if (storedStatus === 'Break' && storedBreakStart) {
        setIsOnBreak(true);
        setBreakStartTime(new Date(storedBreakStart));
      }
    }
  }, [user?.agent_number]);

  // Admin: poll current working status map so admin view stays updated
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const token = localStorage.getItem('token');
    const fetchNow = () => refreshAgentsCurrentStatus(token);
    fetchNow();
    const id = setInterval(fetchNow, 15000); // 15s refresh
    return () => clearInterval(id);
  }, [user?.role, refreshAgentsCurrentStatus]);

  const handleWorkingStatusChange = async (status) => {
    if (status === 'Break') {
      setShowBreakModal(true);
    } else if (status === 'Working' && isOnBreak) {
      const endTime = new Date();
      // Close latest ongoing break on server to avoid creating a new row
      await closeLatestAgentBreak(
        user.agent_number,
        formatToMySQLDateTime(endTime),
        token
      );
      const totalDurationSeconds = Math.floor((endTime.getTime() - breakStartTime.getTime()) / 1000);
      const totalDurationMinutes = Math.round(totalDurationSeconds / 60);
      setAgentBreakHistory(prev => ({
        ...prev,
        [user.agent_number]: {
          lastBreakDuration: totalDurationMinutes,
          lastBreakEnd: endTime,
          remark: breakData.remark
        }
      }));
      setIsOnBreak(false);
      setBreakStartTime(null);
      setBreakData({ fromTime: '', toTime: '', remark: '' });
      setWorkingStatus('Working');
      // Persist status change
      localStorage.setItem(`workingStatus:${user.agent_number}`, 'Working');
      localStorage.removeItem(`breakStartTime:${user.agent_number}`);
    } else {
      // Save working status change
      const statusRecord = {
        agent_number: user.agent_number,
        status,
        break_start: null,
        break_end: null,
        duration_seconds: null,
        remark: '',
      };
      await saveAgentBreakStatus(statusRecord, token);
      setWorkingStatus(status);
      // Persist status change
      localStorage.setItem(`workingStatus:${user.agent_number}`, status);
    }
  };

  const startBreak = async () => {
    if (!breakData.remark) {
      setBreakTimeError('Remark is required.');
      return;
    }
    const breakStart = new Date();
    const breakRecord = {
      agent_number: user.agent_number,
      status: 'Break',
      break_start: formatToMySQLDateTime(breakStart),
      break_end: null,
      duration_seconds: null,
      remark: breakData.remark,
    };
    const result = await saveAgentBreakStatus(breakRecord, token);
    if (!result.success) {
      setBreakTimeError(result.message || 'Failed to save break.');
      return;
    }
    setBreakTimeError('');
    setIsOnBreak(true);
    setBreakStartTime(breakStart);
    setWorkingStatus('Break');
    // Persist ongoing break info
    localStorage.setItem(`workingStatus:${user.agent_number}`, 'Break');
    localStorage.setItem(`breakStartTime:${user.agent_number}`, breakStart.toISOString());
    setShowBreakModal(false);
  };

  // No validation needed for from/to; break starts immediately

  // Format break duration for display
  const formatBreakDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Format time exactly as stored in DB string (HH:MM). If Date, fallback to local HH:MM
  const formatStoredHHMM = (value) => {
    if (!value) return '-';
    try {
      if (typeof value === 'string') {
        const match = value.match(/(?:T|\s)(\d{2}):(\d{2})/);
        if (match) return `${match[1]}:${match[2]}`;
        // If only time provided
        const short = value.match(/^(\d{2}):(\d{2})/);
        if (short) return `${short[1]}:${short[2]}`;
      }
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toTimeString().slice(0, 5);
    } catch (_) {}
    return '-';
  };

  // Handle agent activation/deactivation (Admin only)
  const handleAgentStatusToggle = async (agentNumber, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    console.log(`Admin toggling agent ${agentNumber} from ${currentStatus} to ${newStatus}`);
    // TODO: Replace with actual API call
    // await updateAgentStatus(agentNumber, newStatus);
  };

  // Handle viewing specific agent's breaks (Admin only)
  const handleViewAgentBreaks = async (agentNumber) => {
    setAgentBreaksLoading(true);
    setSelectedAgentNumber(agentNumber);
    try {
      // Use the existing getAllAgentBreaks function with agent number as search parameter
      const data = await getAllAgentBreaks(token, agentNumber.toString());
      console.log('Fetched agent breaks data:', data); // Debug log
      setSelectedAgentBreaks(data || {});
      setShowAgentBreaksModal(true);
    } catch (error) {
      console.error('Error fetching agent breaks:', error);
      setSelectedAgentBreaks({});
    }
    setAgentBreaksLoading(false);
  };

  // Calculate total duration for a date
  const calculateDayTotal = (records) => {
    return records.reduce((total, record) => {
      return total + (record.duration_seconds ? Math.round(record.duration_seconds / 60) : 0);
    }, 0);
  };

  const exportDropdownRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowAgentExport(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportDropdownRef, setShowAgentExport]);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-gray-900">Agent Details</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
          {/* Search Bar - Only for Admin */}
          {user?.role === 'admin' && (
            <input
              type="text"
              placeholder="Search agents..."
              value={agentSearch}
              onChange={e => setAgentSearch(e.target.value)}
              className="border px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Working Status Dropdown - Only for non-admin users */}
          {user?.role !== 'admin' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Working Status:</label>
              <select
                value={workingStatus}
                onChange={(e) => handleWorkingStatusChange(e.target.value)}
                className="border px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Working">Working</option>
                <option value="Break">Break</option>
              </select>
            </div>
          )}

          {/* Export Dropdown */}
          <CompanyExportGuard isBlocked={isBlocked}>
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowAgentExport(v => !v)}
                className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                <Download className="w-4 h-4 mr-1" /> Export
              </button>
              {showAgentExport && (
                <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToExcel(displayAgents, 'agents'); setShowAgentExport(false); }}>Excel</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToPDF(displayAgents, 'agents', ['agent_number','name','email','status','is_admin']); setShowAgentExport(false); }}>PDF</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToCSV(displayAgents, 'agents'); setShowAgentExport(false); }}>CSV</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToXML(displayAgents, 'agents'); setShowAgentExport(false); }}>XML</button>
                </div>
              )}
            </div>
          </CompanyExportGuard>

          {user?.role === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await downloadCallsTemplate(token);
                }}
                className="flex items-center bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
                disabled={isBlocked}
              >
                <Download className="w-4 h-4 mr-1" /> Template
              </button>
              <button
                onClick={() => { setShowUploadModal(true); setUploadFile(null); }}
                className="flex items-center bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                disabled={isBlocked}
              >
                <Upload className="w-4 h-4 mr-1" /> Upload Calls
              </button>
            </div>
          )}

          {/* Add Agent Button - Admin only */}
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                setShowAddModal(true);
                setFormData({
                  agent_number: '',
                  name: '',
                  email: '',
                  password: '',
                  status: 'Active',
                  is_admin: false
                });
                setError('');
              }}
              className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              disabled={isBlocked}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Agent
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              {/* Password column - Only show for Admin */}
              {user?.role === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              {/* For Admin show current working status instead of last break duration */}
              {user?.role === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
              )}
              {/* Show current working status for Agent */}
              {user?.role !== 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayAgents.map((agent) => (
              <tr key={agent.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agent_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.email}</td>
                {/* Password - Only for Admin */}
                {user?.role === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.password}</td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {user?.role === 'admin' ? (
                    /* Admin can toggle agent status */
                    <button
                      onClick={() => handleAgentStatusToggle(agent.agent_number, agent.status)}
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        agent.status === 'Active' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {agent.status}
                    </button>
                  ) : (
                    <span className={agentStatusClass(agent.status)}>{agent.status}</span>
                  )}
                </td>
                {/* Current status for Admin */}
                {user?.role === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      // Hide current status for inactive users and admin accounts
                      if (agent.status !== 'Active' || agent.is_admin) {
                        return <span className="text-gray-400">-</span>;
                      }
                      const status = currentStatusMap[agent.agent_number] || 'Working';
                      const cls = status === 'Working' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
                      return <span className={`px-2 py-1 text-xs rounded-full font-medium ${cls}`}>{status}</span>;
                    })()}
                  </td>
                )}
                {/* Current Status - Agent only, and only for their own row */}
                {user?.role !== 'admin' && agent.agent_number === user?.agent_number && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      workingStatus === 'Working' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {workingStatus}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {agent.is_admin ? (
                    <span className="text-blue-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {/* Edit button - Admin or own agent */}
                  {(user?.role === 'admin' || agent.agent_number === user?.agent_number) && (
                    <button
                      onClick={() => openEditModal(agent)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="inline w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Delete button - Admin only */}
                  {/* Delete button removed as per requirement */}
                  
                  {/* View All button - Admin only, at the end of each row */}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        console.log('View All button clicked for agent:', agent.agent_number); // Debug log
                        handleViewAgentBreaks(agent.agent_number);
                      }}
                      className="text-green-500 hover:text-green-700 ml-2"
                      disabled={agentBreaksLoading}
                      title="View agent breaks"
                    >
                      {agentBreaksLoading && selectedAgentNumber === agent.agent_number ? (
                        <Clock className="inline w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="inline w-4 h-4" />
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Break Modal - Only for non-admin users */}
      {showBreakModal && user?.role !== 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" 
              onClick={() => {
                setShowBreakModal(false);
                setBreakData({ fromTime: '', toTime: '', remark: '' });
                setBreakTimeError('');
              }}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Pause className="w-5 h-5 text-orange-500" />
              Set Break Time
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Break starts now</label>
                  <div className="w-full border px-3 py-2 rounded bg-gray-50 text-gray-600">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Remark</label>
                  <input
                    type="text"
                    placeholder="e.g., Lunch, Team Meeting, Personal Break"
                    value={breakData.remark}
                    onChange={(e) => setBreakData({ ...breakData, remark: e.target.value })}
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div />
              {breakTimeError && <div className="text-red-500 text-xs">{breakTimeError}</div>}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowBreakModal(false);
                    setBreakData({ fromTime: '', toTime: '', remark: '' });
                    setBreakTimeError('');
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={startBreak}
                  className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 flex items-center justify-center gap-2"
                  disabled={!breakData.remark}
                >
                  <Play className="w-4 h-4" />
                  Start Break
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Excel Modal - Admin only */}
      {showUploadModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowUploadModal(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-4">Upload Calls (Excel)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Excel File (.xlsx)</label>
                <input type="file" accept=".xlsx" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button
                  className="flex-1 bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
                  disabled={!uploadFile || uploading}
                  onClick={async () => {
                    setUploading(true);
                    const res = await uploadCallsExcel(uploadFile, token);
                    setUploading(false);
                    if (res.success) {
                      const successCount = res.data?.success_count ?? 0;
                      const errorCount = res.data?.error_count ?? 0;
                      setUploadSuccessCount(successCount);
                      setUploadErrorCount(errorCount);
                      setShowUploadModal(false);
                      if (errorCount > 0) {
                        const errs = Array.isArray(res.data?.errors) ? res.data.errors : [];
                        setUploadErrors(errs);
                        setCorrectionRows(errs.map(e => ({
                          agent_number: e.agent_number || '',
                          customer_number: e.customer_number || '',
                          name: e.name || '',
                          remarks: e.remarks || '',
                          reason: e.reason || '',
                        })));
                      } else {
                        setUploadErrors([]);
                        setCorrectionRows([]);
                      }
                      setShowUploadResultModal(true);
                      refreshCalls?.();
                    } else {
                      alert(res.message || 'Upload failed');
                    }
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Popup with left-bottom Correction button */}
      {showUploadResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Upload Result</h3>
            <p className="text-sm text-gray-700">Success: <span className="font-semibold">{uploadSuccessCount}</span></p>
            <p className="text-sm text-gray-700 mb-6">Errors: <span className="font-semibold">{uploadErrorCount}</span></p>
            {uploadErrorCount > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 p-2 rounded">
                <p className="font-semibold mb-2">Error Details:</p>
                {correctionRows && correctionRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row Number</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Number</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Number</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {correctionRows.map((row, index) => (
                          <tr key={index} className="text-gray-900">
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{row.row_number || index + 1}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{row.reason || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{row.agent_number || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{row.customer_number || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{row.name || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{row.remarks || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No specific error details available.</p>
                )}
              </div>
            )}
            <button
                className="absolute left-4 bottom-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={() => {
                  const rowsToExport = (correctionRows || []).map(r => {
                    const exportedRow = {
                      'Row Number': r.row_number || correctionRows.indexOf(r) + 1,
                      'Reason': r.reason || '',
                    };
                    for (const key in r) {
                      if (key !== 'reason' && key !== 'row_number') {
                        exportedRow[key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')] = r[key];
                      }
                    }
                    return exportedRow;
                  });
                  console.log('Error Rows for Export:', rowsToExport);
                  try {
                    exportToExcel(rowsToExport, 'upload_errors_report');
                  } catch (e) {
                    console.error('Failed to export errors:', e);
                    alert('Failed to export errors');
                  }
                }}
                title="Download error rows for correction"
              >
                Download ({uploadErrorCount})
              </button>
            <div className="flex justify-end">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setShowUploadResultModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal - Admin only */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowAddModal(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-4">Add Agent</h3>
            <form className="space-y-4" onSubmit={handleAddAgent}>
              <div>
                <label className="block text-sm font-medium mb-1">Agent Number</label>
                <input type="text" className="w-full border px-3 py-2 rounded" value={formData.agent_number} onChange={e => setFormData({ ...formData, agent_number: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" className="w-full border px-3 py-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required disabled={user?.role !== 'admin'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border px-3 py-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required disabled={user?.role !== 'admin'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="text" className="w-full border px-3 py-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
              </div>
               <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full border px-3 py-2 rounded" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Removed">Removed</option>
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="is_admin_add" checked={formData.is_admin} onChange={e => setFormData({ ...formData, is_admin: e.target.checked })} />
                <label htmlFor="is_admin_add" className="ml-2 text-sm">Admin</label>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600" disabled={loading}>{loading ? 'Adding...' : 'Add Agent'}</button>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Agent Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditModal(false)}>&times;</button>
            <h3 className="text-lg font-bold mb-4">Edit Agent</h3>
            <form className="space-y-4" onSubmit={handleEditAgent}>
              {user?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Agent Number</label>
                  <input type="text" className="w-full border px-3 py-2 rounded bg-gray-100" value={formData.agent_number} disabled />
                </div>
              )}
              {user?.role === 'admin' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input type="text" className="w-full border px-3 py-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" className="w-full border px-3 py-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                </>
              ) : null}
              <div>
                <label className="block text-sm font-medium mb-1">Password (leave blank to keep unchanged)</label>
                <input type="password" className="w-full border px-3 py-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              {/* Admin-only fields in edit modal, lock for agents */}
              {user?.role === 'admin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select className="w-full border px-3 py-2 rounded" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="is_admin_edit" checked={formData.is_admin} onChange={e => setFormData({ ...formData, is_admin: e.target.checked })} />
                    <label htmlFor="is_admin_edit" className="ml-2 text-sm">Admin</label>
                  </div>
                </>
              )}
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal for viewing specific agent's breaks (admin) */}
      {showAgentBreaksModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" 
              onClick={() => setShowAgentBreaksModal(false)}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">
              Agent Break Details - {displayAgents.find(a => a.agent_number === selectedAgentNumber)?.name || selectedAgentNumber}
            </h3>
            
            {agentBreaksLoading ? (
              <div className="flex justify-center items-center h-32">
                <Clock className="w-8 h-8 animate-spin text-blue-500 mr-3" />
                <div className="text-gray-500">Loading agent break data...</div>
              </div>
            ) : (
              Object.keys(selectedAgentBreaks).length === 0 ? (
                <div className="text-center text-gray-500 h-32 flex items-center justify-center">
                  <div>
                    <Eye className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No break records found for this agent.</p>
                  </div>
                </div>
              ) : (
                Object.entries(selectedAgentBreaks)
                  .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
                  .map(([date, records]) => {
                  const dayTotal = calculateDayTotal(records);
                  return (
                    <div key={date} className="mb-6">
                      <div className="font-semibold text-blue-700 mb-3 text-lg border-b pb-2">
                        {date}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 mb-4">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((record, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatStoredHHMM(record.break_start)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatStoredHHMM(record.break_end)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {record.remark || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {record.status === 'Break' && !record.break_end
                                    ? 'Ongoing'
                                    : (record.duration_seconds ? Math.round(record.duration_seconds / 60) : '-')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Summary row for the day */}
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-blue-800">Total Break Time for {date}:</span>
                          <span className="font-bold text-blue-900 text-lg">
                            {formatBreakDuration(dayTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}

      {/* Bottom-left floating Correction button removed as requested; popup button remains */}
    </div>
  );
};

export default AgentsTable;

