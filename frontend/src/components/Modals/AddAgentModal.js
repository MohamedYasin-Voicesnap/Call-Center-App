import React from 'react';

const AddAgentModal = ({ show, onClose, formData, setFormData, handleAddAgent, loading, error }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Add Agent</h3>
        <form className="space-y-4" onSubmit={handleAddAgent}>
          <div>
            <label className="block text-sm font-medium mb-1">Agent Number</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{10}"
              className="w-full border px-3 py-2 rounded"
              value={formData.agent_number}
              onChange={e => setFormData({ ...formData, agent_number: (e.target.value || '').replace(/\D+/g, '') })}
              placeholder="10-digit mobile (e.g., 9876543210)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" className="w-full border px-3 py-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full border px-3 py-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="text" className="w-full border px-3 py-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full border px-3 py-2 rounded" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Removed">Removed</option>
            </select>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="is_admin_add" checked={formData.is_admin} onChange={e => setFormData({ ...formData, is_admin: e.target.checked })} />
            <label htmlFor="is_admin_add" className="ml-2 text-sm">Admin</label>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600" disabled={loading}>{loading ? 'Adding...' : 'Add Agent'}</button>
        </form>
      </div>
    </div>
  );
};

export default AddAgentModal;