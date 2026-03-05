/**
 * =========================================================
 * BINTANG MAS - ENTERPRISE BACKEND (v2.1 Hybrid)
 * Security: SHA-256 Hashing | Data: Manual Index Mapping (Stabilized)
 * =========================================================
 */

// --- CONFIGURATION ---
const SPREADSHEET_ID = '1WEKC5zNNNcwv1I697pz2z7pAKqP_VpTCRc5Dt5izkk8'; // ID Spreadsheet Bintang Mas
const SHEET_CUSTOMERS = 'Custs'; // Sesuai request user: 'Custs'
const SHEET_USERS = 'Users';
const SHEET_HISTORY = 'History_Log';
const SHEET_ATTENDANCE = 'Attendance'; // New Sheet for Guest Book
const ADMIN_EMAIL = 'uliarizki@gmail.com';

function doGet(e) {
    return ContentService.createTextOutput("Backend Active (v2.1 Hybrid)");
}

function doPost(e) {
    // Global lock removed to allow concurrent reads (getCustomers)
    // Write operations use withLock() individually.

    try {
        let action = e.parameter.action;
        let payload = null;

        // Support both URL param and Body JSON
        if (e.postData && e.postData.contents) {
            try {
                const json = JSON.parse(e.postData.contents);
                if (json.action) action = json.action;
                payload = json;
            } catch (err) {
                // Fallback if not JSON
            }
        }

        if (!action) throw new Error("No action specified");

        let result;
        switch (action) {
            // --- AUTHENTICATION (SECURE SHA-256) ---
            // --- AUTHENTICATION (SECURE SHA-256) ---
            case 'login':
                result = handleLogin(payload.username, payload.password);
                break;
            case 'register':
                result = handleRegister(payload.username, payload.password, payload.role, payload.creatorRole);
                break;
            case 'requestPasswordReset':
                result = handleRequestReset(payload.username);
                break;
            case 'resetPasswordWithOTP':
                result = handleResetWithOTP(payload.username, payload.otp, payload.newPassword);
                break;

            // --- DATA CUSTOMERS (ROBUST MAPPING) ---
            case 'getCustomers':
                // READ operation - No lock needed (concurrency allowed)
                result = getCustomerData();
                break;
            case 'getCustomersLite':
                // Optimized for Search: Returns only ID, Nama, Kota
                result = getCustomerDataLite();
                break;
            case 'addCustomer':
                // WRITE operation
                result = addCustomerData(payload.customer);
                break;
            case 'editCustomer':
                // WRITE operation
                result = editCustomerData(payload.customer);
                break;

            // --- HISTORY ---
            case 'logActivity':
                result = logHistory(payload.user, payload.activity, payload.details);
                break;
            case 'getGlobalHistory':
                result = getGlobalHistory(payload.userRole);
                break;

            // --- USER MANAGEMENT (NEW) ---
            case 'getUsers':
                result = handleGetUsers(payload.role);
                break;
            case 'deleteUser':
                result = handleDeleteUser(payload.username, payload.role, payload.targetUser);
                break;

            // --- GUEST BOOK / ATTENDANCE (NEW) ---
            case 'checkIn':
                result = handleCheckIn(payload.customer);
                break;
            case 'addAndCheckIn':
                // Composite Action: Add Master -> Check In
                result = handleAddAndCheckIn(payload.customer);
                break;
            case 'getAttendance':
                result = getAttendanceList();
                break;

            default:
                return errorResponse("Unknown action: " + action);
        }

        return successResponse(result);

    } catch (error) {
        return errorResponse(error.toString());
    }
}

// --- AUTH LOGIC (KEEPING SECURITY HIGH) ---

function handleLogin(username, password) {
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(username).toLowerCase()) {
            const storedHash = data[i][1];
            const role = data[i][2];

            // Verify: Hash input password -> Compare with stored hash
            if (verifyHash(password, storedHash)) {
                return {
                    token: Utilities.getUuid(),
                    username: data[i][0],
                    role: role
                };
            }
            throw new Error("Password salah!");
        }
    }

    // First Run: Auto-create Admin if missing
    if (username === 'admin' && password === 'admbt123') {
        createFirstAdmin();
        return { token: 'master-token', username: 'admin', role: 'admin' };
    }

    throw new Error("User tidak ditemukan");
}

