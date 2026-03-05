import { describe, it, expect } from 'vitest';
import { parseQRData, generateQRJSON, isValidQRData, formatLabelData } from './qrParser';

describe('qrParser Utility', () => {

    // Mock Data
    const mockCustomer = {
        id: 'CUST-001',
        nama: 'Toko Maju Jaya',
        kota: 'Semarang',
        sales: 'Budi',
        pabrik: 'Pabrik A',
        cabang: 'BT SMG', // Required field
        telp: '08123456789'
    };

    const mockQRJSON = '{"it":"CUST-001","nt":"Toko Maju Jaya","at":"Semarang","pt":"Budi","kp":"Pabrik A","ws":"BT SMG","np":"08123456789"}';

    // 1. Test generateQRJSON
    it('should generate correct minified JSON string from customer object', () => {
        const result = generateQRJSON(mockCustomer);
        // We parse it back to avoid key order issues in string comparison
        const parsed = JSON.parse(result);

        expect(parsed).toEqual({
            it: 'CUST-001',
            nt: 'Toko Maju Jaya',
            at: 'Semarang',
            pt: 'Budi',
            kp: 'Pabrik A',
            ws: 'BT SMG',
            np: '08123456789'
        });
    });

    // 2. Test parseQRData (Customer -> Minified Object)
    it('should map customer fields to minified keys correctly', () => {
        const result = parseQRData(mockCustomer);
        expect(result.it).toBe('CUST-001');
        expect(result.nt).toBe('Toko Maju Jaya');
        // Check missing fields fallback
        const emptyResult = parseQRData({});
        expect(emptyResult.it).toBe('');
        expect(emptyResult.nt).toBe('');
    });

    // 3. Test isValidQRData
    it('should validate valid QR JSON string', () => {
        const valid = isValidQRData(mockQRJSON);
        expect(valid).not.toBeNull();
        expect(valid.nt).toBe('Toko Maju Jaya');
    });

    it('should return null for invalid JSON string', () => {
        expect(isValidQRData('invalid-json')).toBeNull();
    });

    it('should return null if required fields are missing', () => {
        // Missing 'nt' (Name) and 'ws' (Cabang)
        const incomplete = JSON.stringify({ it: '123', at: 'SBY' });
        expect(isValidQRData(incomplete)).toBeNull();
    });

    // 4. Test formatLabelData (Minified -> Customer Object)
    it('should convert minified object back to customer format', () => {
        const minified = JSON.parse(mockQRJSON);
        const result = formatLabelData(minified);

        expect(result).toEqual({
            id: 'CUST-001',
            nama: 'Toko Maju Jaya',
            kota: 'Semarang',
            sales: 'Budi',
            pabrik: 'Pabrik A',
            cabang: 'BT SMG',
            telp: '08123456789'
        });
    });

    it('should handle string input for formatLabelData', () => {
        const result = formatLabelData(mockQRJSON);
        expect(result.nama).toBe('Toko Maju Jaya');
    });
});
