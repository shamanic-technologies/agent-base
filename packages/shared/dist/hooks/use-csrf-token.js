"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCsrfToken = useCsrfToken;
/**
 * Get the CSRF token from the meta tag.
 * @returns The CSRF token.
 */
function useCsrfToken() {
    var _a;
    if (typeof document === 'undefined') {
        return '';
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (!meta) {
        return '';
    }
    return (_a = meta.getAttribute('content')) !== null && _a !== void 0 ? _a : '';
}
