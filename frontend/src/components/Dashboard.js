import React from 'react';
import { Phone, LogOut, Users, Plus, Download } from 'lucide-react';
import CallsTable from './CallsTable';
import MissedCallsTable from './MissedCallsTable';
import AgentsTable from './AgentsTable';
import ManualCall from './ManualCall';

const Dashboard = ({
  user,
  handleLogout,
  activeTab,
  setActiveTab,
  tabClass,
  refreshCalls,
  callSearch,
  setCallSearch,
  agentSearch,
  setAgentSearch,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  handleDateSearch,
  showCallExport,
  setShowCallExport,
  showAgentExport,
  setShowAgentExport,
  filteredCalls,
  filteredAgents,
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportToXML,
  setShowAddModal,
  setFormData,
  setError,
  userRoleIsAdmin,
  editingCallId,
  editInputs,
  setEditInputs,
  handleEditCall,
  handleCancelEdit,
  handleUpdateCall,
  editLoading,
  formatDuration,
  callStatusClass,
  handleViewCustomerCalls,
  handleOpenAltNumbersModal,
  callDetails,
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
  manualCallNumber,
  setManualCallNumber,
  handleManualCall
}) => (
  <div className="min-h-screen bg-gray-100">
    {/* Header */}
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold text-gray-900">Call Center Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
    {/* Navigation Tabs */}
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <button onClick={() => setActiveTab('calls')} className={tabClass('calls')}>
            <Phone className="inline-block w-4 h-4 mr-2" /> Call Details
          </button>
          <button onClick={() => setActiveTab('missed')} className={tabClass('missed')}>
            <Phone className="inline-block w-4 h-4 mr-2 text-red-500" /> Missed Calls
          </button>
          <button onClick={() => setActiveTab('agents')} className={tabClass('agents')}>
            <Users className="inline-block w-4 h-4 mr-2" /> Agent Details
          </button>
          {user?.role !== 'admin' && (
            <button onClick={() => setActiveTab('manual-call')} className={tabClass('manual-call')}>
              <Phone className="inline-block w-4 h-4 mr-2" /> Manual Call
            </button>
          )}
        </div>
      </div>
    </nav>
    {/* Main content area (to be filled with tab content components) */}
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {activeTab === 'calls' && (
        <CallsTable
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          handleDateSearch={handleDateSearch}
          callSearch={callSearch}
          setCallSearch={setCallSearch}
          showCallExport={showCallExport}
          setShowCallExport={setShowCallExport}
          filteredCalls={filteredCalls}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
          exportToXML={exportToXML}
          editingCallId={editingCallId}
          editInputs={editInputs}
          setEditInputs={setEditInputs}
          handleEditCall={handleEditCall}
          handleCancelEdit={handleCancelEdit}
          handleUpdateCall={handleUpdateCall}
          editLoading={editLoading}
          formatDuration={formatDuration}
          callStatusClass={callStatusClass}
          handleViewCustomerCalls={handleViewCustomerCalls}
          handleOpenAltNumbersModal={handleOpenAltNumbersModal}
        />
      )}
      {activeTab === 'missed' && (
        <MissedCallsTable
          callDetails={callDetails}
          editingCallId={editingCallId}
          editInputs={editInputs}
          setEditInputs={setEditInputs}
          handleEditCall={handleEditCall}
          handleCancelEdit={handleCancelEdit}
          handleUpdateCall={handleUpdateCall}
          editLoading={editLoading}
          formatDuration={formatDuration}
          callStatusClass={callStatusClass}
          handleOpenAltNumbersModal={handleOpenAltNumbersModal}
        />
      )}
      {activeTab === 'agents' && (
          <AgentsTable
          user={user}
          agentSearch={agentSearch}
          setAgentSearch={setAgentSearch}
          showAgentExport={showAgentExport}
          setShowAgentExport={setShowAgentExport}
          filteredAgents={filteredAgents}
          exportToExcel={exportToExcel}
          exportToPDF={exportToPDF}
          exportToCSV={exportToCSV}
          exportToXML={exportToXML}
            refreshCalls={refreshCalls}
          setShowAddModal={setShowAddModal}
          setFormData={setFormData}
          setError={setError}
          userRoleIsAdmin={userRoleIsAdmin}
          openEditModal={openEditModal}
          handleDeleteAgent={handleDeleteAgent}
          deleteLoading={deleteLoading}
          showAddModal={showAddModal}
          showEditModal={showEditModal}
          formData={formData}
          setShowEditModal={setShowEditModal}
          handleAddAgent={handleAddAgent}
          handleEditAgent={handleEditAgent}
          loading={loading}
          error={error}
        />
      )}
      {activeTab === 'manual-call' && user?.role !== 'admin' && (
        <ManualCall
          manualCallNumber={manualCallNumber}
          setManualCallNumber={setManualCallNumber}
          handleManualCall={handleManualCall}
        />
      )}
      {activeTab !== 'calls' && activeTab !== 'missed' && activeTab !== 'agents' && activeTab !== 'manual-call' && (
        <div className="text-gray-400 text-center py-20">Tab content goes here (to be modularized next)</div>
      )}
    </main>
  </div>
);

export default Dashboard;