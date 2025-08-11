import React from 'react';

const ViewAllCallsModal = ({
  show,
  onClose,
  viewCustomer,
}) => {
  if (!show) return null;
  const mostRecentCall = viewCustomer?.calls?.[0];

  // Parse combined remarks HTML into an ordered list of entries with timestamps
  const parseRemarks = (remarksHtml) => {
    if (!remarksHtml) return [];
    // Split by <br/> boundaries and clean empty parts
    const parts = remarksHtml
      .split(/<br\s*\/?>|\s*\|\s*/i)
      .map((p) => p.trim())
      .filter(Boolean);
    const entries = parts.map((part) => {
      // Extract timestamp in square brackets inserted during save, e.g., [...]
      const tsMatch = part.match(/\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})\]/);
      const tsString = tsMatch ? tsMatch[1] : null;
      // Strip any span tags and timestamp label
      const text = part
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        .replace(/\s*\[[^\]]*\]\s*$/, '')
        .replace(/^\s*\[[^\]]*\]\s*\|?\s*/, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      let tsDate = null;
      if (tsString) {
        // Parse dd/mm/yyyy hh:mm:ss
        const [d, m, y, hh, mm, ss] = tsString
          .replace(/\//g, ' ')
          .replace(/:/g, ' ')
          .split(' ');
        tsDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10));
      }
      return { text, tsString, tsDate: tsDate ? tsDate.getTime() : 0 };
    });
    // Sort newest first
    return entries.sort((a, b) => b.tsDate - a.tsDate);
  };
  const parsedCustomerRemarks = parseRemarks(mostRecentCall?.remarks || '');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Call History: {viewCustomer?.number}</h2>
        {/* Customer Remarks Section removed as requested */}
        {/* Call History Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recordings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alt Numbers</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {viewCustomer?.calls?.map(call => {
                const dateObj = new Date(call.timestamp);
                return (
                  <tr key={call.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{dateObj.toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{dateObj.toLocaleTimeString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={call.call_status === 'Completed' ? 'bg-green-100 text-green-800' : call.call_status === 'Missed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'} style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>{call.call_status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{call.agent_number}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm align-top" style={{ minWidth: 220, maxWidth: 420 }}>
                      {call.remarks ? (
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
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {call.recordings ? (
                        <div className="space-y-1">
                          {call.recordings.split(',').map((recording, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600" onClick={() => window.open(recording.trim(), '_blank')}>
                                <span className="mr-1">▶</span>Play
                              </button>
                              <span className="text-xs text-gray-600">Recording {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No recordings</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {call.alternative_numbers ? (
                        <div className="text-xs text-gray-600">
                          {call.alternative_numbers.split(',').map((num, index) => (
                            <div key={index} className="mb-1">{num.trim()}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewAllCallsModal;