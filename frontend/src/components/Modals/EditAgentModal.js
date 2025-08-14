import React from 'react';

const EditAgentModal = ({ show, onClose, formData, setFormData, handleEditAgent, loading, error, user }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>&times;</button>
        <h3 className="text-lg font-bold mb-4">Edit Agent</h3>
        <form className="space-y-4" onSubmit={handleEditAgent}>
          {user?.role === 'admin' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Agent Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\\d*"
                  className="w-full border px-3 py-2 rounded bg-gray-100"
                  value={(formData.agent_number || '').toString()}
                  disabled
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
                <input type="password" className="w-full border px-3 py-2 rounded" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} />
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
                <input type="checkbox" id="is_admin_edit" checked={!!formData.is_admin} onChange={e => setFormData({ ...formData, is_admin: e.target.checked })} />
                <label htmlFor="is_admin_edit" className="ml-2 text-sm">Admin</label>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Password </label>
                <input type="password" className="w-full border px-3 py-2 rounded" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            </>
          )}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
};

export default EditAgentModal;