import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { registerUser, getUsers, deleteUser } from '../utils/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons'; // Unified Icons

export default function AdminUsers() {
    const { user } = useAuth();

    // States for Create User
    const [newUser, setNewUser] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newRole, setNewRole] = useState('user'); // user | admin
    const [isCreating, setIsCreating] = useState(false);

    // States for User List
    const [userList, setUserList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const loadUsers = async () => {
        setLoadingUsers(true);
        setFetchError(null);
        const res = await getUsers(user.role);
        setLoadingUsers(false);
        if (res.success) {
            setUserList(res.data);
        } else {
            // Handle specific "Unknown action" error gracefully
            const errMsg = res.error || '';
            if (errMsg.includes('Unknown action')) {
                setFetchError('Backend script missing "getUsers" function. Please update Google Apps Script.');
            } else {
                toast.error('Gagal load users: ' + errMsg);
                setFetchError(errMsg);
            }
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUser || !newPass) {
            toast.error('Username & Password wajib diisi');
            return;
        }

        setIsCreating(true);
        const res = await registerUser(newUser, newPass, newRole, user.role);
        setIsCreating(false);

        if (res.success) {
            toast.success(`User '${newUser}' berhasil dibuat!`);
            setNewUser('');
            setNewPass('');
            loadUsers(); // Refresh list
        } else {
            toast.error('Gagal: ' + res.error);
        }
    };

    const handleDeleteUser = async (targetUser) => {
        if (!window.confirm(`Yakin hapus user '${targetUser}'?`)) return;

        const toastId = toast.loading('Deleting...');
        const res = await deleteUser(user.username, user.role, targetUser);

        if (res.success) {
            toast.success('User deleted!', { id: toastId });
            loadUsers();
        } else {
            toast.error('Gagal hapus: ' + res.error, { id: toastId });
        }
    };

    // Load users on mount
    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <div className="admin-users-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

            {/* SECTION 1: CREATE USER */}
            <div className="admin-card" style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#ecfccb', color: '#4d7c0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icons.User size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#444' }}>Create New User</h3>
                </div>

                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#666' }}>Username</label>
                        <input
                            placeholder="e.g. gudang01"
                            value={newUser}
                            onChange={e => setNewUser(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#666' }}>Password</label>
                        <input
                            placeholder="••••••••"
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#666' }}>Role</label>
                        <select
                            value={newRole}
                            onChange={e => setNewRole(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, background: 'white' }}
                        >
                            <option value="user">User Biasa (Gudang/Sales)</option>
                            <option value="admin">Admin (Full Access)</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="action-btn" // Reusing action-btn from App.css probably? Or define style
                        disabled={isCreating}
                        style={{
                            marginTop: 10,
                            justifyContent: 'center',
                            background: '#D4AF37',
                            color: 'white',
                            border: 'none',
                            padding: 12,
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {isCreating ? 'Creating...' : '➕ Create User'}
                    </button>
                    <p style={{ fontSize: 12, color: '#999', margin: 0, textAlign: 'center' }}>
                        User baru akan langsung bisa login.
                    </p>
                </form>
            </div>

            {/* SECTION 2: USER LIST */}
            <div className="admin-card" style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icons.Database size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#444' }}>User List</h3>
                    </div>
                    <button onClick={loadUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }} title="Refresh">
                        <Icons.Refresh size={18} />
                    </button>
                </div>

                {loadingUsers ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Loading users...</div>
                ) : fetchError ? (
                    <div style={{ padding: 15, background: '#fef2f2', color: '#b91c1c', borderRadius: 8, fontSize: 13, border: '1px solid #fecaca' }}>
                        <strong>Error:</strong> {fetchError}
                    </div>
                ) : (
                    <div className="user-list-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <ul className="user-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {userList.length === 0 && <p style={{ color: '#999', textAlign: 'center', fontStyle: 'italic' }}>No users found.</p>}
                            {userList.map((u, idx) => (
                                <li key={idx} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: u.role === 'admin' ? '#fbbf24' : '#9ca3af'
                                        }}></div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#333' }}>{u.username}</div>
                                            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>{u.role}</div>
                                        </div>
                                    </div>
                                    {u.username !== user.username && (
                                        <button
                                            onClick={() => handleDeleteUser(u.username)}
                                            style={{
                                                background: '#fee2e2', color: '#b91c1c', border: 'none',
                                                padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 14
                                            }}
                                            title="Hapus User"
                                        >
                                            <Icons.Close size={14} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
