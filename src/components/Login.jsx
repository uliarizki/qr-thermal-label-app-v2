import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset } from '../utils/googleSheets';
import { toast } from 'react-hot-toast';
import '../App.css';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // NEW
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // NEW: Error state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error

    if (!username || !password) {
      setError('Username dan Password wajib diisi.');
      return;
    }

    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);

    if (!success) {
      setError('Username atau Password salah. Silakan coba lagi.');
    }
  };

  const handleForgot = async () => {
    if (!username) {
      toast.error('Isi username dulu untuk reset password');
      return;
    }
    const toastId = toast.loading('Sending OTP...');
    const res = await requestPasswordReset(username);
    if (res.success) {
      toast.success('OTP terkirim ke email admin!', { id: toastId });
      alert("Cek Email uliarizki@gmail.com untuk OTP.");
    } else {
      toast.error('Gagal: ' + res.error, { id: toastId });
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 480 }}> {/* Widened for desktop */}

        {/* LOGO "COIN" STYLE - Hides white corners */}
        {/* LOGO "PREMIUM" STYLE - Transparent with Glow */}
        <div style={{
          width: 180,
          height: 180,
          margin: '0 auto 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* Subtle Ambient Glow behind logo */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%',
            zIndex: 0
          }} />

          <img
            src="/logo_brand.png"
            alt="Bintang Mas Logo"
            className="login-logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              zIndex: 1,
              filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.4))'
            }}
          />
        </div>

        {/* BRAND TITLE - KAUSHAN SCRIPT */}
        <h1 style={{
          fontFamily: "var(--font-brand)",
          fontSize: '3rem',
          margin: '10px 0',
          background: 'linear-gradient(to bottom, #D4AF37, #B59024)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          fontWeight: 400 // Script fonts usually don't need bold
        }}>
          Bintang Mas
        </h1>

        <p style={{
          color: '#ccc',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontSize: 12,
          marginTop: -10,
          marginBottom: 30
        }}>
          Enterprise System
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{ color: '#D4AF37', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, display: 'block', marginBottom: 5 }}>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="login-input"
              style={{
                width: '100%',
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid #444',
                color: 'white',
                borderRadius: 8,
                fontSize: 16,
                outline: 'none',
                transition: 'border 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#D4AF37'}
              onBlur={(e) => e.target.style.borderColor = '#444'}
              placeholder="e.g. admin"
            />
          </div>

          <div style={{ marginBottom: 30, textAlign: 'left' }}>
            <label style={{ color: '#D4AF37', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, display: 'block', marginBottom: 5 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  paddingRight: '45px', // Make room for the eye
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid #444',
                  color: 'white',
                  borderRadius: 8,
                  fontSize: 16,
                  outline: 'none',
                  transition: 'border 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#D4AF37'}
                onBlur={(e) => e.target.style.borderColor = '#444'}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? (
                  /* Eye Off Icon (Simple SVG) */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  /* Eye Icon (Simple SVG) */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ERROR FEEDBACK */}
          {error && (
            <div style={{
              color: '#ff4d4d',
              background: 'rgba(255, 77, 77, 0.1)',
              border: '1px solid rgba(255, 77, 77, 0.3)',
              padding: '10px',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading}
            style={{
              padding: 18,
              fontSize: 16,
              letterSpacing: 1,
              textTransform: 'uppercase',
              boxShadow: '0 5px 15px rgba(212, 175, 55, 0.3)'
            }}
          >
            {isLoading ? 'Authenticating...' : 'Enter System'}
          </button>
        </form>

        <p
          onClick={handleForgot}
          style={{
            color: '#666',
            fontSize: 12,
            marginTop: 25,
            cursor: 'pointer',
            transition: 'color 0.2s'
          }}
          onMouseOver={e => e.target.style.color = '#D4AF37'}
          onMouseOut={e => e.target.style.color = '#666'}
        >
          Forgot Password?
        </p>
      </div>
    </div>
  );
}
