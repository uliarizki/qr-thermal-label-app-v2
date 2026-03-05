import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * UpdatePrompt Component
 * Shows a banner when a new version of the app is available.
 * Users can click "Update" to reload and get the latest version.
 */
const UpdatePrompt = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
            // Check for updates every 30 minutes
            if (r) {
                setInterval(() => {
                    r.update();
                }, 30 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    if (!needRefresh) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 99999,
            animation: 'slideUp 0.3s ease-out'
        }}>
            <span>🎉 Update tersedia!</span>
            <button
                onClick={() => updateServiceWorker(true)}
                style={{
                    background: 'white',
                    color: '#4f46e5',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer'
                }}
            >
                Refresh
            </button>
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default UpdatePrompt;
