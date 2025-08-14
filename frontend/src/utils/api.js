const API_BASE = 'http://localhost:5000/api';

export const fetchCallDetails = async (authToken, from = '', to = '') => {
  try {
    let url = `${API_BASE}/calls`;
    const params = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.calls || [];
    }
  } catch (err) {
    console.error('Failed to fetch call details:', err);
  }
  return [];
};

export const fetchAgentDetails = async (authToken) => {
  try {
    const response = await fetch(`${API_BASE}/agents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.agents || [];
    }
  } catch (err) {
    console.error('Failed to fetch agent details:', err);
  }
  return [];
};

export const fetchAgentsCurrentStatus = async (authToken) => {
  try {
    const response = await fetch(`${API_BASE}/agents/current-status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.current_status || {};
    }
  } catch (err) {
    console.error('Failed to fetch agents current status:', err);
  }
  return {};
};

export const handleLogin = async (loginData) => {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Login failed' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

export const handleAddAgent = async (formData, token) => {
  try {
    const response = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Failed to add agent' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

export const handleEditAgent = async (formData, token) => {
  try {
    const response = await fetch(`${API_BASE}/agents/${formData.agent_number}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Failed to edit agent' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

export const handleDeleteAgent = async (agentNumber, token) => {
  try {
    const response = await fetch(`${API_BASE}/agents/${agentNumber}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Failed to delete agent' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

export const handleUpdateCall = async (callId, editInputs, token) => {
  try {
    const response = await fetch(`${API_BASE}/calls/${callId}/custom`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editInputs),
    });
    if (response.ok) {
      return { success: true };
    }
  } catch (err) {}
  return { success: false };
};

// Update only meeting info convenience API
export const handleUpdateMeeting = async (callId, meeting, token) => {
  try {
    const response = await fetch(`${API_BASE}/calls/${callId}/custom`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(meeting),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Failed to save meeting' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

export const handleSaveAltNumbers = async (callId, altNumbersInput, token) => {
  try {
    const response = await fetch(`${API_BASE}/calls/${callId}/alternative-numbers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ alternative_numbers: altNumbersInput }),
    });
    if (response.ok) {
      return { success: true };
    }
  } catch (err) {}
  return { success: false };
};

export const handleSaveViewAllRemarks = async (callId, remarksData, token) => {
  try {
    const response = await fetch(`${API_BASE}/calls/${callId}/custom`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(remarksData),
    });
    if (response.ok) {
      return { success: true };
    }
  } catch (err) {}
  return { success: false };
};

export const postAgentBreakStatus = async (breakData, token) => {
  try {
    const response = await fetch(`${API_BASE}/agents/breaks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(breakData),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Failed to save break status' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

export const downloadCallsTemplate = async (token) => {
  const res = await fetch(`${API_BASE}/calls/upload-template`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calls_upload_template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
};

export const uploadCallsExcel = async (file, token) => {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`${API_BASE}/calls/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, message: data.message || 'Upload failed' };
  } catch (e) {
    return { success: false, message: 'Network error' };
  }
};

export const uploadCallCorrections = async (rows, token) => {
  try {
    const res = await fetch(`${API_BASE}/calls/upload-corrections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, message: data.message || 'Correction upload failed' };
  } catch (e) {
    return { success: false, message: 'Network error' };
  }
};

export const fetchCallRecordingUrl = async (callId, token) => {
  const res = await fetch(`${API_BASE}/calls/${callId}/recording`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const fetchAllAgentBreaks = async (token, search = '') => {
  try {
    let url = `${API_BASE}/agents/breaks`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json();
      return data.breaks || {};
    }
  } catch (err) {
    console.error('Failed to fetch agent breaks:', err);
  }
  return {};
};

export const closeLatestAgentBreak = async (agentNumber, breakEnd, token) => {
  try {
    const response = await fetch(`${API_BASE}/agents/breaks/close`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ agent_number: agentNumber, break_end: breakEnd }),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, message: data.message || 'Failed to close break' };
    }
  } catch (err) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};

// Company info for admin/agent gating
export const fetchCompanyInfo = async (token) => {
  try {
    const res = await fetch(`${API_BASE}/company`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      return data.company || null;
    }
  } catch (e) {}
  return null;
};

// Master: list companies created by master
export const fetchMasterCompanies = async (token) => {
  try {
    const res = await fetch(`${API_BASE}/master/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      return data.companies || [];
    }
  } catch (e) {}
  return [];
};

// Master: create company
export const createCompany = async (form, token) => {
  try {
    const res = await fetch(`${API_BASE}/master/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, message: data.message || 'Failed to create company' };
  } catch (e) {
    return { success: false, message: 'Network error' };
  }
};

// Master: update company
export const updateCompany = async (companyId, form, token) => {
  try {
    const res = await fetch(`${API_BASE}/master/companies/${companyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, message: data.message || 'Failed to update company' };
  } catch (e) {
    return { success: false, message: 'Network error' };
  }
};

// Master: stop company service
export const stopCompany = async (companyId, token) => {
  try {
    const res = await fetch(`${API_BASE}/master/companies/${companyId}/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) return { success: true, data };
    return { success: false, message: data.message || 'Failed to stop company' };
  } catch (e) {
    return { success: false, message: 'Network error' };
  }
};