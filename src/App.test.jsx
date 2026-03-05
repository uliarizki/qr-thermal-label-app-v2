import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock matchMedia because jsdom does not support it
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock modules that make API calls
vi.mock('./utils/googleSheets', () => ({
    getCustomers: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getCachedCustomers: vi.fn().mockReturnValue([]), // Added
    getLastUpdate: vi.fn().mockReturnValue(null),
    addCustomer: vi.fn(),
    searchCustomer: vi.fn(),
}));

vi.mock('./context/AuthContext', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        AuthProvider: ({ children }) => <div>{children}</div>,
        useAuth: vi.fn().mockReturnValue({
            user: { username: 'testuser', role: 'admin' },
            loading: false,
            logout: vi.fn()
        }),
    };
});

// Mock jsQR used in QRScanner because it might have canvas dependencies
vi.mock('jsqr', () => ({
    default: vi.fn(),
}));

describe('App', () => {
    it('renders the main title', () => {
        render(<App />);
        const titleElement = screen.getByText(/Qr Thermal Label App/i);
        expect(titleElement).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
        render(<App />);
        expect(screen.getByText('Customer')).toBeInTheDocument();
        expect(screen.getByText('Baru')).toBeInTheDocument();
        expect(screen.getByText('Event')).toBeInTheDocument();
        expect(screen.getByText('History')).toBeInTheDocument();
    });
});
