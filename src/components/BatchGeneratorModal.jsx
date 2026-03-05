import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';
import { generateLabelPdfVector } from '../utils/pdfGeneratorVector';
import { renderLabelToCanvas, canvasToRaster } from '../utils/printHelpers';
import { addCustomer } from '../utils/googleSheets';
import { Icons } from './Icons';
import { usePrinter } from '../context/PrinterContext';
import DigitalCard from './DigitalCard';
import { generateCardBlob } from '../utils/cardGenerator';
import { useModalHistory } from '../hooks/useModalHistory';
import './BatchGeneratorModal.css';


// Row Component for Virtualized List
const Row = ({ data, index, style }) => {
    // console.log('Row Render:', index, data?.length, style); // Debug
    const item = data[index];
    if (!item) return null;
    return (
        <div style={{
            ...style,
            display: 'flex',
            borderBottom: '1px solid #eee',
            alignItems: 'center',
            background: index % 2 ? '#fafafa' : 'white'
        }}>
            <div style={{ flex: 1.5, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
            <div style={{ flex: 1, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.city}</div>
            <div style={{ flex: 1, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.branch}</div>
            <div style={{ width: 80, padding: '0 8px' }}>
                <span
                    title={item.message || (item.status === 'ready' ? 'Customer found in DB' : 'Not in DB - Will generate independent QR')}
                    style={{
                        padding: '2px 6px', borderRadius: 4,
                        fontSize: 11,
                        background: item.status === 'ready' ? '#d1fae5' : '#ffedd5',
                        color: item.status === 'ready' ? '#065f46' : '#9a3412',
                        cursor: 'help'
                    }}>
                    {item.status.toUpperCase()}
                </span>
            </div>
            <div style={{ width: 80, padding: '0 8px', fontSize: 12 }}>{item.finalId || <i>-</i>}</div>
        </div>
    );
};

export default function BatchGeneratorModal({ customers, onClose, onSync }) {
    const { isConnected, connect, print, isPrinting } = usePrinter(); // Printer Context
    const [inputText, setInputText] = useState('');
    const [inputMode, setInputMode] = useState('auto'); // 'auto', 'excel', 'csv'
    const [branchScope, setBranchScope] = useState('ALL'); // 'ALL' or specific branch
    const [items, setItems] = useState([]); // Ready/Approved items
    const [reviewItems, setReviewItems] = useState([]); // Unrecognized items needing approval
    const [step, setStep] = useState('input'); // input, review, processing
    const [tab, setTab] = useState('ready'); // 'ready', 'review'

    const [viewMode, setViewMode] = useState('list'); // 'list' or 'gallery' (Catalog)
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingItem, setProcessingItem] = useState(null); // For ID Card Generation
    const [shareTarget, setShareTarget] = useState(null); // For single share
    const cardRef = React.useRef(null);
    const [progress, setProgress] = useState('');

    // History Management (Disabled for debugging)
    const handleClose = onClose;
    // const handleClose = useModalHistory(onClose, 'batch-generator');

    // Print Configuration State
    const [printConfig, setPrintConfig] = useState({
        width: 50,      // mm
        height: 30,     // mm
        gapFeed: true,  // Send Form Feed (0x0C) after each label
        density: 'high' // Future use
    });

    // Handle Esc Key - Redirect to handleClose
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && !isProcessing) handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [handleClose, isProcessing]);

    // 1. Parse Input
    const parseInput = () => {
        if (!inputText.trim()) return;

        // Auto-detect format based on first few lines
        const lines = inputText.split(/\r?\n/);
        const parsed = lines.map((line, idx) => {
            let parts;

            // Logic Selection
            if (inputMode === 'excel') {
                // Force Excel (Tab only)
                parts = line.split('\t').map(s => s.trim());
            } else if (inputMode === 'csv') {
                // Force CSV (Comma/Semi)
                parts = line.split(/[,;]/).map(s => s.trim());
            } else {
                // Auto Detect (Default)
                const hasTab = line.includes('\t');
                parts = hasTab
                    ? line.split('\t').map(s => s.trim())
                    : line.split(/[,;|]/).map(s => s.trim());
            }

            if (parts.length === 0 || !parts[0]) return null;

            const name = parts[0];
            const city = parts[1] || '-';
            const branch = parts[2] || '-';

            // Filter Scope logic
            let searchPool = customers;
            if (branchScope !== 'ALL') {
                searchPool = customers.filter(c =>
                    String(c.cabang || '').toUpperCase() === branchScope.toUpperCase()
                );
            }

            // Check existence in scoped pool
            const existing = searchPool?.find(c => {
                if (!c?.nama) return false;

                // Safe String Conversion for comparison
                const cName = String(c.nama).toLowerCase();
                const iName = String(name).toLowerCase();

                const nameMatch = cName === iName;
                const cityMatch = String(c.kota || '').toLowerCase() === String(city).toLowerCase();

                // Strict match if city provided, loose if not
                if (city !== '-' && branch !== '-') {
                    const branchMatch = String(c.cabang || '').toLowerCase() === String(branch).toLowerCase();
                    return nameMatch && cityMatch && branchMatch;
                }
                return nameMatch;
            });

            let kodeValue = null;
            let displayId = null;

            if (existing) {
                // Match Found: Use DB Data
                displayId = existing.kode || existing.id;

                // Ensure JSON format for kode
                if (existing.kode && typeof existing.kode === 'string' && existing.kode.trim().startsWith('{')) {
                    kodeValue = existing.kode;
                } else {
                    kodeValue = JSON.stringify({
                        it: displayId,
                        nt: existing.nama,
                        at: existing.kota || '',
                        pt: existing.sales || '',
                        kp: existing.pabrik || '',
                        ws: existing.cabang || '',
                        np: existing.telp || ''
                    });
                }
            } else {
                // No Match: "New" or Unrecognized
                displayId = 'NEW';
                kodeValue = JSON.stringify({
                    it: 'NEW',
                    nt: name,
                    at: city !== '-' ? city : '',
                    ws: branch !== '-' ? branch : ''
                });
            }

            return {
                id: idx,
                name,
                city: (city === '-' && existing?.kota) ? existing.kota : city,
                branch: (branch === '-' && (existing?.cabang || existing?.pabrik)) ? (existing.cabang || existing.pabrik) : branch,
                existingId: existing ? existing.id : null,
                existingCustomer: existing,
                status: existing ? 'ready' : 'new',
                kode: kodeValue,
                displayId,
                message: existing ? 'Customer found in DB' : 'Unrecognized - Review Needed'
            };
        }).filter(Boolean);

        const validItems = parsed.filter(i => i.status === 'ready');
        const riskyItems = parsed.filter(i => i.status === 'new');

        console.log('Valid:', validItems.length, 'Risky:', riskyItems.length);

        if (validItems.length === 0 && riskyItems.length === 0) {
            alert("No valid data found!");
            return;
        }

        setItems(validItems);
        setReviewItems(riskyItems);

        // Default to 'review' tab if we have risky items but no ready items, otherwise 'ready'
        setTab(validItems.length > 0 ? 'ready' : 'review');
        setStep('review');
    };

    // 1b. Load from Branch (New Feature)
    const [selectedBranch, setSelectedBranch] = useState('BT SMG');

    const handleLoadBranch = () => {
        if (!selectedBranch) return;

        // Filter customers by selected branch
        // Normalize comparison
        const branchCustomers = customers.filter(c =>
            (c.cabang || '').toUpperCase().includes(selectedBranch.toUpperCase())
        );

        if (branchCustomers.length === 0) {
            toast.error(`No customers found for branch: ${selectedBranch}`);
            return;
        }

        if (!window.confirm(`Found ${branchCustomers.length} customers in ${selectedBranch}. Load them all into the generator?`)) {
            return;
        }

        // Convert to Batch Items format
        const batchItems = branchCustomers.map((c, idx) => {
            // Reuse logic from parseInput for existing customers
            let displayId = c.kode || c.id;
            let kodeValue;

            if (c.kode && typeof c.kode === 'string' && c.kode.trim().startsWith('{')) {
                kodeValue = c.kode;
            } else {
                kodeValue = JSON.stringify({
                    it: c.id || '',
                    nt: c.nama,
                    at: c.kota || '',
                    pt: c.sales || '',
                    kp: c.pabrik || '',
                    ws: c.cabang || '',
                    np: c.telp || ''
                });
            }

            return {
                id: idx,
                name: c.nama,
                city: c.kota || '-',
                branch: c.cabang || selectedBranch,
                existingId: c.id,
                existingCustomer: c,
                status: 'ready',
                kode: kodeValue,
                displayId: displayId,
                message: 'Loaded from Branch'
            };
        });

        setItems(batchItems);
        setReviewItems([]); // Clear review items
        setTab('ready'); // Switch to ready tab
        setStep('review'); // Go to review step
        toast.success(`Loaded ${batchItems.length} customers from ${selectedBranch}`);
    };
    // 2. Register New Customers
    const registerNewCustomers = async () => {
        /* ... (Keep existing logic if needed, or hide) ... */
    };

    // 3. Generate ZIP (Updated: Allow missing IDs)
    const generateZip = async () => {
        setIsProcessing(true);
        setProgress('Generating PDFs...');

        try {
            const zip = new JSZip();
            let count = 0;

            for (const item of items) {
                try {
                    const rawId = item.finalId || '';
                    const safeId = (rawId.startsWith('{') || rawId.length > 20) ? '' : rawId;

                    const labelData = {
                        nt: item.name,
                        at: item.city,
                        ws: item.branch,
                        it: safeId,
                        pt: '',
                        raw: item.finalId || JSON.stringify({
                            nt: item.name, at: item.city, ws: item.branch
                        })
                    };

                    const result = await generateLabelPdfVector(labelData, { width: 50, height: 30, returnBlob: true });
                    const pdfBlob = result.blob;

                    const safeName = item.name.replace(/[^a-z0-9]/gi, '_');
                    const safeCity = item.city.replace(/[^a-z0-9]/gi, '_');
                    const idPart = safeId || 'New'; // Use safeId
                    const filename = `${safeName}_${safeCity}_${idPart}.pdf`;

                    zip.file(filename, pdfBlob);
                    count++;
                } catch (error) {
                    console.error(`Failed to generate PDF for ${item.name}:`, error);
                }
            }

            setProgress('Compressing...');
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `Batch_Labels_${new Date().getTime()}.zip`);

            setProgress(`Downloaded ${count} files.`);
        } catch (e) {
            console.error(e);
            setProgress('Error generating ZIP: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // 4. Generate ID Card Images ZIP
    const generateIdZip = async () => {
        setIsProcessing(true);
        // setProgress('Preparing ID Cards...');

        try {
            const zip = new JSZip();
            let count = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                setProgress(`Rendering ${i + 1}/${items.length}: ${item.name}`);

                // Render the card
                setProcessingItem(item);

                // Wait for React to render and images to load
                await new Promise(resolve => setTimeout(resolve, 500));

                if (cardRef.current) {
                    try {
                        const blob = await generateCardBlob(cardRef.current);
                        const safeName = item.name.replace(/[^a-z0-9]/gi, '_');
                        const safeCity = item.city.replace(/[^a-z0-9]/gi, '_');
                        const rawId = item.displayId || '';
                        const safeId = (rawId.startsWith('{') || rawId.length > 20) ? 'ID' : rawId;

                        const filename = `${safeName}_${safeCity}_${safeId || 'ID'}.png`;
                        zip.file(filename, blob);
                        count++;
                    } catch (err) {
                        console.error(`Failed to capture card for ${item.name}`, err);
                    }
                }
            }

            setProcessingItem(null); // Cleanup

            setProgress('Compressing Images...');
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `Batch_DigitalIDs_${new Date().getTime()}.zip`);

            setProgress(`Downloaded ${count} ID Cards.`);

        } catch (e) {
            console.error(e);
            setProgress('Error generating ID ZIP: ' + e.message);
        } finally {
            setIsProcessing(false);
            setProcessingItem(null);
        }
    };

    // 5. SHARE SINGLE CARD (Mobile/Desktop Web Share)
    const shareSingleCard = async (item) => {
        setIsProcessing(true);
        setShareTarget(item.id || item.name); // Track who we are sharing
        setProgress(`Preparing share for ${item.name}...`);

        try {
            // 1. Setup Render
            setProcessingItem(item);
            // 2. Wait for Render
            await new Promise(resolve => setTimeout(resolve, 500));

            if (cardRef.current) {
                const blob = await generateCardBlob(cardRef.current);
                const file = new File([blob], `ID_${item.name}.png`, { type: 'image/png' });

                // 3. Trigger Share
                if (navigator.share) {
                    await navigator.share({
                        title: `ID Card - ${item.name}`,
                        text: `Digital ID Card for ${item.name}`,
                        files: [file]
                    });
                    setProgress(`Shared ${item.name} successfully!`);
                } else {
                    // Fallback for Desktop (Download)
                    saveAs(blob, `ID_${item.name}.jpg`);
                    setProgress(`Web Share not supported. Downloaded ${item.name} instead.`);
                }
            }
        } catch (e) {
            console.error("Share failed:", e);
            alert("Failed to share: " + e.message);
        } finally {
            setIsProcessing(false);
            setProcessingItem(null);
            setShareTarget(null);
        }
    };

    // 6. PRINT BATCH DIRECTLY
    const printBatch = async () => {
        if (!isConnected) {
            alert("Please connect a printer first!");
            connect();
            return;
        }

        setIsProcessing(true);
        setProgress('Preparing to print...');

        // Print parameters
        // Add minimal delay between prints to prevent buffer overflow (especially Bluetooth)
        const DELAY_MS = 500;

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                setProgress(`Printing ${i + 1}/${items.length}: ${item.name}...`);

                const rawId = item.displayId || '';
                // Sanitize ID: If it looks like JSON or is too long, ignore it for the text label
                const safeId = (rawId.startsWith('{') || rawId.length > 20) ? '' : rawId;

                const labelData = {
                    nt: item.name,
                    at: item.city,
                    ws: item.branch,
                    it: safeId,
                    pt: '',
                    raw: item.finalId || JSON.stringify({
                        nt: item.name, at: item.city, ws: item.branch
                    })
                };

                // 1. Render to Canvas
                const canvas = await renderLabelToCanvas(labelData, {
                    width: printConfig.width,
                    height: printConfig.height
                });

                // 2. Convert to Raster (Bytes)
                const rasterData = canvasToRaster(canvas);

                // 3. Prepare Final Data (Append Form Feed if enabled)
                let finalData = rasterData;
                if (printConfig.gapFeed) {
                    // 0x0C is standard "Next Label" / Form Feed command
                    // Some printers prefer GS V m (Cut) but 0x0C is safer for continuous label roll gaps
                    const feedCmd = new Uint8Array([0x0C]);
                    const combined = new Uint8Array(rasterData.length + feedCmd.length);
                    combined.set(rasterData);
                    combined.set(feedCmd, rasterData.length);
                    finalData = combined;
                }

                // 4. Send to Printer
                await print(finalData);

                // 4. Buffer Delay
                if (i < items.length - 1) {
                    await new Promise(r => setTimeout(r, DELAY_MS));
                }
            }

            setProgress('Printing Complete!');
            setTimeout(() => setProgress(''), 2000);

        } catch (e) {
            console.error(e);
            setProgress('Print Error: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={!isProcessing ? handleClose : undefined}>
            <div className="modal-content batch-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Batch ID Generator</h2>
                    <div className="header-actions">
                        <div
                            onClick={connect}
                            className={`printer-badge ${isConnected ? 'connected' : 'disconnected'}`}
                        >
                            {isConnected ? <Icons.Print size={14} /> : <Icons.AlertTriangle size={14} />}
                            <span>{isConnected ? 'Printer Ready' : 'Connect'}</span>
                        </div>
                        <button className="close-btn" onClick={handleClose}><Icons.X size={20} /></button>
                    </div>
                </div>

                {/* BODY */}
                <div className="modal-body">
                    {/* INPUT STEP */}
                    {step === 'input' && (
                        <div className="input-step">
                            <div className="mode-selector">
                                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Mode:</span>
                                <label>
                                    <input type="radio" checked={inputMode === 'auto'} onChange={() => setInputMode('auto')} />
                                    🤖 Auto
                                </label>
                                <label>
                                    <input type="radio" checked={inputMode === 'excel'} onChange={() => setInputMode('excel')} />
                                    📊 Excel
                                </label>
                                <label>
                                    <input type="radio" checked={inputMode === 'csv'} onChange={() => setInputMode('csv')} />
                                    📝 CSV
                                </label>
                            </div>

                            {/* NEW: Branch Scope Filter */}
                            <div className="branch-loader" style={{
                                margin: '10px 0', padding: '10px', background: '#f8fafc',
                                border: '1px solid #e2e8f0', borderRadius: '6px'
                            }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: 5 }}>
                                    🎯 Search Scope (Optional)
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Match only in:</label>
                                    <select
                                        value={branchScope}
                                        onChange={(e) => setBranchScope(e.target.value)}
                                        style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="ALL">All Branches (Global Search)</option>
                                        <option value="BT SMG">BT SMG</option>
                                        <option value="BT JKT">BT JKT</option>
                                        <option value="BT SBY">BT SBY</option>
                                    </select>
                                </div>
                            </div>

                            <div className="branch-loader" style={{
                                margin: '10px 0', padding: '10px', background: '#ecfdf5',
                                border: '1px solid #a7f3d0', borderRadius: '6px'
                            }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#047857', marginBottom: 5 }}>
                                    🏭 Load from Branch (Batch Export)
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #d1fae5' }}
                                    >
                                        <option value="BT SMG">BT SMG</option>
                                        <option value="BT JKT">BT JKT</option>
                                        <option value="BT SBY">BT SBY</option>
                                    </select>
                                    <button
                                        className="action-btn primary small"
                                        onClick={handleLoadBranch}
                                        style={{ background: '#059669' }}
                                    >
                                        Load Branch
                                    </button>
                                </div>
                            </div>

                            <p style={{ marginBottom: 10, fontSize: '0.85rem' }}>
                                <b>OR</b> Paste data: <b>Name</b> (min) or <b>Name, City, Branch</b>
                            </p>

                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={"Budi Santoso, Tegal, Pasar Pagi\nSiti Aminah, Brebes, Ketanggungan"}
                            />
                            {inputText.trim() && (
                                <div className="format-detect">
                                    <span>Detected:</span>
                                    {(() => {
                                        let detected = 'list';
                                        if (inputMode === 'excel') detected = 'excel';
                                        else if (inputMode === 'csv') detected = 'csv';
                                        else if (inputText.includes('\t')) detected = 'excel';
                                        else if (inputText.includes(',') || inputText.includes(';')) detected = 'csv';

                                        if (detected === 'excel') return (
                                            <span className="format-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                                                📊 Excel (Tab)
                                            </span>
                                        );
                                        if (detected === 'csv') return (
                                            <span className="format-badge" style={{ background: '#fef9c3', color: '#854d0e' }}>
                                                📝 CSV
                                            </span>
                                        );
                                        return (
                                            <span className="format-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                                                📄 Single List
                                            </span>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* REVIEW STEP */}
                    {step === 'review' && (
                        <div className="review-step">
                            <div className="review-header">
                                <div className="tabs">
                                    <button
                                        className={`tab-btn ${tab === 'ready' ? 'active' : ''}`}
                                        onClick={() => setTab('ready')}
                                    >
                                        ✅ Ready to Print ({items.length})
                                    </button>
                                    <button
                                        className={`tab-btn ${tab === 'review' ? 'active' : ''} ${reviewItems.length > 0 ? 'has-items' : ''}`}
                                        onClick={() => setTab('review')}
                                        disabled={reviewItems.length === 0}
                                    >
                                        ⚠️ Needs Review ({reviewItems.length})
                                    </button>
                                </div>

                                <div className="view-toggle">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={viewMode === 'list' ? 'active' : ''}
                                    >📋 List</button>
                                    <button
                                        onClick={() => setViewMode('gallery')}
                                        className={viewMode === 'gallery' ? 'active' : ''}
                                    >🖼️ Catalog</button>
                                </div>
                            </div>

                            <div className="list-container">
                                {tab === 'ready' ? (
                                    /* READY ITEMS LIST */
                                    items.length === 0 ? (
                                        <div className="empty-state">
                                            <div style={{ fontSize: 40 }}>🗑️</div>
                                            <p>No items ready to print.</p>
                                            <p style={{ fontSize: '0.8rem', color: '#888' }}>Check the "Needs Review" tab or add more data.</p>
                                        </div>
                                    ) : viewMode === 'list' ? (
                                        <div>
                                            <div className="list-header">
                                                <div>Name</div>
                                                <div>City</div>
                                                <div className="branch-col">Branch</div>
                                                <div>Status</div>
                                                <div style={{ width: 40 }}></div>
                                            </div>
                                            {items.map((item, index) => (
                                                <div key={index} className="list-row">
                                                    <div className="cell">{item.name}</div>
                                                    <div className="cell">{item.city}</div>
                                                    <div className="cell branch-col">{item.branch}</div>
                                                    <div>
                                                        <span
                                                            title={item.message}
                                                            className={`status-badge ${item.status === 'ready' ? 'ready' : 'new'}`}
                                                            style={{ cursor: 'help' }}
                                                        >
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div style={{ width: 40 }}>
                                                        <button
                                                            className="icon-btn danger"
                                                            title="Run Remove"
                                                            onClick={() => {
                                                                const newItems = [...items];
                                                                newItems.splice(index, 1);
                                                                setItems(newItems);
                                                            }}
                                                        >
                                                            <span style={{ fontSize: '14px' }}>🗑️</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="gallery-container">
                                            {items.map((item, index) => (
                                                <div key={index} className="gallery-card">
                                                    <div className="card-preview">
                                                        <div className="scaled-card">
                                                            <DigitalCard
                                                                customer={{
                                                                    nama: item.name,
                                                                    kota: item.city,
                                                                    cabang: item.branch === '-' ? '' : item.branch,
                                                                    kode: item.kode || item.displayId || 'N/A'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="card-actions">
                                                        <div className="card-name">{item.name}</div>
                                                        <button
                                                            className={`share-btn ${shareTarget === (item.id || item.name) ? 'sharing' : ''}`}
                                                            onClick={() => shareSingleCard(item)}
                                                            disabled={isProcessing}
                                                        >
                                                            Share
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    /* REVIEW ITEMS LIST (Always List View for Efficiency) */
                                    <div className="review-list">
                                        <div className="review-list-header" style={{
                                            padding: '10px', background: '#fff7ed', borderBottom: '1px solid #fed7aa',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div style={{ color: '#9a3412', fontSize: '0.9rem' }}>
                                                <b>⚠️ Unrecognized Data found ({reviewItems.length})</b>
                                                <p style={{ margin: 0, fontSize: '0.8rem' }}>These names do not exist in the database. Verify before printing.</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button
                                                    className="action-btn secondary small"
                                                    onClick={() => {
                                                        if (confirm("Discard all review items?")) setReviewItems([]);
                                                    }}
                                                >Discard All</button>
                                                <button
                                                    className="action-btn primary small"
                                                    onClick={() => {
                                                        const approved = reviewItems.map(i => ({ ...i, status: 'new-approved', message: 'Manually Approved (New)' }));
                                                        setItems([...items, ...approved]);
                                                        setReviewItems([]);
                                                        setTab('ready'); // Auto Switch
                                                    }}
                                                >Approve All ({reviewItems.length})</button>
                                            </div>
                                        </div>

                                        <div className="list-header">
                                            <div style={{ width: 40 }}>
                                                {/* Checkbox All? Future improvement */}
                                            </div>
                                            <div>Name</div>
                                            <div>City</div>
                                            <div>Action</div>
                                        </div>
                                        {reviewItems.map((item, index) => (
                                            <div key={index} className="list-row" style={{ background: '#fffaff' }}>
                                                <div style={{ width: 40, textAlign: 'center' }}>
                                                    <span style={{ fontSize: '14px' }}>⚠️</span>
                                                </div>
                                                <div className="cell"><b>{item.name}</b></div>
                                                <div className="cell">{item.city}</div>
                                                <div className="cell" style={{ display: 'flex', gap: 5 }}>
                                                    <button
                                                        className="approve-btn"
                                                        onClick={() => {
                                                            const newItem = { ...item, status: 'new-approved', message: 'Manually Approved (New)' };
                                                            setItems([...items, newItem]);

                                                            const newReview = [...reviewItems];
                                                            newReview.splice(index, 1);
                                                            setReviewItems(newReview);

                                                            if (newReview.length === 0) setTab('ready');
                                                        }}
                                                    >
                                                        ✅ Approve
                                                    </button>
                                                    <button
                                                        className="discard-btn"
                                                        onClick={() => {
                                                            const newReview = [...reviewItems];
                                                            newReview.splice(index, 1);
                                                            setReviewItems(newReview);
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {progress && <div className="progress-bar">{progress}</div>}
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    {step === 'input' ? (
                        <div className="footer-actions">
                            <button className="action-btn primary" onClick={parseInput}>
                                <span className="icon">📋</span>
                                <span>Verify Data</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* PRINT CONFIGURATION PANEL */}
                            {tab === 'ready' && items.length > 0 && (
                                <div className="print-config-panel" style={{
                                    padding: '10px',
                                    background: '#f8fafc',
                                    borderTop: '1px solid #e2e8f0',
                                    marginBottom: '10px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    gap: '15px',
                                    alignItems: 'center',
                                    fontSize: '0.85rem'
                                }}>
                                    <div style={{ fontWeight: '600', color: '#475569' }}>⚙️ Print Config:</div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        W (mm):
                                        <input
                                            type="number"
                                            value={printConfig.width}
                                            onChange={e => setPrintConfig({ ...printConfig, width: Number(e.target.value) })}
                                            style={{ width: '50px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        H (mm):
                                        <input
                                            type="number"
                                            value={printConfig.height}
                                            onChange={e => setPrintConfig({ ...printConfig, height: Number(e.target.value) })}
                                            style={{ width: '50px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={printConfig.gapFeed}
                                            onChange={e => setPrintConfig({ ...printConfig, gapFeed: e.target.checked })}
                                        />
                                        Gap Feed (Auto-Align)
                                    </label>
                                </div>
                            )}

                            <div className="footer-actions">
                                <button className="action-btn secondary back-btn" onClick={() => setStep('input')} disabled={isProcessing}>
                                    <Icons.ArrowLeft size={16} />
                                    <span>Back / Reset</span>
                                </button>

                                {/* Only show actions if in Ready tab and items exist */}
                                {tab === 'ready' && items.length > 0 && (
                                    <>
                                        <button className="action-btn secondary" onClick={generateZip} disabled={isProcessing}>
                                            <Icons.Download size={18} />
                                            <span>PDF Labels</span>
                                        </button>

                                        <button className="action-btn primary" onClick={generateIdZip} disabled={isProcessing}>
                                            <Icons.Download size={18} />
                                            <span>ID Cards (ZIP)</span>
                                        </button>

                                        <button className="action-btn print" onClick={printBatch} disabled={isProcessing}>
                                            <Icons.Print size={18} />
                                            <span>{isConnected ? `Print (${items.length})` : 'Connect Printer'}</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Hidden Render Area for html2canvas */}
                            <div className="hidden-render">
                                {processingItem && (
                                    <div style={{ width: 500, height: 300 }}>
                                        <DigitalCard
                                            ref={cardRef}
                                            customer={{
                                                nama: processingItem.name,
                                                kota: processingItem.city,
                                                cabang: processingItem.branch === '-' ? '' : processingItem.branch,
                                                kode: processingItem.kode || processingItem.displayId || 'N/A'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* LOADING OVERLAY */}
                {isProcessing && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <div className="loading-text">{progress || 'Processing...'}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
