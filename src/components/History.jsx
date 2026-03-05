import { useState, useEffect } from 'react';
import { getHistory, filterHistoryByAction, clearHistory, formatTimestamp } from '../utils/history';
import { Icons } from './Icons';
import './History.css';

export default function History({ onSelect }) {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // ... (useEffect and loadHistory same)

  useEffect(() => {
    loadHistory();

    const checkInterval = setInterval(() => {
      loadHistory();
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [filter]);

  const loadHistory = async () => {
    let data;
    if (filter !== 'ALL') {
      data = await filterHistoryByAction(filter);
    } else {
      data = await getHistory();
    }
    setHistory(Array.isArray(data) ? data : []);
  };

  const handleClear = () => {
    clearHistory();
    setHistory([]);
    setShowClearConfirm(false);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'ADD': return <Icons.Plus size={20} color="#48bb78" />;
      case 'SEARCH': return <Icons.Search size={20} color="#3182ce" />;
      case 'SCAN': return <Icons.Scan size={20} color="#ed8936" />;
      case 'SEARCH_SELECT': return <Icons.User size={20} color="#805ad5" />;
      default: return <Icons.History size={20} color="#718096" />;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'ADD': return 'Ditambahkan';
      case 'SEARCH': return 'Dicari';
      case 'SCAN': return 'Discan';
      case 'SEARCH_SELECT': return 'Dilihat';
      default: return action;
    }
  };

  const renderHistoryItem = (item, index) => {
    const { timestamp, action, details } = item;

    return (
      <div
        key={index}
        className="history-item clickable"
        onClick={() => onSelect && onSelect(item)}
        title="Klik untuk aksi cepat"
      >
        <div className="history-icon">{getActionIcon(action)}</div>
        <div className="history-content">
          <div className="history-header">
            <span className="history-action">{getActionLabel(action)}</span>
            <span className="history-time">{formatTimestamp(timestamp)}</span>
          </div>
          <div className="history-details">
            {action === 'ADD' && (
              <div>
                <strong>{details.nama || 'Customer'}</strong>
                {details.customerId && <span className="history-id"> ({details.customerId})</span>}
                {details.kota && <span> - {details.kota}</span>}
              </div>
            )}
            {action === 'SEARCH' && (
              <div>
                Query: <strong>"{details.query}"</strong>
                {details.resultCount !== undefined && (
                  <span className="history-result">
                    {' '}
                    ({details.resultCount} hasil)
                  </span>
                )}
              </div>
            )}
            {action === 'SEARCH_SELECT' && (
              <div>
                <strong>{details.customerName || 'Customer'}</strong>
              </div>
            )}
            {action === 'SCAN' && (
              <div>
                <strong>{details.nama || 'Customer'}</strong>
                {details.customerId && <span className="history-id"> ({details.customerId})</span>}
                {details.kota && <span> - {details.kota}</span>}
              </div>
            )}
          </div>
          <div className="history-tap-hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icons.ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} /> Tap to Open
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="history-container page-card">
      <div className="history-header-section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icons.History size={24} /> History
        </h2>
        <div className="history-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="history-filter"
          >
            <option value="ALL">Semua</option>
            <option value="ADD">Tambah Customer</option>
            <option value="SEARCH">Pencarian</option>
            <option value="SEARCH_SELECT">Dilihat</option>
            <option value="SCAN">Scan QR</option>
          </select>
          {history.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="action-btn danger"
              style={{ padding: '8px 12px', fontSize: 13 }}
            >
              <Icons.Close size={14} /> Hapus
            </button>
          )}
        </div>
      </div>

      {showClearConfirm && (
        <div className="clear-confirm">
          <p>Yakin hapus semua history?</p>
          <div className="clear-confirm-buttons">
            <button onClick={handleClear} className="action-btn danger">
              Ya, Hapus
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="action-btn secondary"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="history-empty">
          <p>📭 Belum ada history</p>
          <p className="history-empty-hint">
            History akan muncul setelah Anda melakukan pencarian, scan QR, atau
            menambah customer.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {Array.isArray(history) && history.map((item, index) => renderHistoryItem(item, index))}
        </div>
      )}
    </div>
  );
}