function handleRegister(username, password, role, creatorRole) {
    if (creatorRole !== 'admin') throw new Error("Unauthorized");
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(username).toLowerCase()) {
            throw new Error("Username sudah ada!");
        }
    }

    sheet.appendRow([username, hashString(password), role, new Date()]);
    return { message: "User created" };
}

// --- DATA LOGIC (ROBUST INDEX MAPPING) ---
// Menggunakan index manual (0,1,2...) agar tidak error saat header beda

// --- DATA LOGIC (ROBUST INDEX MAPPING + CACHING) ---
// Menggunakan index manual (0,1,2...) agar tidak error saat header beda

const CACHE_KEY_CUSTOMERS = 'ALL_CUSTOMERS_V2';
const CACHE_DURATION = 21600; // 6 hours (Max allowed)

function getCustomerData() {
    // 1. Try Cache First (DISABLED FOR DEBUGGING)
    // const cachedData = getFromCache(CACHE_KEY_CUSTOMERS);
    // if (cachedData) {
    //    return cachedData; 
    // }

    // 2. Read from Sheet (Slow)
    const sheet = getSheet(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();

    // Skip Header (row 0)
    const customers = data.slice(1).map(row => ({
        no: row[0],        // Kolom A
        id: row[1],        // Kolom B
        nama: row[2],        // Kolom C
        kota: row[3],        // Kolom D
        sales: row[4],        // Kolom E
        pabrik: row[5],       // Kolom F
        cabang: row[6],       // Kolom G
        telp: row[7],        // Kolom H
        kode: row[8] ? row[8].toString() : (row[1] ? row[1].toString() : '') // Kolom I (Fallback ke ID)
    }));

    // 3. Save to Cache (DISABLED FOR DEBUGGING)
    // saveToCache(CACHE_KEY_CUSTOMERS, customers);

    return customers;
}

function getCustomerDataLite() {
    const sheet = getSheet(SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();

    // Return only ID (Col B), Nama (Col C), Kota (Col D), Cabang (Col G)
    // Faster parsing & smaller JSON size
    return data.slice(1).map(row => ({
        id: row[1],
        nama: row[2],
        kota: row[3],
        cabang: row[6] // Include Cabang for context
    }));
}

function addCustomerData(c) {
    const sheet = getSheet(SHEET_CUSTOMERS);

    // Find next empty row based on Column C (Nama) - Index 3
    // User requested to check 'Nama' column specifically to find the last valid data row.
    const lastRow = getLastRowByColumn(sheet, 3); // 3 = Column C (Nama)
    const newRow = lastRow + 1;

    const values = [[
        c.id || '',           // Col B
        c.nama || '',         // Col C
        c.kota || '',         // Col D
        c.sales || '',        // Col E
        c.pabrik || '',       // Col F
        c.cabang || '',       // Col G
        c.telp || '',         // Col H
        c.kode || c.id || ''  // Col I
    ]];

    sheet.getRange(newRow, 2, 1, 8).setValues(values);

    // 4. INVALIDATE CACHE (DISABLED FOR DEBUGGING)
    // try {
    //    CacheService.getScriptCache().remove(CACHE_KEY_CUSTOMERS + "_meta");
    // } catch (e) {}

    return { message: "Saved" };
}

// --- SMART CHUNKED CACHING HELPER ---
// GAS Cache limit is 100KB per key. We split large JSONs.

function saveToCache(key, data) {
    try {
        const json = JSON.stringify(data);
        const cache = CacheService.getScriptCache();
        const chunkSize = 100000; // ~100KB safe limit
        const chunks = [];

        // Split string
        for (let i = 0; i < json.length; i += chunkSize) {
            chunks.push(json.substring(i, i + chunkSize));
        }

        // Prepare batch (key_total = count)
        // key_0, key_1 ...
        const cacheObj = {};
        cacheObj[key + "_meta"] = chunks.length.toString();

        chunks.forEach((chunk, index) => {
            cacheObj[key + "_" + index] = chunk;
        });

        cache.putAll(cacheObj, CACHE_DURATION);
    } catch (e) {
        // Cache failed (too big or quota exceeded), ignore
    }
}

function getFromCache(key) {
    const cache = CacheService.getScriptCache();
    // Check metadata first
    const meta = cache.get(key + "_meta");
    if (!meta) return null;

    const totalChunks = parseInt(meta);
    const keys = [];
    for (let i = 0; i < totalChunks; i++) {
        keys.push(key + "_" + i);
    }

    // Fetch all chunks
    const result = cache.getAll(keys);
    let json = "";

    for (let i = 0; i < totalChunks; i++) {
        const chunk = result[key + "_" + i];
        if (!chunk) return null; // Corrupted/Missing chunk
        json += chunk;
    }

    return JSON.parse(json);
}

// Helper to find last row with data in a specific column (1-based index)
function getLastRowByColumn(sheet, colIndex) {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) return 0;

    const range = sheet.getRange(1, colIndex, lastRow);
    const values = range.getValues();

    for (let i = values.length - 1; i >= 0; i--) {
        if (values[i][0] !== "" && values[i][0] !== null) {
            return i + 1;
        }
    }
    return 0; // Header row logic might need +1 if header exists, but this returns raw index
}

// --- HELPERS & SECURITY UTILS ---

function getSheet(name) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
        // Auto-create jika hilang
        sheet = ss.insertSheet(name);
        if (name === SHEET_USERS) sheet.appendRow(['Username', 'PasswordHash', 'Role', 'Created']);
        if (name === SHEET_ATTENDANCE) sheet.appendRow(['Timestamp', 'DateStr', 'ID', 'Nama', 'Kota', 'Cabang', 'UniqueKey']);
    }
    return sheet;
}

