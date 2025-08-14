import { useState } from 'react';
import { fetchCallDetails as apiFetchCallDetails, handleUpdateCall as apiHandleUpdateCall } from '../utils/api';

export default function useCalls() {
  const [callDetails, setCallDetails] = useState([]);
  const [editingCallId, setEditingCallId] = useState(null);
  const [editInputs, setEditInputs] = useState({ remarks: '', name: '', remarks_status: '', recordings: '', alternative_numbers: '' });
  const [editLoading, setEditLoading] = useState(false);

  const fetchCallDetails = async (authToken, from = '', to = '') => {
    const calls = await apiFetchCallDetails(authToken, from, to);
    setCallDetails(calls);
  };

  const handleEditCall = (call) => {
    setEditingCallId(call.id);
    setEditInputs({ remarks: '', name: '', remarks_status: '', recordings: '', alternative_numbers: '' });
  };

  const handleCancelEdit = () => {
    setEditingCallId(null);
    setEditInputs({ remarks: '', name: '', remarks_status: '', recordings: '', alternative_numbers: '' });
  };

  const handleUpdateCall = async (callId, token) => {
    setEditLoading(true);
    const result = await apiHandleUpdateCall(callId, editInputs, token);
    if (result.success) {
      await fetchCallDetails(token);
      setEditingCallId(null);
      setEditInputs({ remarks: '', name: '', remarks_status: '', recordings: '', alternative_numbers: '' });
    }
    setEditLoading(false);
  };

  const resetCalls = () => {
    setCallDetails([]);
    setEditingCallId(null);
    setEditInputs({});
  };

  return {
    callDetails,
    setCallDetails,
    fetchCallDetails,
    editingCallId,
    setEditingCallId,
    editInputs,
    setEditInputs,
    editLoading,
    setEditLoading,
    handleEditCall,
    handleCancelEdit,
    handleUpdateCall,
    resetCalls,
  };
}