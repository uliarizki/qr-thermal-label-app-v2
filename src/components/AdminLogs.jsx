import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getGlobalHistory } from '../utils/googleSheets';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons'; // Unified Icons

export default function AdminLogs() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const loadHistory = async () => {
        setLoadingHistory(true);
        const res = await getGlobalHistory(user.role);
        setLoadingHistory(false);
        if (res.success) {
            setHistory(res.data);
        } else {
            // Check for backend missing function
            if (res.error && res.error.includes('Unknown action')) {
                toast.error('Backend script missing "getGlobalHistory". Update Google Apps Script.');
            } else {
                toast.error('Gagal load history: ' + res.error);
            }
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    // Helper to render details column
    const renderDetails = (row) => {
        let details = row.details;
        try {
            const parsed = JSON.parse(row.details);

            // FORMAT: SEARCH_SELECT
            if (row.activity === 'SEARCH_SELECT') {
                const query = parsed.query || '-';
                const custInfo = parsed.customerId ? `[${parsed.customerId}] ${parsed.customerName}` : parsed.customerName || 'Unknown';
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontSize: 13 }}>
                            <span style={{ color: '#666' }}>Dicari:</span> <strong>{query}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#059669' }}>
                            <span>➝ Dipilih:</span>
                            <span style={{ fontWeight: 600 }}>{custInfo}</span>
                        </div>
                    </div>
                );
            }
            // FORMAT: SCAN
            else if (row.activity === 'SCAN') {
                return (
                    <span>
                        📱 Scan: <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '0 4px', borderRadius: 4 }}>{parsed.customerId}</span> <b>{parsed.nama}</b>
                    </span>
                );
            }
            // FORMAT: LOGIN/LOGOUT
            else if (row.activity === 'LOGIN' || row.activity === 'LOGOUT') {
                return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Session Access</span>;
            }
            // FORMAT: REGISTER
            else if (row.activity === 'REGISTER_USER') {
                return <span>👤 New User: <b>{parsed.newUser}</b> (Role: {parsed.role})</span>;
            }
        } catch (e) {
            // Keep original string if parse fails
        }
        return (typeof details === 'object' ? JSON.stringify(details) : String(details));
    };

    return (
        <div className="admin-logs">
            {/* STATS HEADER */}
            <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, background: '#f8fafc', padding: 15, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icons.History size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Records</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{history.length}</div>
                    </div>
                </div>

                <button
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="action-btn secondary"
                    style={{ height: 'auto', padding: '0 20px' }}
                >
                    <Icons.Refresh size={18} /> Refresh Log
                </button>
            </div>

            {/* LOG TABLE */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', background: '#fcfcfc' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#444' }}>📜 Recent Activity</h3>
                </div>

                {loadingHistory ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading history...</div>
                ) : (
                    <div className="history-table-container" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                            <thead style={{ background: '#f8f9fa' }}>
                                <tr>
                                    <th style={{ padding: '10px 15px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                                    <th style={{ padding: '10px 15px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>User</th>
                                    <th style={{ padding: '10px 15px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Activity</th>
                                    <th style={{ padding: '10px 15px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr><td colSpan="4" style={{ padding: 20, textAlign: 'center', color: '#999' }}>No history found.</td></tr>
                                ) : (
                                    history.map((row, idx) => (
                                        <tr key={idx} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 15px', color: '#666', whiteSpace: 'nowrap' }}>
                                                {new Date(row.timestamp).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td style={{ padding: '10px 15px' }}>
                                                <span style={{
                                                    background: row.user === 'admin' ? '#fef3c7' : '#f3f4f6',
                                                    color: row.user === 'admin' ? '#d97706' : '#4b5563',
                                                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600
                                                }}>
                                                    {row.user}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 15px', fontWeight: 600, color: '#333' }}>{row.activity}</td>
                                            <td style={{ padding: '10px 15px', color: '#444' }}>
                                                {renderDetails(row)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
