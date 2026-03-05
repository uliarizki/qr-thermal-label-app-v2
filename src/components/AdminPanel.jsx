import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css'; // We'll clean this file next
import AdminUsers from './AdminUsers';
import AdminLogs from './AdminLogs';
import { Icons } from './Icons';
import { saveAs } from 'file-saver';
import { useCustomer } from '../context/CustomerContext';

export default function AdminPanel() {
    const { user } = useAuth();
    const { customers } = useCustomer();
    const [activeTab, setActiveTab] = useState('users');

    if (user?.role !== 'admin') {
        return (
            <div className="page-card" style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
                <Icons.Alert size={48} />
                <h3>Unauthorized Access</h3>
                <p>You must be an Administrator to view this page.</p>
            </div>
        );
    }

    const handleExportBackup = () => {
        try {
            const dataStr = JSON.stringify(customers, null, 2);
            const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
            const fileName = `backup_customers_${new Date().toISOString().slice(0, 10)}.json`;
            saveAs(blob, fileName);
            alert(`✅ Backup downloaded: ${fileName}\n(${customers.length} records)`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed: " + error.message);
        }
    };

    return (
        <div className="admin-panel" style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="page-card" style={{ borderColor: '#D4AF37' }}>
                {/* HEADER */}
                <div className="admin-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    gap: 15
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 40, height: 40,
                            background: '#fffdf5',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #D4AF37',
                            color: '#D4AF37'
                        }}>
                            <Icons.Settings size={22} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, color: '#333', fontSize: '1.4rem' }}>Admin Control Center</h2>
                            <span style={{ fontSize: 12, color: '#666', background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>
                                Logged in as: <strong>{user.username}</strong>
                            </span>
                        </div>
                    </div>

                    {/* TAB NAVIGATION */}
                    <div className="view-toggles">
                        <button
                            className={`view-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <Icons.User size={16} /> Users
                        </button>
                        <button
                            className={`view-btn ${activeTab === 'logs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('logs')}
                        >
                            <span>📜</span> Logs
                        </button>
                        <button
                            className={`view-btn ${activeTab === 'data' ? 'active' : ''}`}
                            onClick={() => setActiveTab('data')}
                        >
                            <Icons.Database size={16} /> Data
                        </button>
                    </div>
                </div>

                <div className="admin-content" style={{ marginTop: 20 }}>
                    {activeTab === 'users' && <AdminUsers />}
                    {activeTab === 'logs' && <AdminLogs />}

                    {activeTab === 'data' && (
                        <div className="data-management">
                            <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                                <div style={{
                                    minWidth: 50, height: 50,
                                    background: '#e0f2fe', color: '#0369a1',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icons.Database size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ marginTop: 0, color: '#0f172a' }}>Data Backup</h3>
                                    <p style={{ color: '#475569', lineHeight: 1.5 }}>
                                        Download a complete copy of your customer database as a JSON file.
                                        This is useful for local archiving or migration.
                                    </p>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 20, flexWrap: 'wrap' }}>
                                        <button
                                            onClick={handleExportBackup}
                                            className="action-btn primary"
                                            style={{ padding: '10px 24px' }}
                                        >
                                            <Icons.Download size={18} /> Download JSON Backup
                                        </button>
                                        <div style={{ color: '#64748b', fontSize: 13, background: 'white', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                            <strong>{customers.length}</strong> records ready
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
