import React, { useState } from 'react';
import { Download, Phone, Play as PlayIcon, Pause as PauseIcon, Loader2 } from 'lucide-react';
import { getLatestCallsByCustomer } from '../utils/format';
import { handleUpdateMeeting, fetchCallRecordingUrl } from '../utils/api';
const CallsTable = ({
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  handleDateSearch,
  callSearch,
  setCallSearch,
  showCallExport,
  setShowCallExport,
  filteredCalls,
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportToXML,
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
  handleOpenAltNumbersModal
}) => {
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
        // remove trailing timestamp, if stored at end
        .replace(/\s*\[[^\]]*\]\s*$/, '')
        // remove leading timestamp and optional pipe, if stored at start
        .replace(/^\s*\[[^\]]*\]\s*\|?\s*/,'')
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

  const [meetingModal, setMeetingModal] = useState({ open: false, call: null });
  const [meetingForm, setMeetingForm] = useState({ date: '', time: '', description: '' });
  const [recordingUrlById, setRecordingUrlById] = useState({});
  const [loadingRecordingById, setLoadingRecordingById] = useState({});
  const [playingById, setPlayingById] = useState({});
  const [progressById, setProgressById] = useState({});
  const audioRefs = React.useRef({});

  const formatTime = (sec = 0) => {
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor((sec / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(sec / 3600);
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const openMeeting = (call) => {
    const dt = call.meeting_datetime ? new Date(call.meeting_datetime) : null;
    setMeetingForm({
      date: dt ? dt.toISOString().slice(0, 10) : '',
      time: dt ? dt.toTimeString().slice(0, 5) : '',
      description: call.meeting_description || '',
    });
    setMeetingModal({ open: true, call });
  };

  const saveMeeting = async () => {
    if (!meetingModal.call) return;
    const token = localStorage.getItem('token');
    const meeting_datetime = meetingForm.date && meetingForm.time
      ? `${meetingForm.date} ${meetingForm.time}:00`
      : null;
    const res = await handleUpdateMeeting(meetingModal.call.id, {
      meeting_datetime,
      meeting_description: meetingForm.description,
    }, token);
    if (res.success) {
      // Optimistically update the row in memory
      const idx = filteredCalls.findIndex(c => c.id === meetingModal.call.id);
      if (idx !== -1) {
        filteredCalls[idx].meeting_datetime = meeting_datetime;
        filteredCalls[idx].meeting_description = meetingForm.description;
      }
      setMeetingModal({ open: false, call: null });
    }
  };

  return (
  <>
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-medium text-gray-900">Call Details Report</h2>
      <div className="flex flex-row items-center gap-2 mt-2 sm:mt-0">
        <label className="text-xs font-medium text-gray-500">From</label>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs" style={{ width: 120 }} title="From date" />
        <label className="text-xs font-medium text-gray-500 ml-2">To</label>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs" style={{ width: 120 }} title="To date" />
        <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 ml-2" onClick={handleDateSearch} style={{ minWidth: 90 }}>Search</button>
        <input type="text" placeholder="Search calls..." value={callSearch} onChange={e => setCallSearch(e.target.value)} className="border px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ml-4" style={{ width: 180 }} />
        <div className="relative ml-2">
          <button onClick={() => setShowCallExport(v => !v)} className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600" style={{ minWidth: 90 }}>
            <Download className="w-4 h-4 mr-1" /> Export
          </button>
          {showCallExport && (
            <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10">
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToExcel(filteredCalls, 'calls'); setShowCallExport(false); }}>Excel</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToPDF(filteredCalls, 'calls', ['agent_number','customer_number','duration','call_status','timestamp']); setShowCallExport(false); }}>PDF</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToCSV(filteredCalls, 'calls'); setShowCallExport(false); }}>CSV</button>
              <button className="block w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { exportToXML(filteredCalls, 'calls'); setShowCallExport(false); }}>XML</button>
            </div>
          )}
        </div>
      </div>
    </div>
    {/* Table rendering will be filled in next modularization step */}

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
    
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recordings</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alt Numbers</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule Meeting</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click to Call</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
  </tr>
