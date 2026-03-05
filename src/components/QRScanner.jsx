import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { addHistory } from '../utils/history'
import './Components.css'

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null) // Dedicated stream ref for cleanup
  const [hasCamera, setHasCamera] = useState(true)
  const [isScanning, setIsScanning] = useState(true)
  const [lastScanned, setLastScanned] = useState(null)
  const [error, setError] = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  /* 60 Seconds auto-off */
  const TIMEOUT_DURATION = 60000;

  // Auto-off Timer
  useEffect(() => {
    let timer;
    if (isScanning) {
      timer = setTimeout(() => {
        setIsScanning(false);
        // Using alert might be too intrusive, maybe just stop it? 
        // Or update UI to show it timed out. 
        // Let's rely on the "Resume" button label change.
      }, TIMEOUT_DURATION);
    }
    return () => clearTimeout(timer);
  }, [isScanning]);

  useEffect(() => {
    const stopTracks = () => {
      // Robust cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false; // Disable specifically
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause(); // Explicit pause
        videoRef.current.srcObject = null;
      }
    }

    const startCamera = async () => {
      try {
        if (!window.isSecureContext) {
          setHasCamera(false)
          setError('Akses kamera membutuhkan HTTPS atau localhost.')
          setPermissionDenied(true)
          return
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setHasCamera(false)
          setError('Browser tidak mendukung akses kamera. Coba gunakan Chrome/Firefox versi terbaru dengan HTTPS.')
          setPermissionDenied(true)
          return
        }

        // Hentikan stream lama
        stopTracks()

        const requestStream = async () => {
          try {
            return await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            })
          } catch (err) {
            return await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            })
          }
        }

        const stream = await requestStream()
        streamRef.current = stream // Simpan stream di ref yang aman

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.muted = true
          const playPromise = videoRef.current.play()
          if (playPromise?.catch) {
            playPromise.catch(() => { })
          }
        }
        setHasCamera(true)
        setError(null)
        setPermissionDenied(false)
      } catch (error) {
        console.error('Error accessing camera:', error)
        setHasCamera(false)
        const msg = error?.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Beri izin kamera di browser.'
          : error?.name === 'NotFoundError'
            ? 'Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.'
            : 'Kamera tidak tersedia. Pastikan Anda memberikan izin akses kamera.'
        setError(msg)
        setPermissionDenied(error?.name === 'NotAllowedError')
      }
    }

    if (isScanning) {
      startCamera()
    } else {
      stopTracks()
    }

    return () => {
      stopTracks()
    }
  }, [isScanning])

  useEffect(() => {
    if (!isScanning) return

    const scanQR = () => {
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video?.readyState === video?.HAVE_ENOUGH_DATA && canvas) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        context.drawImage(video, 0, 0)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code) {
          try {
            const data = JSON.parse(code.data)
            if (data.it && data.nt) {
              setLastScanned(data)
              setIsScanning(false)
              setError(null)

              // Log history
              addHistory('SCAN', {
                customerId: data.it,
                nama: data.nt,
                kota: data.at || '',
              })

              onScan(data)
            }
          } catch (e) {
            console.log('Invalid JSON in QR code')
          }
        }
      }

      requestAnimationFrame(scanQR)
    }

    const frameId = requestAnimationFrame(scanQR)
    return () => cancelAnimationFrame(frameId)
  }, [isScanning, onScan])

  // Handlers
  const handleOverlayClick = () => {
    if (!isScanning) {
      setIsScanning(true);
    }
  };

  if (!hasCamera) {
    return (
      <div className="scanner-container">
        <div className="error-box">
          ❌ {error}
        </div>
        {permissionDenied && (
          <button
            className="rescan-btn"
            onClick={() => {
              setHasCamera(true);
              setError(null);
              setPermissionDenied(false);
              setIsScanning(false);
              setTimeout(() => setIsScanning(true), 100);
            }}
          >
            🔄 Aktifkan kamera kembali
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="page-card">
      <div className="scanner-container">



        {/* Scanner Box with Click-to-Resume */}
        <div className="scanner-box" onClick={handleOverlayClick} style={{ cursor: !isScanning ? 'pointer' : 'default' }}>
          <video
            ref={videoRef}
            className="scanner-video"
            autoPlay
            playsInline
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="scanner-overlay">
            <div className={`scanner-frame ${!isScanning ? 'paused-frame' : ''}`}></div>
            {!isScanning && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.7)',
                padding: '15px 25px',
                borderRadius: 12,
                color: 'white',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: 40, marginBottom: 5 }}>▶️</div>
                <div style={{ fontSize: 14 }}>Tap layar untuk lanjut scan</div>
              </div>
            )}
          </div>

          {isScanning && <p className="scanner-hint">Arahkan kamera ke QR Code</p>}
        </div>

        {lastScanned && (
          <div className="last-scanned">
            <h3>📍 Terakhir di-scan:</h3>
            <p><strong>{lastScanned.nt}</strong></p>
            <p>ID: {lastScanned.it}</p>
            <button onClick={() => setIsScanning(true)} className="rescan-btn">
              🔄 Scan Ulang
            </button>
          </div>
        )}


      </div>
    </div>
  )
}
