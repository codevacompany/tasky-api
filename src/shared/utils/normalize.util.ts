/**
 * Normalizes email by converting to lowercase and trimming
 * @param email Email address
 * @returns Normalized email or null
 * 
 * @example
 * normalizeEmail('  User@Example.COM  ') => 'user@example.com'
 */
export function normalizeEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    return email.toLowerCase().trim();
}

/**
 * Normalizes CNPJ by removing formatting
 * @param cnpj CNPJ with or without formatting
 * @returns CNPJ with only digits
 * 
 * @example
 * normalizeCnpj('12.345.678/0001-90') => '12345678000190'
 * normalizeCnpj('12345678000190') => '12345678000190'
 */
export function normalizeCnpj(cnpj: string | null | undefined): string | null {
    if (!cnpj) return null;
    return cnpj.replace(/[^\d]/g, '');
}

