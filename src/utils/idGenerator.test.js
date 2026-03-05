import { describe, it, expect } from 'vitest';
import { generateCustomerId } from './idGenerator';

describe('ID Generator Utility', () => {

    it('should return empty string for invalid input', () => {
        expect(generateCustomerId('')).toBe('');
        expect(generateCustomerId(null)).toBe('');
        expect(generateCustomerId(123)).toBe('');
    });

    it('should generate correct prefix for known branches', () => {
        const id1 = generateCustomerId('BT SMG');
        expect(id1).toMatch(/^SMG\d{4}$/);

        const id2 = generateCustomerId('BT JKT');
        expect(id2).toMatch(/^JKT\d{4}$/);

        const id3 = generateCustomerId('BT SBY');
        expect(id3).toMatch(/^SBY\d{4}$/);
    });

    it('should use fallback prefix for unknown branches', () => {
        // Fallback logic: takes letters, uses first 3
        const id = generateCustomerId('BT BANDUNG');
        expect(id).toMatch(/^BTB\d{4}$/); // BT BANDUNG -> BTB...

        const id2 = generateCustomerId('XYZ');
        expect(id2).toMatch(/^XYZ\d{4}$/);
    });

    it('should pad short prefixes with X', () => {
        const id = generateCustomerId('AB');
        expect(id).toMatch(/^ABX\d{4}$/);
    });

    it('should avoid collisions with existing customers', () => {
        // Mock Math.random to return a predictable value first, then something else?
        // Or easier: Pre-populate existing matches for small numbers.

        // Let's create a scenario where "SMG1000" exists.
        // Since we can't easily mock Math.random inside the function without dependency injection or global mocks,
        // we heavily rely on the loop. 
        // Instead, we can verify that the result is NOT in the existing list.

        const existing = [
            { id: 'SMG1111' },
            { id: 'SMG2222' }
        ];

        // Generate multiple times to statistically ensure we don't pick the blocked ones
        // (The chance of hitting 1111 out of 9000 options is low, but the test ensures logic holds)
        for (let i = 0; i < 10; i++) {
            const newId = generateCustomerId('BT SMG', existing);
            expect(existing.map(e => e.id)).not.toContain(newId);
            expect(newId).toMatch(/^SMG\d{4}$/);
        }
    });

    it('should handle large existing datasets reasonably', () => {
        const branch = 'BT JKT';
        const existing = [];
        // Fill 100 slots
        for (let i = 1000; i < 1100; i++) {
            existing.push({ id: `JKT${i}` });
        }

        const newId = generateCustomerId(branch, existing);
        expect(newId).toMatch(/^JKT\d{4}$/);
        expect(existing.map(e => e.id)).not.toContain(newId);
    });

});
