import { z } from 'zod';

/**
 * Customer validation schema
 */
export const customerSchema = z.object({
    nama: z.string()
        .min(1, 'Nama wajib diisi')
        .max(100, 'Nama terlalu panjang (max 100 karakter)')
        .trim(),

    kota: z.string()
        .min(1, 'Kota wajib diisi')
        .max(50, 'Kota terlalu panjang (max 50 karakter)')
        .trim(),

    cabang: z.string()
        .min(1, 'Cabang wajib diisi')
        .max(50, 'Cabang terlalu panjang (max 50 karakter)')
        .trim(),

    sales: z.string()
        .max(50, 'Sales terlalu panjang (max 50 karakter)')
        .trim()
        .optional()
        .default(''),

    pabrik: z.string()
        .max(50, 'Pabrik terlalu panjang (max 50 karakter)')
        .trim()
        .optional()
        .default(''),

    telp: z.string()
        .max(20, 'Nomor telepon terlalu panjang')
        .trim()
        .optional()
        .default(''),

    // Optional fields for editing
    id: z.string().optional(),
    kode: z.string().optional(),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
    username: z.string()
        .min(1, 'Username wajib diisi')
        .max(50, 'Username terlalu panjang')
        .trim(),

    password: z.string()
        .min(1, 'Password wajib diisi')
        .min(4, 'Password minimal 4 karakter')
        .max(100, 'Password terlalu panjang'),
});

/**
 * User registration schema
 */
export const registerSchema = z.object({
    username: z.string()
        .min(3, 'Username minimal 3 karakter')
        .max(50, 'Username terlalu panjang')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore')
        .trim(),

    password: z.string()
        .min(6, 'Password minimal 6 karakter')
        .max(100, 'Password terlalu panjang'),

    role: z.enum(['admin', 'user'], {
        errorMap: () => ({ message: 'Role harus admin atau user' })
    }),
});

/**
 * Validate customer data
 * @param {Object} data - Customer data to validate
 * @returns {Object} Validated and sanitized data
 * @throws {ZodError} If validation fails
 */
export function validateCustomer(data) {
    return customerSchema.parse(data);
}

/**
 * Validate login credentials
 * @param {Object} data - Login credentials
 * @returns {Object} Validated data
 * @throws {ZodError} If validation fails
 */
export function validateLogin(data) {
    return loginSchema.parse(data);
}

/**
 * Validate user registration data
 * @param {Object} data - Registration data
 * @returns {Object} Validated data
 * @throws {ZodError} If validation fails
 */
export function validateRegister(data) {
    return registerSchema.parse(data);
}

/**
 * Safe validation that returns result object instead of throwing
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {Object} { success: boolean, data?: any, errors?: array }
 */
export function safeValidate(schema, data) {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return {
        success: false,
        errors: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }))
    };
}
