export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const callStatusClass = (status) =>
  `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
    status === 'Completed'
      ? 'bg-green-100 text-green-800'
      : status === 'Missed'
      ? 'bg-red-100 text-red-800'
    : status === 'Uploaded'
      ? 'bg-purple-100 text-purple-800'
      : 'bg-yellow-100 text-yellow-800'
  }`;

export const agentStatusClass = (status) =>
  `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
    status === 'Active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }`;

  export const getLatestCallsByCustomer = (calls) => {
    const grouped = {};
    calls.forEach(call => {
      const existing = grouped[call.customer_number];
      if (!existing || new Date(call.timestamp) > new Date(existing.timestamp)) {
        grouped[call.customer_number] = call;
      }
    });
    return Object.values(grouped);
  };
  