import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const PrinterContext = createContext();

export function usePrinter() {
    return useContext(PrinterContext);
}

export function PrinterProvider({ children }) {
    const [device, setDevice] = useState(null);
    const [connectionType, setConnectionType] = useState(null); // 'usb-serial' | 'webusb' | 'bluetooth'
    const [isConnecting, setIsConnecting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false); // Global print lock

    // Auto-detect mobile environment
    // Rough check: Android/iOS usually implying mobile logic
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // --- 1. WEB SERIAL (COM PORTS / CDC) ---
    const connectSerial = async () => {
        if (!navigator.serial) {
            toast.error('Web Serial API not supported by this browser (Use Chrome/Edge).');
            return;
        }

        setIsConnecting(true);
        try {
            const port = await navigator.serial.requestPort();

            // Handle if port is already open (from catch block re-try logic or browser state)
            try {
                await port.open({ baudRate: 9600 }); // Standard POS baudrate
            } catch (openErr) {
                if (openErr.message.includes('already open')) {
                    console.log('Port already open, reusing...');
                    // It's fine, we can reuse it. 
                } else {
                    throw openErr; // Rethrow real errors
                }
            }

            setDevice(port);
            setConnectionType('usb-serial');
            toast.success('Serial Printer Connected!');
        } catch (err) {
            console.error(err);
            // Ignore "No port selected" error
            if (err.name === 'NotFoundError' || err.message.includes('No port selected')) {
                // Do nothing
            } else {
                toast.error('Failed to connect USB: ' + err.message);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const printSerial = async (data) => {
        if (!device || connectionType !== 'usb-serial') return;

        // Prevent concurrent writes
        if (device.writable.locked) {
            console.warn('Printer stream locked, waiting...');
            // Optional: Implement Queue or just return
            return;
        }

        const writer = device.writable.getWriter();
        try {
            await writer.write(data);
        } finally {
            writer.releaseLock();
        }
    };

    // --- 2. WEB USB (RAW USB / WINUSB) ---
    const connectWebUsb = async () => {
        if (!navigator.usb) {
            toast.error('WebUSB not supported.');
            return;
        }

        setIsConnecting(true);
        try {
            // Request any device (user filters in picker)
            const usbDevice = await navigator.usb.requestDevice({ filters: [] });
            await usbDevice.open();

            // Auto-select configuration and interface
            // Usually Config 1, Interface 0 for printers
            if (usbDevice.configuration === null) await usbDevice.selectConfiguration(1);
            await usbDevice.claimInterface(0);

            setDevice(usbDevice);
            setConnectionType('webusb');
            toast.success('USB (Native) Connected!');
        } catch (err) {
            console.error(err);
            if (!err.message.includes('No device selected')) {
                toast.error('WebUSB Error: ' + err.message);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const printWebUsb = async (data) => {
        if (!device || connectionType !== 'webusb') return;

        // Find OUT endpoint
        const endpoints = device.configuration.interfaces[0].alternate.endpoints;
        const outEndpoint = endpoints.find(e => e.direction === 'out');

        if (!outEndpoint) throw new Error('No OUT endpoint found on printer');

        // Transfer data
        await device.transferOut(outEndpoint.endpointNumber, data);
    };

    // --- BLUETOOTH (WEB BLUETOOTH) LOGIC ---
    const connectBluetooth = async () => {
        if (!navigator.bluetooth) {
            toast.error('Web Bluetooth API not supported (Use Chrome on Android).');
            return;
        }

        setIsConnecting(true);
        try {
            const btDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Standard Service UUID for Thermal Printers
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            const server = await btDevice.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb'); // Write Characteristic

            setDevice(characteristic); // Keep the characteristic as the "device" handle for writing
            setConnectionType('bluetooth');

            btDevice.addEventListener('gattserverdisconnected', () => {
                setDevice(null);
                setConnectionType(null);
                toast.error('Bluetooth Disconnected');
            });

            toast.success('Bluetooth Printer Connected!');
        } catch (err) {
            console.error(err);
            // Fallback hint
            toast.error('Bluetooth Error: ' + err.message + '. Try enabling Location/Bluetooth.');
        } finally {
            setIsConnecting(false);
        }
    };

    const printBluetooth = async (data) => {
        if (!device || connectionType !== 'bluetooth') return;
        // Bluetooth MTU limit is usually 512 bytes, need chunking for large prints
        const CHUNK_SIZE = 100; // Safe chunk size
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            await device.writeValue(chunk);
        }
    };

    // --- UNIFIED INTERFACE ---
    const connect = () => {
        // Smart Switch
        if (isMobile) {
            connectBluetooth();
        } else {
            // Desktop: Try WebUSB (Raw) first, user might have Zadig setup
            // Or ideally prompt user. For now, assume WebUSB if WinUSB driver is active.
            connectWebUsb();
        }
    };

    const disconnect = async () => {
        if (device) {
            if (connectionType === 'usb-serial') {
                try { await device.close(); } catch (e) { }
            } else if (connectionType === 'bluetooth') {
                try { device.service.device.gatt.disconnect(); } catch (e) { }
            } else if (connectionType === 'webusb') {
                try { await device.close(); } catch (e) { }
            }
        }
        setDevice(null);
        setConnectionType(null);
    };

    const print = async (uint8Data) => {
        if (!device) {
            toast.error('No printer connected!');
            return;
        }

        if (isPrinting) return; // Prevent spam clicks
        setIsPrinting(true);

        try {
            if (connectionType === 'usb-serial') await printSerial(uint8Data);
            else if (connectionType === 'webusb') await printWebUsb(uint8Data);
            else await printBluetooth(uint8Data);
            // toast.success('Sent to Printer'); // Optional feedbacxk
        } catch (e) {
            console.error(e);
            toast.error('Print Error: ' + e.message);
            setDevice(null); // Assume disconnected on error
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <PrinterContext.Provider value={{
            isConnected: !!device,
            isConnecting,
            connect: connect, // Expose unified connect
            connectSerial, // Fallback exposure
            connectWebUsb, // Fallback exposure
            disconnect,
            print,
            connectionType,
            isPrinting, // Export lock state
        }}>

            {children}
        </PrinterContext.Provider>
    );
}
