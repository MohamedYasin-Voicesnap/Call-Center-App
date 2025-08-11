import React from 'react';
import { Phone } from 'lucide-react';
import { getLatestCallsByCustomer } from '../utils/format';
const MissedCallsTable = ({
  callDetails,
  editingCallId,
  editInputs,
  setEditInputs,
  handleEditCall,
  handleCancelEdit,
  handleUpdateCall,
  editLoading,
  formatDuration,
  callStatusClass,
  handleOpenAltNumbersModal
}) => {
  // Helper to get latest missed/failed calls by customer
  const getLatestMissedCallsByCustomer = (calls) => {
    const grouped = {};
    calls.forEach(call => {
      if (call.call_status === 'Missed' || call.call_status === 'Failed' || call.call_status === 'Uploaded') {
        const existing = grouped[call.customer_number];
        if (!existing || new Date(call.timestamp) > new Date(existing.timestamp)) {
          grouped[call.customer_number] = call;
        }
      }
    });
    return Object.values(grouped);
  };

  const missedCalls = getLatestMissedCallsByCustomer(callDetails);

  const parseRemarks = (remarksHtml) => {
    if (!remarksHtml) return [];
    const parts = remarksHtml
      .split(/<br\s*\/?>|\s*\|\s*/i)
      .map((p) => p.trim())
      .filter(Boolean);
    const entries = parts.map((part) => {
      const tsMatch = part.match(/\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\]/);
      const tsString = tsMatch ? tsMatch[1] : null;
      const text = part
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        .replace(/\s*\[[^\]]*\]\s*$/, '')
        .replace(/^\s*\[[^\]]*\]\s*\|?\s*/, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      let tsDate = 0;
      if (tsString) {
        const [d, m, y, hh, mm, ss] = tsString
          .replace(/\//g, ' ')
          .replace(/:/g, ' ')
          .split(' ');
        tsDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10)).getTime();
      }
      return { text, tsString, tsDate };
    });
    return entries.sort((a, b) => b.tsDate - a.tsDate);
  };

  return (
    <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-medium text-gray-900">Missed Calls Report</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Number</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Number</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click to Call</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {getLatestCallsByCustomer(callDetails.filter(call => call.call_status === 'Missed' || call.call_status === 'Failed' || call.call_status === 'Uploaded')).map((call) => {
            const dateObj = new Date(call.timestamp);
            const date = dateObj.toLocaleDateString();
            const time = dateObj.toLocaleTimeString();
            const isEditing = editingCallId === call.id;
            return (
              <tr key={call.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{call.customer_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{time}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={callStatusClass(call.call_status)}>{call.call_status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDuration(call.duration)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{call.agent_number}</td>
                {/* Name column - value only */}
                <td className="px-6 py-2 whitespace-normal break-words text-sm align-top text-left"style={{width: 220, maxWidth: 220, minWidth: 180, position: 'relative' }}>
                  {isEditing ? (
                    <textarea
                      className="border px-2 py-1 rounded"
                      style={{ width: '100%', minHeight: 48, resize: 'vertical' }}
                      value={editInputs.name}
                      onChange={e => setEditInputs({ ...editInputs, name: e.target.value })}
                      placeholder="Enter name"
                      rows={3}
                    />
                  ) : (
                    <div style={{ minHeight: 48, wordBreak: 'break-word' }}>
                      {(call.name || '').replace(/<span.*?>.*?<\/span>/g, '').replace(/\|$/, '').trim()}
                    </div>
                  )}
                </td>
                {/* Remarks column - editable */}
                <td className="px-6 py-2 whitespace-normal break-words text-sm align-top text-left" style={{width: 240, maxWidth: 320, minWidth: 200}}>
                  {isEditing ? (
                    <textarea
                      className="border px-2 py-1 rounded"
                      style={{ width: '100%', minHeight: 64, resize: 'vertical' }}
                      value={editInputs.remarks}
                      onChange={e => setEditInputs({ ...editInputs, remarks: e.target.value })}
                      placeholder="Enter remarks (new entry)"
                      rows={4}
                    />
                  ) : (
                    call.remarks ? (
                      <div className="text-gray-800 space-y-2">
                        {parseRemarks(call.remarks).map((r, idx) => (
                          <div key={idx} className="leading-snug">
                            <span>{r.text}</span>{' '}
                            {r.tsString && (
                              <span className="text-[10px] text-gray-500">[{r.tsString}]</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                <a
                    href={`sip:${call.customer_number}@192.168.31.22`}
                    className="ml-2 text-green-600 hover:underline"
                    style={{ marginLeft: 8 }}
                  >
                     <Phone size={16} />
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex gap-2">
                  
                  {isEditing ? (
                    <>
                      <button
                        className="text-green-600 hover:underline mr-2"
                        onClick={() => handleUpdateCall(call.id)}
                        disabled={editLoading}
                      >
                        {editLoading ? 'Updating...' : 'Update'}
                      </button>
                      <button
                        className="text-gray-500 hover:underline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="text-orange-500 hover:underline"
                        onClick={() => handleEditCall(call)}
                      >
                        Edit
                      </button>
                    </>
                  )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default MissedCallsTable;