</thead>
<tbody className="bg-white divide-y divide-gray-200">
{getLatestCallsByCustomer(filteredCalls.filter(call => call.call_status === 'Completed')).map((call) => {
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
      <td className="px-6 py-2 whitespace-normal break-words text-sm align-top text-left" style={{ minWidth: 180, maxWidth: 220 }}>
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
      <td className="px-6 py-2 whitespace-normal break-words text-sm align-top text-left" style={{ minWidth: 220, maxWidth: 320 }}>
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

      <td className="px-6 py-4 text-sm">
        {call.has_recording ? (
          recordingUrlById[call.id] ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-2 py-1 w-[280px]">
              <button
                className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                onClick={() => {
                  const a = audioRefs.current[call.id];
                  if (!a) return;
                  if (a.paused) {
                    a.play();
                  } else {
                    a.pause();
                  }
                }}
                title={playingById[call.id] ? 'Pause' : 'Play'}
              >
                {playingById[call.id] ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(progressById[call.id]?.duration || 0, 0.001)}
                step={0.1}
                value={progressById[call.id]?.currentTime || 0}
                onChange={(e) => {
                  const a = audioRefs.current[call.id];
                  if (!a) return;
                  a.currentTime = Number(e.target.value);
                }}
                className="flex-1 accent-blue-500"
              />
              <div className="text-[10px] text-gray-600 w-[72px] text-right">
                {formatTime(progressById[call.id]?.currentTime || 0)} / {formatTime(progressById[call.id]?.duration || 0)}
              </div>
              <audio
                ref={(el) => { if (el) audioRefs.current[call.id] = el; }}
                src={recordingUrlById[call.id]}
                preload="metadata"
                onPlay={() => setPlayingById((p) => ({ ...p, [call.id]: true }))}
                onPause={() => setPlayingById((p) => ({ ...p, [call.id]: false }))}
                onLoadedMetadata={(e) => {
                  const a = e.currentTarget;
                  setProgressById((p) => ({ ...p, [call.id]: { currentTime: a.currentTime, duration: a.duration } }));
                }}
                onTimeUpdate={(e) => {
                  const a = e.currentTarget;
                  setProgressById((p) => ({ ...p, [call.id]: { currentTime: a.currentTime, duration: a.duration } }));
                }}
                className="hidden"
              />
            </div>
          ) : (
            <button
              className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-60"
              disabled={loadingRecordingById[call.id]}
              onClick={async () => {
                const token = localStorage.getItem('token');
                try {
                  setLoadingRecordingById((m) => ({ ...m, [call.id]: true }));
                  const url = await fetchCallRecordingUrl(call.id, token);
                  if (url) {
                    setRecordingUrlById(prev => ({ ...prev, [call.id]: url }));
                  } else {
                    alert('Recording not found or could not be loaded.');
                  }
                } catch (e) {
                  alert('Failed to load recording.');
                } finally {
                  setLoadingRecordingById((m) => ({ ...m, [call.id]: false }));
                }
              }}
            >
              {loadingRecordingById[call.id] ? <Loader2 size={14} className="animate-spin" /> : <PlayIcon size={14} />}<span>Play</span>
            </button>
          )
        ) : (
          <span className="text-gray-400 text-xs">No recordings</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center space-x-2">
          {call.alternative_numbers ? (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {call.alternative_numbers.split(',').length} alt
              </span>
              <button
                onClick={() => handleOpenAltNumbersModal(call)}
                className="text-blue-500 hover:text-blue-700 text-xs"
                title="View/Edit Alternative Numbers"
              >
                <span className="underline">View</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleOpenAltNumbersModal(call)}
              className="text-blue-500 hover:text-blue-700 text-xs"
              title="Add Alternative Numbers"
            >
              <span className="underline">Add</span>
            </button>
          )}
        </div>
      </td>
      {/* Schedule meeting cell */}
      <td className="px-6 py-4 text-sm">
        {call.meeting_datetime ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-700">
              {new Date(call.meeting_datetime).toLocaleString()} 
            </div>
            {call.meeting_description && (
              <div className="text-xs text-gray-500 truncate max-w-[180px]" title={call.meeting_description}>{call.meeting_description}</div>
            )}
            <button className="text-blue-500 text-xs underline" onClick={() => openMeeting(call)}>Edit</button>
          </div>
        ) : (
          <button className="text-blue-500 text-xs underline" onClick={() => openMeeting(call)}>Add</button>
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
      <button
          className="text-blue-500 hover:underline mr-2"
          onClick={() => handleViewCustomerCalls(call.customer_number)}
        >
          View All
        </button>
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
                  </td>
                </tr>
              );
            })}
</tbody>

              </table>
            </div>
    </div>

    {/* Meeting modal */}
    {meetingModal.open && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
          <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setMeetingModal({ open: false, call: null })}>&times;</button>
          <h3 className="text-lg font-bold mb-4">Schedule Meeting</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" className="w-full border px-3 py-2 rounded" value={meetingForm.date} onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input type="time" className="w-full border px-3 py-2 rounded" value={meetingForm.time} onChange={e => setMeetingForm({ ...meetingForm, time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="w-full border px-3 py-2 rounded" rows={3} value={meetingForm.description} onChange={e => setMeetingForm({ ...meetingForm, description: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600" onClick={() => setMeetingModal({ open: false, call: null })}>Cancel</button>
              <button className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600" onClick={saveMeeting}>Save</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CallsTable;