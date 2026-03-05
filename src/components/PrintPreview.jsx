import { useRef, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas'; // Import html2canvas
import QRCode from 'react-qr-code'; // Local QR Generation
import './Components.css';
import { generateLabelPdfVector } from '../utils/pdfGeneratorVector';
import { shareOrDownload, downloadBlob } from '../utils/shareUtils';
import { Icons } from './Icons';
import { calculateLabelLayout } from '../utils/labelLayout';
import { usePrinter } from '../context/PrinterContext';
import { renderLabelToCanvas, canvasToRaster } from '../utils/printHelpers'; // Unified Render Logic

const DEFAULT_SIZE = { width: 55, height: 42.5 }; // sebelumnya 55x40 atau 80x60

export default function PrintPreview({ data }) {
  const previewRef = useRef(null);
  const { isConnected, isConnecting, connect, print, connectionType } = usePrinter();
  const [isPrinting, setIsPrinting] = useState(false); // Status: false -> 'loading' -> 'success'
  const [quantity, setQuantity] = useState(1);

  // Unified Print Configuration
  const DEFAULT_CONFIG = {
    width: 55,
    height: 42.5,
    gapFeed: true,
    marginTop: 0,      // Vertical Offset
    marginBottom: 0    // Spacing (Bottom Gap)
  };

  const [useDefault, setUseDefault] = useState(true);
  const [printConfig, setPrintConfig] = useState(DEFAULT_CONFIG);

  // Reset to default when checkbox is checked
  useEffect(() => {
    if (useDefault) {
      setPrintConfig(prev => ({
        ...DEFAULT_CONFIG,
        marginTop: prev.marginTop,       // Keep manual offsets
        marginBottom: prev.marginBottom
      }));
    }
  }, [useDefault]);

  const handlePrint = async () => {
    if (isPrinting) return;

    setIsPrinting('loading');
    try {
      // Pass marginTop to layout? 
      // We need to pass it to generateLabelPdfVector
      // generateLabelPdfVector expects sizeMm object. We can add marginTop there.
      const configWithDefaults = useDefault
        ? { ...DEFAULT_CONFIG, marginTop: printConfig.marginTop, marginBottom: printConfig.marginBottom }
        : printConfig;

      const { blob, filename } = await generateLabelPdfVector(data, {
        ...configWithDefaults,
        quantity,
        returnBlob: true
      });

      downloadBlob(blob, filename);

      setIsPrinting('success');
      toast.success('PDF Saved Successfully!', { duration: 3000, icon: '📥' });
      setTimeout(() => setIsPrinting(false), 2000);
    } catch (err) {
      console.error('PDF error:', err);
      setIsPrinting(false);
      toast.error('Gagal generate PDF');
    }
  }

  const handleDirectPrint = async () => {
    if (!isConnected) {
      connect();
      return;
    }

    const toastId = toast.loading('Printing...');
    try {
      const activeConfig = useDefault
        ? { ...DEFAULT_CONFIG, marginTop: printConfig.marginTop, marginBottom: printConfig.marginBottom }
        : printConfig;

      const labelData = {
        nt: data.nt || data.nama,
        at: data.at || data.kota,
        ws: data.ws || data.cabang,
        it: data.it || data.id,
        pt: data.pt || data.sales,
        raw: data.raw || JSON.stringify(data)
      };

      const canvas = await renderLabelToCanvas(labelData, {
        width: activeConfig.width,
        height: activeConfig.height,
        marginTop: activeConfig.marginTop,
        paddingBottom: activeConfig.marginBottom // Pass Spacing as Padding Bottom
      });

      const canvasToRaster = (await import('../utils/printHelpers')).canvasToRaster;
      const rasterData = canvasToRaster(canvas);

      let finalData = rasterData;
      if (activeConfig.gapFeed) {
        const feedCmd = new Uint8Array([0x0C]);
        const combined = new Uint8Array(rasterData.length + feedCmd.length);
        combined.set(rasterData);
        combined.set(feedCmd, rasterData.length);
        finalData = combined;
      }

      for (let i = 0; i < quantity; i++) {
        await print(finalData);
      }
      toast.success('Sent to Printer', { id: toastId });

    } catch (err) {
      console.error(err);
      toast.error('Print Failed: ' + err.message, { id: toastId });
    }
  };

  const handleShare = async () => {
    const activeConfig = useDefault
      ? { ...DEFAULT_CONFIG, marginTop: printConfig.marginTop, marginBottom: printConfig.marginBottom }
      : printConfig;

    const toastId = toast.loading('Generating for share...');
    try {
      const { blob, filename } = await generateLabelPdfVector(data, {
        ...activeConfig,
        quantity,
        returnBlob: true
      });

      await shareOrDownload(blob, filename);
      toast.dismiss(toastId);
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Gagal share PDF', { id: toastId });
    }
  };

  // Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+P or Command+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrinting, printConfig, quantity, data, useDefault]);

  const maxPreviewWidthPx = 260; // kira2 lebar card, bisa kamu geser
  const mmToPx = 4;              // asumsi 1mm ≈ 4px di layar

  const previewScale = Math.min(
    maxPreviewWidthPx / (printConfig.width * mmToPx),
    1
  );

  return (
    <div className="customer-detail">
      <div className="print-controls">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3>🖨️ Print Settings</h3>
          {/* Fallback info for desktop */}
          {!navigator.share && <span style={{ fontSize: '0.8em', color: '#666' }}>Web Share not supported</span>}
        </div>

        {/* UNIFIED PRINT CONFIGURATION PANEL */}
        <div className="print-config-panel" style={{
          padding: '10px',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          marginBottom: '10px',
          borderRadius: '6px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          alignItems: 'center',
          fontSize: '0.85rem'
        }}>
          {/* Row 1: Main Controls */}
          <div style={{ width: '100%', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useDefault}
                onChange={e => setUseDefault(e.target.checked)}
              />
              Default Size (55x42.5)
            </label>

            <div style={{ width: 1, height: 20, background: '#cbd5e1' }}></div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Jumlah:
              <input
                type="number"
                value={quantity}
                onChange={e => {
                  const val = e.target.value;
                  // Allow empty string to let user delete current value
                  if (val === '') {
                    setQuantity('');
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) setQuantity(num);
                  }
                }}
                onBlur={() => {
                  // Reset to 1 if empty or invalid on blur
                  if (quantity === '' || quantity < 1) setQuantity(1);
                }}
                min="1"
                max="100"
                style={{ width: '45px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
              />
            </label>
          </div>

          {/* Row 2: Advanced Dimensions */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', opacity: useDefault ? 0.6 : 1, pointerEvents: useDefault ? 'none' : 'auto' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              W:
              <input
                type="number"
                value={useDefault ? 55 : printConfig.width}
                onChange={e => setPrintConfig({ ...printConfig, width: Number(e.target.value) })}
                style={{ width: '45px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                disabled={useDefault}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              H:
              <input
                type="number"
                value={useDefault ? 42.5 : printConfig.height}
                onChange={e => setPrintConfig({ ...printConfig, height: Number(e.target.value) })}
                style={{ width: '45px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                disabled={useDefault}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={printConfig.gapFeed}
                onChange={e => setPrintConfig({ ...printConfig, gapFeed: e.target.checked })}
              />
              Gap Feed
            </label>
          </div>

          {/* Row 3: Vertical Adjustment (Always Active) */}
          <div style={{ width: '100%', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.8em', color: '#64748b', minWidth: '60px' }}>Adjust:</span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Geser posisi print ke bawah (negatif = ke atas)">
              Y-Offset:
              <input
                type="number"
                value={printConfig.marginTop}
                onChange={e => setPrintConfig({ ...printConfig, marginTop: Number(e.target.value) })}
                step="0.5"
                style={{ width: '50px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Tambah jarak/spasi setelah label (untuk koreksi gap)">
              Spacing:
              <input
                type="number"
                value={printConfig.marginBottom}
                onChange={e => setPrintConfig({ ...printConfig, marginBottom: Number(e.target.value) })}
                step="0.5"
                min="0"
                style={{ width: '50px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </label>
          </div>
        </div>

        <div className="size-selector">
          <p style={{ fontSize: '0.8rem', color: '#666' }}>Default: 55 × 42.5 mm (thermal label)</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          {/* TOMBOL NATIVE PRINTING */}
          <button
            onClick={isConnected ? handleDirectPrint : connect}
            className="print-btn"
            disabled={isConnecting}
            style={{
              flex: 1.5,
              background: isConnected ? '#10b981' : '#4f46e5',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              cursor: 'pointer'
            }}
          >
            {isConnecting ? (
              <>
                <span className="animate-spin"><Icons.Refresh size={20} /></span>
                <span>Connecting...</span>
              </>
            ) : isConnected ? (
              <>
                <Icons.Print size={20} />
                <span>Print ({connectionType === 'usb' ? 'USB' : 'BT'})</span>
              </>
            ) : (
              <>
                <Icons.Print size={20} />
                <span>Connect Printer</span>
              </>
            )}
          </button>

          {/* TOMBOL KIRI: DOWNLOAD PDF */}
          <button
            onClick={handlePrint}
            className={`print-btn ${isPrinting === 'success' ? 'success' : ''}`}
            disabled={isPrinting === 'loading'}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px'
            }}
          >
            {isPrinting === 'loading' ? (
              <>
                <span className="animate-spin"><Icons.Refresh size={20} /></span>
                <span>Generating...</span>
              </>
            ) : isPrinting === 'success' ? (
              <>
                <Icons.Check size={20} />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Icons.Download size={20} />
                <span>Save PDF</span>
              </>
            )}
          </button>

          {/* TOMBOL KANAN: DIRECT SHARE */}
          <button
            onClick={handleShare}
            className="print-btn"
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              cursor: 'pointer'
            }}
            title="Share or Open PDF"
          >
            <Icons.Share size={20} />
            <span>Direct Share</span>
          </button>
        </div>
      </div>

      <div className="preview-container">
        <h3>Preview Label</h3>
        <div className="preview-wrapper">

          {/* SATU-SATUNYA ELEMEN YANG DIPakai PDF + PREVIEW */}
          <div
            ref={previewRef}
            className="label-root"
            style={{
              width: `${(useDefault ? 55 : printConfig.width)}mm`,
              height: `${(useDefault ? 42.5 : printConfig.height)}mm`,
              padding: '0mm',
              background: 'white',
              boxSizing: 'border-box',
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
          >
            <LabelContent
              data={data}
              labelSize={useDefault ? { ...printConfig, width: 55, height: 42.5 } : printConfig}
            />
          </div>
        </div>
      </div>
    </div >
  );
}



// ... (existing imports, keep them)

// Helper to measure text in browser approx mm
const measureTextBrowser = (text, fontSizePt, isBold) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  // conversion: 1pt approx 1.333px, 1mm approx 3.78px
  const fontSizePx = fontSizePt * 1.333;
  context.font = `${isBold ? 'bold ' : ''}${fontSizePx}px Arial, sans-serif`;
  const widthPx = context.measureText(text).width;
  return (widthPx / 3.78) * 1.1; // +10% buffer to be safe vs PDF rendering
};

function LabelContent({ data, labelSize }) {
  // Calculate layout using the shared engine
  const layout = calculateLabelLayout(data, measureTextBrowser, labelSize);
  const { qr, id, name, city, sales, branch } = layout;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: 'Helvetica, Arial, sans-serif',
        // Visual debug: border? No.
      }}
    >
      {/* 1. QR Code */}
      <div
        style={{
          position: 'absolute',
          left: `${qr.x}mm`,
          top: `${qr.y}mm`,
          width: `${qr.size}mm`,
          height: `${qr.size}mm`,
        }}
      >
        <QRCode
          value={data.raw || JSON.stringify(data)}
          size={256}
          style={{ height: "100%", width: "100%" }}
          viewBox={`0 0 256 256`}
        />
      </div>

      {/* 2. ID */}
      <div
        style={{
          position: 'absolute',
          left: `${id.x}mm`,
          top: `${id.y}mm`,
          fontSize: `${id.fontSize}pt`,
          fontWeight: id.isBold ? 'bold' : 'normal',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {id.text}
      </div>

      {/* 3. Name (Lines) */}
      {name.lines.map((line, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${name.x}mm`,
            // Fix: Combine baseline adjustment AND line spacing offset
            top: `${(name.y + (index * name.lineHeightMm)) - (name.fontSize * 0.28)}mm`,
            fontSize: `${name.fontSize}pt`,
            fontWeight: name.isBold ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {line}
        </div>
      ))}

      {/* 4. City (Lines) */}
      {city.lines.map((line, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${city.x}mm`,
            top: `${(city.y + (index * city.lineHeightMm)) - (city.fontSize * 0.28)}mm`,
            fontSize: `${city.fontSize}pt`,
            fontWeight: city.isBold ? 'bold' : 'normal',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {line}
        </div>
      ))}

      {/* 5. Sales */}
      <div
        style={{
          position: 'absolute',
          left: `${sales.x}mm`,
          top: `${sales.y - (sales.fontSize * 0.28)}mm`,
          fontSize: `${sales.fontSize}pt`,
          fontWeight: sales.isBold ? 'bold' : 'normal',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {sales.text}
      </div>

      {/* 6. Branch */}
      {branch.text && (
        <div
          style={{
            position: 'absolute',
            left: `${branch.x}mm`,
            top: `${branch.y - (branch.fontSize * 0.28)}mm`,
            fontSize: `${branch.fontSize}pt`,
            fontWeight: branch.isBold ? 'bold' : 'normal',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {branch.text}
        </div>
      )}
    </div>
  );
}
