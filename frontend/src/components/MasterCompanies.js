import React, { useEffect, useState } from 'react';
import { createCompany, fetchMasterCompanies, stopCompany, updateCompany } from '../utils/api';

const emptyForm = {
  name: '',
  admin_username: '',
  admin_password: '',
  email: '',
  contact_no: '',
  payment_status: 'Paid'
};

export default function MasterCompanies() {
  const token = localStorage.getItem('token');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    setLoading(true);
    const list = await fetchMasterCompanies(token);
    setCompanies(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const res = await createCompany(form, token);
    if (res.success) {
      setShowCreate(false);
      setForm(emptyForm);
      await load();
    } else {
      setError(res.message || 'Failed to create company');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    const res = await updateCompany(editingId, editForm, token);
    if (res.success) {
      setEditingId(null);
      setEditForm({});
      await load();
    } else {
      alert(res.message || 'Failed to update');
    }
  };

  const handleStop = async (id) => {
    const res = await stopCompany(id, token);
    if (res.success) await load();
    else alert(res.message || 'Failed to stop');
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Companies</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          Create Company
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map(c => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.admin_username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.contact_no || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{c.payment_status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{c.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, admin_username: c.admin_username, admin_password: c.admin_password, email: c.email, contact_no: c.contact_no, payment_status: c.payment_status, status: c.status }); }}
                      >
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-800" onClick={() => handleStop(c.id)}>
                        Stop Service
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>&times;</button>
            <h3 className="text-lg font-bold mb-4">Create Company</h3>
            <form className="space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input className="w-full border px-3 py-2 rounded" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Username</label>
                  <input
                    className="w-full border px-3 py-2 rounded"
                    inputMode="numeric"
                    value={form.admin_username}
                    onChange={e => setForm({ ...form, admin_username: (e.target.value || '').replace(/\D+/g, '') })}
                    placeholder="Enter numbers only"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Password</label>
                  <input type="password" className="w-full border px-3 py-2 rounded" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="w-full border px-3 py-2 rounded" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact No</label>
                  <input className="w-full border px-3 py-2 rounded" value={form.contact_no} onChange={e => setForm({ ...form, contact_no: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Status</label>
                <select className="w-full border px-3 py-2 rounded" value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })}>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex gap-2 pt-2">
                <button type="button" className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>Cancel</button>
                <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => { setEditingId(null); setEditForm({}); }}>&times;</button>
            <h3 className="text-lg font-bold mb-4">Edit Company</h3>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input className="w-full border px-3 py-2 rounded" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Username</label>
                  <input
                    className="w-full border px-3 py-2 rounded"
                    inputMode="numeric"
                    value={editForm.admin_username || ''}
                    onChange={e => setEditForm({ ...editForm, admin_username: (e.target.value || '').replace(/\D+/g, '') })}
                    placeholder="Enter numbers only"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Password</label>
                  <input type="text" className="w-full border px-3 py-2 rounded" value={editForm.admin_password || ''} onChange={e => setEditForm({ ...editForm, admin_password: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="w-full border px-3 py-2 rounded" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact No</label>
                  <input className="w-full border px-3 py-2 rounded" value={editForm.contact_no || ''} onChange={e => setEditForm({ ...editForm, contact_no: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Status</label>
                  <select className="w-full border px-3 py-2 rounded" value={editForm.payment_status || 'Paid'} onChange={e => setEditForm({ ...editForm, payment_status: e.target.value })}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="w-full border px-3 py-2 rounded" value={editForm.status || 'Active'} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Partially Close">Partially Close</option>
                    <option value="Fully Close">Fully Close</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</button>
                <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




