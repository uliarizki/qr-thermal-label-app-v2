import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.hash = ''; // Clear potentially bad hash
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'sans-serif',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFF5F5'
                }}>
                    <h1 style={{ color: '#C53030' }}>⚠️ Oops, Something went wrong.</h1>
                    <p style={{ maxWidth: '500px', color: '#4A5568', marginBottom: '1rem' }}>
                        Aplikasi mengalami error. Mohon maaf atas ketidaknyamanan ini.
                    </p>

                    <div style={{
                        background: '#fff',
                        padding: '1rem',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        textAlign: 'left',
                        maxWidth: '80%',
                        overflow: 'auto',
                        marginBottom: '1.5rem',
                        border: '1px solid #FC8181'
                    }}>
                        <code style={{ color: '#E53E3E', display: 'block', marginBottom: '0.5rem' }}>
                            {this.state.error && this.state.error.toString()}
                        </code>
                        <details style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#718096' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    </div>

                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '10px 20px',
                            background: '#C53030',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 Refresh App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