function hashString(str) {
    const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
    let txtHash = '';
    for (let i = 0; i < raw.length; i++) {
        let hashVal = raw[i];
        if (hashVal < 0) hashVal += 256;
        if (hashVal.toString(16).length == 1) txtHash += '0';
        txtHash += hashVal.toString(16);
    }
    return txtHash;
}

function verifyHash(password, storedHash) {
    // Support migration: If stored password looks plain (not hash length), compare direct
    // SHA256 hex length is 64 chars. If length != 64, assume old plain text.
    if (storedHash.length !== 64) {
        return password === storedHash;
    }
    return hashString(password) === storedHash;
}

function createFirstAdmin() {
    const sheet = getSheet(SHEET_USERS);
    // Check again
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'admin') return;
    }
    sheet.appendRow(['admin', hashString('admbt123'), 'admin', new Date()]);
}

function successResponse(data) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
        .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg }))
        .setMimeType(ContentService.MimeType.JSON);
}

// --- LOCK HELPER ---
function withLock(callback) {
    const lock = LockService.getScriptLock();
    const hasLock = lock.tryLock(10000); // 10s timeout
    if (!hasLock) throw new Error("Server busy (Lock timeout). Please try again.");

    try {
        return callback();
    } finally {
        lock.releaseLock();
    }
}

// --- HISTORY & RESET (Simplified) ---
function logHistory(user, activity, details) {
    const sheet = getSheet(SHEET_HISTORY);
    sheet.appendRow([new Date(), user, activity, JSON.stringify(details)]);
    return "logged";
}

function getGlobalHistory(role) {
    if (role !== 'admin') return [];
    const sheet = getSheet(SHEET_HISTORY);
    const data = sheet.getDataRange().getValues();
    return data.slice(1).reverse().slice(0, 100).map(r => ({
        timestamp: r[0], user: r[1], activity: r[2], details: r[3]
    }));
}

function handleRequestReset(u) { return { message: "Feature disabled in Hybrid Mode" }; }
function handleResetWithOTP(u, o, n) { return { message: "Feature disabled in Hybrid Mode" }; }

// --- USER MANAGEMENT IMPL ---
function handleGetUsers(requestorRole) {
    if (requestorRole !== 'admin') throw new Error("Unauthorized");
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getValues();
    // Headers: Username, PasswordHash, Role, Created
    // Skip header
    const users = [];
    for (let i = 1; i < data.length; i++) {
        users.push({
            username: data[i][0],
            role: data[i][2],
            created: data[i][3]
        });
    }
    return users;
}

function handleDeleteUser(adminUsername, adminRole, targetUser) {
    if (adminRole !== 'admin') throw new Error("Unauthorized");
    if (adminUsername === targetUser) throw new Error("Cannot delete yourself!");

    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === targetUser) {
            rowIndex = i + 1; // 1-based index
            break;
        }
    }

    if (rowIndex === -1) throw new Error("User not found");

    sheet.deleteRow(rowIndex);
    return { message: "User deleted" };
}

