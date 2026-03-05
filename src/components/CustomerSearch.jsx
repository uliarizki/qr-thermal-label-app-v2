import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
// import QRCode from 'react-qr-code'; // Removed to prevent lag on huge lists

import { Icons } from './Icons';
import { addHistory } from '../utils/history';
import CustomerCard from './CustomerCard'; // MEMOIZED
import { CustomerCardSkeleton } from './CustomerCardSkeleton'; // SKELETON
const BatchGeneratorModal = lazy(() => import('./BatchGeneratorModal')); // LAZY LOADED
import './CustomerSearch.css';

const STORAGE_KEY = 'qr:lastSearchQuery';

import { useCustomer } from '../context/CustomerContext';

export default function CustomerSearch({
  initialQuery,
  onScanTrigger
}) {
  const {
    customers,
    setSelectedCustomer,
    syncCustomers,
    isSyncing,
    lastUpdated
  } = useCustomer();
  const [activeBranch, setActiveBranch] = useState('ALL'); // NEW: Branch Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('list');
  const [isSearching, setIsSearching] = useState(false);
  // const [filteredCustomers, setFilteredCustomers] = useState([]); // REMOVED: Derived via useMemo
  const [visibleLimit, setVisibleLimit] = useState(50); // Increased from 20 to 50
  const [showBatchModal, setShowBatchModal] = useState(false);
  const loaderRef = useRef(null); // Sentinel Ref

  // 1. Handle Initial Query (e.g. from History)
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // 2. Initial Load from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialQuery) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSearchQuery(saved);

      const savedView = localStorage.getItem('qr:viewMode');
      if (savedView) setActiveView(savedView);

      const savedBranch = localStorage.getItem('qr:activeBranch');
      if (savedBranch) setActiveBranch(savedBranch);
    }
  }, [initialQuery]);

  // 3. Persist View, Query, and Branch
  const toggleView = (mode) => {
    setActiveView(mode);
    localStorage.setItem('qr:viewMode', mode);
  };

  const handleBranchChange = (branch) => {
    setActiveBranch(branch);
    localStorage.setItem('qr:activeBranch', branch);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (searchQuery) localStorage.setItem(STORAGE_KEY, searchQuery);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, [searchQuery]);

  // 4. Log Search History (existing logic...)
  const queryRef = useRef(searchQuery);
  useEffect(() => {
    queryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      const finalQuery = queryRef.current;
      if (finalQuery && finalQuery.trim().length > 2) {
        addHistory('SEARCH', {
          query: finalQuery,
          timestamp: new Date()
        });
      }
    };
  }, []);

  // 5. Debounce Query
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 6. Memoized Filtering Logic
  const filteredCustomers = React.useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();

    // A. If no query, return all (or filtered by branch)
    if (!query && activeBranch === 'ALL') {
      return customers;
    }

    // B. Filter by Branch first (Hard Filter)
    let preFiltered = customers;
    if (activeBranch !== 'ALL') {
      preFiltered = customers.filter(c => (c.cabang || '').toUpperCase().includes(activeBranch));
    }

    if (!query) return preFiltered;

    // C. Relevance Scoring
    const terms = query.split(/\s+/).filter(Boolean);

    // Helper for scoring
    const calculateScore = (c) => {
      let score = 0;
      const cId = String(c.id || '').toLowerCase();
      const cName = String(c.nama || '').toLowerCase();
      const cCity = String(c.kota || '').toLowerCase();
      const cBranch = String(c.cabang || '').toLowerCase();
      const cMeta = `${c.pabrik || ''} ${c.sales || ''}`.toLowerCase();

      // I. ID Match (Highest)
      if (cId === query) score += 100;
      else if (cId.includes(query)) score += 80;

      // II. Name Match
      if (cName === query) score += 60;
      else if (cName.startsWith(query)) score += 50;
      else if (cName.includes(query)) score += 20;

      // III. Term Matching
      const allTermsMatch = terms.every(term => {
        let matched = false;
        if (cName.includes(term)) { score += 5; matched = true; }
        if (cCity.includes(term)) { score += 10; matched = true; }
        if (cBranch.includes(term)) { score += 5; matched = true; }
        if (cId.includes(term)) { matched = true; }
        if (cMeta.includes(term)) { score += 2; matched = true; }
        return matched;
      });

      if (!allTermsMatch) return -1;
      return score;
    };

    return preFiltered
      .map(c => ({ c, score: calculateScore(c) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.c);

  }, [customers, activeBranch, debouncedQuery]);

  // 7. Update Searching State (Sync UI)
  useEffect(() => {
    setIsSearching(false);
  }, [filteredCustomers]);

  useEffect(() => {
    if (searchQuery !== debouncedQuery) setIsSearching(true);
  }, [searchQuery, debouncedQuery]);


  // 6. Handle Selection
  const handleCardClick = (customer) => {
    setSelectedCustomer(customer);
  };

  // 7. Reset Pagination on Search/Branch Change
  useEffect(() => {
    setVisibleLimit(50);
  }, [searchQuery, activeBranch]);

  // 8. Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          setVisibleLimit((prev) => prev + 50);
        }
      },
      { threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [filteredCustomers, visibleLimit]); // Re-attach when list changes

  return (
    <div className="customer-search page-card">
      {/* SEARCH HEADER */}
      <div className="search-header-container">

        {/* ROW 1: Filter & Sync (Grouped for Mobile) */}
        <div className="filter-sync-group">
          <select
            value={activeBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="branch-select"
          >
            <option value="ALL">Semua Cabang</option>
            <option value="BT SMG">BT SMG</option>
            <option value="BT JKT">BT JKT</option>
            <option value="BT SBY">BT SBY</option>
          </select>

          <button
            className="sync-btn"
            onClick={() => syncCustomers(false)}
            disabled={isSyncing}
            title="Ambil data terbaru"
          >
            {isSyncing ? (
              <span className="spin"><Icons.Refresh size={20} /></span>
            ) : (
              <Icons.Refresh size={20} />
            )}
          </button>
        </div>

        {/* ROW 2: Search Input (Full Width on Mobile) */}
        <div className="search-input-wrapper">
          <div className="search-icon-wrapper">
            <Icons.Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Cari Nama, ID, Kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
              title="Bersihkan Pencarian"
            >
              <Icons.Close size={18} />
            </button>
          )}
        </div>
      </div>

      {/* View Controls & Tools */}
      <div className="view-controls" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
        <div className="view-toggles">
          <button
            className={`view-btn ${activeView === 'grid' ? 'active' : ''}`}
            onClick={() => toggleView('grid')}
            title="Tampilan Grid (Kartu)"
          >
            <span style={{ fontSize: 16 }}>🔲</span> Grid
          </button>
          <button
            className={`view-btn ${activeView === 'list' ? 'active' : ''}`}
            onClick={() => toggleView('list')}
            title="Tampilan List (Daftar)"
          >
            <span style={{ fontSize: 16 }}>≣</span> List
          </button>
        </div>

        <button
          className="view-btn"
          style={{ background: 'transparent', color: '#6366f1', border: '1px solid #6366f1' }}
          onClick={() => setShowBatchModal(true)}
          title="Batch Generator Tools"
        >
          <span>⚡ Batch</span>
        </button>
      </div>

      {/* INFO META */}
      {lastUpdated && (
        <p className="last-updated">
          Data terakhir: {lastUpdated.toLocaleTimeString()} {lastUpdated.toLocaleDateString()}
        </p>
      )}

      {/* SKELETON LOADING */}
      {(isSyncing || isSearching) && (
        <div className={`customer-list ${activeView}-view`}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <CustomerCardSkeleton key={idx} viewMode={activeView} />
          ))}
        </div>
      )}

      {/* EMPTY STATES */}
      {!isSyncing && !isSearching && searchQuery.trim() && filteredCustomers.length === 0 && (
        <p className="no-data">❌ Tidak ada hasil. Coba "Sync" jika data barusan diinput.</p>
      )}

      {/* CUSTOMER LIST: Only render if we have a query and results */}
      {filteredCustomers.length > 0 && (
        <div className={`customer-list ${activeView}-view`}>
          {filteredCustomers.slice(0, visibleLimit).map((customer, idx) => (
            <CustomerCard
              key={`${customer.id || 'new'}_${idx}`}
              customer={customer}
              onClick={handleCardClick}
            />
          ))}

          {/* Sentinel / Loader */}
          {filteredCustomers.length > visibleLimit && (
            <div
              ref={loaderRef}
              style={{
                textAlign: 'center',
                padding: '20px',
                color: '#888',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                gridColumn: activeView === 'grid' ? '1 / -1' : 'auto',
                width: '100%'
              }}
            >
              <span className="spin"><Icons.Refresh size={20} /></span>
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}
      {/* Floating Scan Button */}
      <button
        onClick={onScanTrigger}
        className="floating-scan-btn"
        title="Scan QR Code"
      >
        <Icons.Scan size={28} />
      </button>

      {showBatchModal && (
        <Suspense fallback={<div className="modal-overlay">Loading Tools...</div>}>
          <BatchGeneratorModal
            customers={customers}
            onClose={() => setShowBatchModal(false)}
            onSync={() => syncCustomers(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
