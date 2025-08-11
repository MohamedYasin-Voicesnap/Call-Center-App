import { useState } from 'react';
import {
  fetchAgentDetails as apiFetchAgentDetails,
  handleAddAgent as apiHandleAddAgent,
  handleEditAgent as apiHandleEditAgent,
  handleDeleteAgent as apiHandleDeleteAgent,
  postAgentBreakStatus,
  fetchAllAgentBreaks
} from '../utils/api';
import { closeLatestAgentBreak as apiCloseLatestAgentBreak } from '../utils/api';
import { fetchAgentsCurrentStatus as apiFetchAgentsCurrentStatus } from '../utils/api';

export default function useAgents() {
  const [agentDetails, setAgentDetails] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentStatusMap, setCurrentStatusMap] = useState({});

  const fetchAgentDetails = async (authToken) => {
    const agents = await apiFetchAgentDetails(authToken);
    setAgentDetails(agents);
  };

  const refreshAgentsCurrentStatus = async (authToken) => {
    const map = await apiFetchAgentsCurrentStatus(authToken);
    setCurrentStatusMap(map);
  };

  const handleAddAgent = async (formData, token, onSuccess, onError, setLoading) => {
    setLoading(true);
    const result = await apiHandleAddAgent(formData, token);
    if (result.success) {
      if (onSuccess) onSuccess();
      fetchAgentDetails(token);
    } else {
      if (onError) onError(result.message);
    }
    setLoading(false);
  };

  const handleEditAgent = async (formData, token, onSuccess, onError, setLoading) => {
    setLoading(true);
    const result = await apiHandleEditAgent(formData, token);
    if (result.success) {
      if (onSuccess) onSuccess();
      fetchAgentDetails(token);
    } else {
      if (onError) onError(result.message);
    }
    setLoading(false);
  };

  const handleDeleteAgent = async (agentNumber, token, onSuccess, onError) => {
    setDeleteLoading(true);
    const result = await apiHandleDeleteAgent(agentNumber, token);
    if (result.success) {
      setAgentDetails(prev => prev.filter(agent => agent.agent_number !== agentNumber));
      if (onSuccess) onSuccess();
    } else {
      if (onError) onError(result.message);
    }
    setDeleteLoading(false);
  };

  // Save agent break/working status
  const saveAgentBreakStatus = async (breakData, token) => {
    return await postAgentBreakStatus(breakData, token);
  };

  // Close latest ongoing break
  const closeLatestAgentBreak = async (agentNumber, breakEnd, token) => {
    return await apiCloseLatestAgentBreak(agentNumber, breakEnd, token);
  };

  // Fetch all agent break/working status records (admin)
  const getAllAgentBreaks = async (token, search = '') => {
    return await fetchAllAgentBreaks(token, search);
  };

  return {
    agentDetails,
    setAgentDetails,
    currentStatusMap,
    refreshAgentsCurrentStatus,
    fetchAgentDetails,
    handleAddAgent,
    handleEditAgent,
    handleDeleteAgent,
    deleteLoading,
    setDeleteLoading,
    saveAgentBreakStatus,
    closeLatestAgentBreak,
    getAllAgentBreaks
  };
}