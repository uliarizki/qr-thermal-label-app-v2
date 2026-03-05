// src/components/BranchSelector.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './BranchSelector.css';

const BRANCHES = {
  SMG: { id: 'SMG', name: 'Semarang', label: 'SMG' },
  JKT: { id: 'JKT', name: 'Jakarta', label: 'JKT' },
  SBY: { id: 'SBY', name: 'Surabaya', label: 'SBY' },
};

export default function BranchSelector({ onBranchChange, selectedBranch }) {
  const { user } = useAuth();
  const [availableBranches, setAvailableBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      checkAvailableBranches();
    }
  }, [user]);

  const checkAvailableBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, you'd call Apps Script to check access
      // For now, we'll simulate or check all branches
      // The actual validation will happen when user selects a branch
      const branches = Object.values(BRANCHES);
      setAvailableBranches(branches);

      // Load saved branch preference
      const savedBranch = localStorage.getItem('qr:selectedBranch');
      if (savedBranch && branches.find(b => b.id === savedBranch)) {
        onBranchChange(savedBranch);
      } else if (branches.length > 0) {
        // Default to first branch
        onBranchChange(branches[0].id);
      }
    } catch (err) {
      console.error('Error checking branches:', err);
      setError('Gagal memuat daftar cabang');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (branchId) => {
    localStorage.setItem('qr:selectedBranch', branchId);
    onBranchChange(branchId);
  };

  if (loading) {
    return (
      <div className="branch-selector">
        <div className="branch-selector-loading">Memuat cabang...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="branch-selector">
        <div className="branch-selector-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="branch-selector">
      <div className="branch-selector-label">Cabang:</div>
      <div className="branch-buttons">
        {availableBranches.map((branch) => (
          <button
            key={branch.id}
            onClick={() => handleBranchChange(branch.id)}
            className={`branch-btn ${selectedBranch === branch.id ? 'active' : ''}`}
            title={branch.name}
          >
            {branch.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { BRANCHES };

