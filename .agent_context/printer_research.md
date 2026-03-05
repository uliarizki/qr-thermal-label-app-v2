# Native Printer Strategy: "Smart Manager" (Web & Mobile)

## 🎯 The Goal: "Ga Ribet" (Frictionless)
We need a single system that works on both:
1.  **Laptop/PC** (Windows) -> via **USB Cable**.
2.  **HP/Tablet** (Android) -> via **Bluetooth**.

---

## 🏗️ The Solution: Unified Printer Manager

We will build a **Smart Printer Context** that detects the device type and chooses the right connection method automatically.

### 1. Auto-Detection Logic
The app checks: *"Am I on a mobile device?"*
*   **If Desktop (Chrome/Edge):** Use **Web Serial API** (USB).
*   **If Mobile (Android Chrome):** Use **Web Bluetooth API**.

### 2. User Experience (Simple)
The user sees **ONE** button: `Connect Printer`.

*   **Scenario A: Sitting at Desk (Laptop + USB)**
    1.  User clicks `Connect`.
    2.  Browser shows "Select USB Port".
    3.  Connected! ✅

*   **Scenario B: Walking around (HP + Bluetooth)**
    1.  User clicks `Connect`.
    2.  Browser shows "Pair Bluetooth Device".
    3.  Connected! ✅

---

## 🛠️ Implementation Plan

### Step 1: `EscPosEncoder.js` (The Translator)
We need a utility to convert our label layout (Text, QR, Lines) into **ESC/POS Hex Code** (the language printers understand).
*   *Challenge:* Drawing the layout manually in code (e.g., `printer.text("Budi").newline()`).

### Step 2: `PrinterContext.jsx` (The Brain)
A global provider that manages the connection:
```javascript
const { connect, print, isConnected } = usePrinter();

const connect = () => {
   if (isMobile) return connectBluetooth();
   else return connectUsb();
}
```

### Step 3: UI Integration
*   Add a **Printer Status Icon** in the Header.
*   In `PrintPreview.jsx`, if `isConnected === true`, show a big **"Direct Print"** button.

---

## 📱 Mobile Specifics
*   **Web Bluetooth** is supported on Android Chrome.
*   **Permission:** Android location usage must be allowed for Bluetooth scanning (browser handles this).
*   **Backup:** If Web Bluetooth fails on certain cheap printers, we keep the **RawBT** (URI Scheme) as a backup method for Android.

## ✅ Recommendation
Proceed with building the **PrinterContext** first. It keeps the "messy" connection logic hidden away from the rest of the app.