// --- GUEST BOOK LOGIC ---

function handleCheckIn(customer) {
    const sheet = getSheet(SHEET_ATTENDANCE);
    // Format Date: YYYY-MM-DD for composite key
    const now = new Date();
    const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

    // Composite Key Identity: Name + City + Cabang
    const name = (customer.nama || "").trim().toUpperCase();
    const city = (customer.kota || "").trim().toUpperCase();
    const cabang = (customer.cabang || "").trim().toUpperCase();
    const uniqueKey = todayStr + "_" + name + "_" + city + "_" + cabang;

    // Check for Duplicates (Today)
    const data = sheet.getDataRange().getValues();
    // Header: [Timestamp, DateString, CustomerID, Name, City, UniqueKey]

    for (let i = 1; i < data.length; i++) {
        // Build key from existing data to be safe, or check Col G (Index 6)
        // Let's assume Col G is UniqueKey
        if (data[i][6] === uniqueKey) {
            throw new Error("Tamu sudah check-in hari ini!");
        }
    }

    // Append Attendance
    sheet.appendRow([
        new Date(),       // Timestamp
        todayStr,         // Date String (for easy filtering)
        customer.id || '',// ID (Optional)
        name,             // Name
        city,             // City
        cabang,           // Cabang (New)
        uniqueKey         // Integrity Key
    ]);

    return { message: "Check-in Berhasil", name: name };
}

function handleAddAndCheckIn(customer) {
    // 1. Add to Master Database (Reuse logic)
    // We wrap it in try-catch to handle potential duplicates in Master, 
    // but for walk-in, we usually want to proceed.
    try {
        addCustomerData(customer); // This creates ID if missing? 
        // addCustomerData generates ID in Frontend usually? 
        // Wait, GAS addCustomerData just saves what is given.
    } catch (e) {
        // If error is "Duplicate", we ignore and proceed to check-in?
        // Better to let it fail if Master fails.
        // But if duplicate name exists, maybe we just want to check-in that person.
        // For now, let it throw.
    }

    // 2. Check In
    return handleCheckIn(customer);
}

function getAttendanceList() {
    const sheet = getSheet(SHEET_ATTENDANCE);
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

    const attendees = [];
    // Skip Header
    // Filter by Today
    for (let i = 1; i < data.length; i++) {
        let rowDateVal = data[i][1];
        let rowDateStr = "";

        if (rowDateVal instanceof Date) {
            rowDateStr = Utilities.formatDate(rowDateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
            rowDateStr = String(rowDateVal);
        }

        if (rowDateStr === todayStr) {
            attendees.push({
                timestamp: data[i][0],
                id: data[i][2],
                nama: data[i][3],
                kota: data[i][4],
                cabang: data[i][5] // Add Cabang
            });
        }
    }
    // Return newest first
    return attendees.reverse();
}

/**
 * UPDATED: editCustomerData
 * Alignment with Bintang Mas Backend v2.1
 */
function editCustomerData(customer) {
    return withLock(() => {
        const sheet = getSheet(SHEET_CUSTOMERS);
        const data = sheet.getDataRange().getValues();

        // Find customer by ID (Column B - Index 1)
        const idToFind = String(customer.id);
        let rowIndex = -1;

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][1]) === idToFind) {
                rowIndex = i + 1; // Convert to 1-based row index
                break;
            }
        }

        if (rowIndex === -1) {
            throw new Error("Customer dengan ID " + idToFind + " tidak ditemukan!");
        }

        // Map data to Columns (Alignment with getCustomerData mapping)
        // Row mapping: B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9
        // getRange(row, col, numRows, numCols)
        // We update from Column C (Index 3) to Column I (Index 9) -> 7 columns
        const range = sheet.getRange(rowIndex, 3, 1, 7);
        range.setValues([[
            customer.nama || "",   // Col C
            customer.kota || "",   // Col D
            customer.sales || "",  // Col E
            customer.pabrik || "", // Col F
            customer.cabang || "", // Col G
            customer.telp || "",   // Col H
            customer.kode || customer.id || "" // Col I (Auto-sync QR Code)
        ]]);

        return { message: "Update Berhasil", id: idToFind };
    });
}
