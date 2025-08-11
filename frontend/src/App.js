import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AddAgentModal from './components/Modals/AddAgentModal';
import EditAgentModal from './components/Modals/EditAgentModal';
import AltNumbersModal from './components/Modals/AltNumbersModal';
import ViewAllCallsModal from './components/Modals/ViewAllCallsModal';

import useAuth from './hooks/useAuth';
import useAgents from './hooks/useAgents';
import useCalls from './hooks/useCalls';

import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportToXML,
} from './utils/exportHelpers';

import { formatDuration, callStatusClass } from './utils/format';
import { handleSaveAltNumbers, handleSaveViewAllRemarks } from './utils/api';

function App() {
  // Auth
  const {
    currentScreen,
    user,
    loginData,
    setLoginData,
    handleLogin,
    handleLogout,
    loading,
    error,
    setError,
  } = useAuth();

  // Agents
  const {
    agentDetails,
    fetchAgentDetails,
    handleAddAgent,
    handleEditAgent,
    handleDeleteAgent,
    deleteLoading,
  } = useAgents();

  // Calls
  const {
    callDetails,
    fetchCallDetails,
    editingCallId,
    setEditingCallId,
    editInputs,
    setEditInputs,
    editLoading,
    handleEditCall,
    handleCancelEdit,
    handleUpdateCall,
  } = useCalls();

  // UI States
  const [activeTab, setActiveTab] = useState('calls');
  const [callSearch, setCallSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showCallExport, setShowCallExport] = useState(false);
  const [showAgentExport, setShowAgentExport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ agent_number: '', name: '', email: '', password: '', status: 'Active', is_admin: false });
  const [manualCallNumber, setManualCallNumber] = useState('');
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewAllRemarksEdit, setViewAllRemarksEdit] = useState(false);
  const [viewAllRemarksInput, setViewAllRemarksInput] = useState('');
  const [viewAllRemarksLoading, setViewAllRemarksLoading] = useState(false);
  const [altModal, setAltModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [altNumbersInput, setAltNumbersInput] = useState('');
  const [altNumbersLoading, setAltNumbersLoading] = useState(false);

  const userRoleIsAdmin = user?.is_admin;

  const token = localStorage.getItem('token');

  const handleDateSearch = () => {
    fetchCallDetails(token, fromDate, toDate);
  };

  const refreshCalls = () => {
    fetchCallDetails(token, fromDate, toDate);
  };

  const openEditModal = (agent) => {
    setFormData(agent);
    setShowEditModal(true);
  };

  const handleManualCall = () => {
    if (!manualCallNumber) return alert("Enter a number");
    alert(`Pretend calling ${manualCallNumber}`);
  };

  const handleOpenAltNumbersModal = (call) => {
    setSelectedCall(call);
    setAltNumbersInput(call.alternative_numbers || '');
    setAltModal(true);
  };

  const handleSaveAltNumbersWrapper = async () => {
    setAltNumbersLoading(true);
    const res = await handleSaveAltNumbers(selectedCall.id, altNumbersInput, token);
    if (res.success) {
      await fetchCallDetails(token, fromDate, toDate);
      setAltModal(false);
    }
    setAltNumbersLoading(false);
  };

  const handleViewCustomerCalls = (customerNumber) => {
    const customerCalls = filteredCalls.filter(call => call.customer_number === customerNumber);
  
    const enrichedCustomer = {
      number: customerNumber,
      calls: customerCalls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), // latest first
    };
  
    setViewCustomer(enrichedCustomer);
    setViewAllRemarksEdit(false);
    setViewAllRemarksInput('');
  };
  
  
  const handleViewAllRemarksEdit = () => {
    const remarks = customerMostRecentRemark(viewCustomer);
    const cleanRemarks = removeTimestampsAndTags('');
    setViewAllRemarksInput(cleanRemarks);
    setViewAllRemarksEdit(true);
  };
  
  const removeTimestampsAndTags = (text) => {
    return text
      .replace(/<[^>]*>/g, '') // remove HTML tags
      .replace(/\[\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\]/g, '') // remove [DD/MM/YYYY HH:MM:SS]
      .trim();
  };
  
  
  const customerMostRecentRemark = (customer) => {
    const mostRecentCall = customer?.calls?.[0];
    return mostRecentCall?.remarks || '';
  };

  const handleSaveViewAllRemarksWrapper = async () => {
    if (!viewCustomer?.calls?.[0]) return;
  
    setViewAllRemarksLoading(true);
  
    const timestamp = new Date().toLocaleString('en-GB'); // dd/mm/yyyy hh:mm:ss
    const newFormattedRemark = `${viewAllRemarksInput.trim()} <span style='font-size:10px;color:gray;'>[${timestamp}]</span>`;
    const oldRemarks = viewCustomer.calls[0]?.remarks || '';
    const updatedRemarks = `${newFormattedRemark}<br/>${oldRemarks}`;
  
    const callId = viewCustomer.calls[0].id;
  
    const res = await handleSaveViewAllRemarks(callId, { remarks: updatedRemarks }, token);
  
    if (res.success) {
      // ✅ Update locally — so UI shows updated immediately
      const updatedCalls = viewCustomer.calls.map(call =>
        call.id === callId ? { ...call, remarks: updatedRemarks } : call
      );
  
      setViewCustomer(prev => ({
        ...prev,
        calls: updatedCalls,
      }));
  
      setViewAllRemarksEdit(false);
      setViewAllRemarksInput('');
    }
  
    setViewAllRemarksLoading(false);
  };
  
  
  

  const tabClass = (key) =>
    `py-3 px-4 text-sm font-medium border-b-2 ${
      activeTab === key
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  useEffect(() => {
    if (user && token) {
      fetchCallDetails(token);
      fetchAgentDetails(token);
    }
  }, [user]);

  if (currentScreen === 'login') {
    return (
      <Login
        loginData={loginData}
        setLoginData={setLoginData}
        handleLogin={handleLogin}
        loading={loading}
        error={error}
      />
    );
  }

  const filteredCalls = callDetails.filter((call) => {
    const query = (callSearch || '').trim().toLowerCase();
    if (!query) return true;

    const hasMeeting = Boolean(call.meeting_datetime || (call.meeting_description && call.meeting_description.trim()));
    // If the user searches for 'meeting' (or similar), only show calls that have meeting info
    if (['meeting', 'meetings', 'meet'].includes(query)) {
      return hasMeeting;
    }

    const fields = [
      call.customer_number || '',
      call.agent_number || '',
      (call.name || '').replace(/<[^>]*>/g, ''),
      (call.remarks || '').replace(/<[^>]*>/g, ''),
      call.meeting_description || '',
      call.meeting_datetime ? new Date(call.meeting_datetime).toLocaleString() : ''
    ];
    return fields.join(' ').toLowerCase().includes(query);
  });

  const filteredAgents = agentDetails.filter((agent) =>
    agent.name?.toLowerCase().includes(agentSearch.toLowerCase())
  );

  return (
    <>
      <Dashboard
        user={user}
        handleLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabClass={tabClass}
        refreshCalls={refreshCalls}
        callSearch={callSearch}
        setCallSearch={setCallSearch}
        agentSearch={agentSearch}
        setAgentSearch={setAgentSearch}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        handleDateSearch={handleDateSearch}
        showCallExport={showCallExport}
        setShowCallExport={setShowCallExport}
        showAgentExport={showAgentExport}
        setShowAgentExport={setShowAgentExport}
        filteredCalls={filteredCalls}
        filteredAgents={filteredAgents}
        exportToExcel={exportToExcel}
        exportToPDF={exportToPDF}
        exportToCSV={exportToCSV}
        exportToXML={exportToXML}
        setShowAddModal={setShowAddModal}
        setFormData={setFormData}
        setError={setError}
        userRoleIsAdmin={userRoleIsAdmin}
        editingCallId={editingCallId}
        editInputs={editInputs}
        setEditInputs={setEditInputs}
        handleEditCall={handleEditCall}
        handleCancelEdit={handleCancelEdit}
        handleUpdateCall={(id) => handleUpdateCall(id, token)}
        editLoading={editLoading}
        formatDuration={formatDuration}
        callStatusClass={callStatusClass}
        handleViewCustomerCalls={handleViewCustomerCalls}
        handleOpenAltNumbersModal={handleOpenAltNumbersModal}
        callDetails={callDetails}
        openEditModal={openEditModal}
        handleDeleteAgent={(agentNum) => handleDeleteAgent(agentNum, token)}
        deleteLoading={deleteLoading}
        showAddModal={showAddModal}
        showEditModal={showEditModal}
        formData={formData}
        setShowEditModal={setShowEditModal}
        handleAddAgent={(data, onSuccess, onError, setLoading) =>
          handleAddAgent(data, token, onSuccess, onError, setLoading)
        }
        handleEditAgent={(data, onSuccess, onError, setLoading) =>
          handleEditAgent(data, token, onSuccess, onError, setLoading)
        }
        loading={loading}
        error={error}
        manualCallNumber={manualCallNumber}
        setManualCallNumber={setManualCallNumber}
        handleManualCall={handleManualCall}
      />

      <AddAgentModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        formData={formData}
        setFormData={setFormData}
        handleAddAgent={(e) => {
          e.preventDefault();
          handleAddAgent(formData, token, () => setShowAddModal(false), setError, () => {});
        }}
        loading={loading}
        error={error}
      />

      <EditAgentModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        handleEditAgent={(e) => {
          e.preventDefault();
          handleEditAgent(formData, token, () => setShowEditModal(false), setError, () => {});
        }}
        loading={loading}
        error={error}
        user={user}
      />

      <AltNumbersModal
        show={altModal}
        onClose={() => setAltModal(false)}
        selectedCall={selectedCall}
        altNumbersInput={altNumbersInput}
        setAltNumbersInput={setAltNumbersInput}
        handleSaveAltNumbers={handleSaveAltNumbersWrapper}
        altNumbersLoading={altNumbersLoading}
      />

      <ViewAllCallsModal
        show={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        viewCustomer={viewCustomer}
        viewAllRemarksEdit={viewAllRemarksEdit}
        viewAllRemarksInput={viewAllRemarksInput}
        setViewAllRemarksInput={setViewAllRemarksInput}
        handleViewAllRemarksEdit={handleViewAllRemarksEdit}
        handleSaveViewAllRemarks={handleSaveViewAllRemarksWrapper}
        viewAllRemarksLoading={viewAllRemarksLoading}
        setViewAllRemarksEdit={setViewAllRemarksEdit}
      />
    </>
  );
}

export default App;
