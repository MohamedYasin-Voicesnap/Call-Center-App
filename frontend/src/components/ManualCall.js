import React from 'react';
import { Phone } from 'lucide-react';

const ManualCall = ({ manualCallNumber, setManualCallNumber, handleManualCall, isBlocked }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-medium text-gray-900">Manual Call</h2>
    </div>
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <div className="space-y-4">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={manualCallNumber}
              onChange={e => setManualCallNumber(e.target.value)}
              placeholder="Enter phone number (e.g., +1234567890)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isBlocked}
            />
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleManualCall}
              className="flex items-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              disabled={isBlocked}
            >
              <Phone size={20} />
              <span>Call Now</span>
            </button>
          </div>
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>This feature allows you to initiate a call to any phone number.</p>
            <p className="mt-1">Note: This is a placeholder interface - no actual calls will be made.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ManualCall;