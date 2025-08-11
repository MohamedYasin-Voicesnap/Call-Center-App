import React from 'react';

const AltNumbersModal = ({ show, onClose, selectedCall, altNumbersInput, setAltNumbersInput, handleSaveAltNumbers, altNumbersLoading }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Alternative Numbers</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Customer: <span className="font-medium">{selectedCall?.customer_number}</span>
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alternative Numbers (comma-separated)
          </label>
          <textarea
            value={altNumbersInput}
            onChange={e => setAltNumbersInput(e.target.value)}
            placeholder="Enter alternative numbers separated by commas (e.g., +1234567890, +0987654321)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter phone numbers separated by commas. These will be associated with this customer.
          </p>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAltNumbers}
            disabled={altNumbersLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {altNumbersLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AltNumbersModal;