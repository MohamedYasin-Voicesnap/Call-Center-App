import React from 'react';

export default function CompanyBlockedOverlay({ message, onLogout, user }) {
  if (!message) return null;
  const isMaster = user?.role === 'master';
  // Only block admins/agents. Master should never see this overlay.
  if (isMaster) return null;
  return (
    <div className="fixed inset-0 bg-white bg-opacity-100 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center border">
        <h3 className="text-xl font-bold mb-3">Service Unavailable</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onLogout} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Logout</button>
        </div>
        <div className="text-sm text-gray-500 mt-4">Please contact the sales person.</div>
      </div>
    </div>
  );
}


