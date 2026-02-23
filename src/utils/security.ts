/**
 * Security utility to prevent open redirects and validate URLs
 */

const ALLOWED_DOMAIN_SUFFIXES = [
    'supabase.co',
    'vercel.app',
    'lovable.dev',
    'google.com',
    'googleusercontent.com',
    'n8n.cloud',
];

/**
 * Validates if a URL is safe to redirect/open.
 * Primarily checks if it's a relative path or an allowed domain.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
    if (!url) return false;

    // Allow relative URLs
    if (url.startsWith('/') && !url.startsWith('//')) {
        return true;
    }

    // Allow blob URLs (used for PDF previews)
    if (url.startsWith('blob:')) {
        return true;
    }

    try {
        const parsedUrl = new URL(url);

        // Check if the domain is in our allowed list
        return ALLOWED_DOMAIN_SUFFIXES.some(suffix =>
            parsedUrl.hostname === suffix || parsedUrl.hostname.endsWith('.' + suffix)
        );
    } catch (e) {
        return false;
    }
}

/**
 * Safely opens a URL in a new window or redirects.
 */
export function safeOpen(url: string | null | undefined, target: string = '_blank') {
    if (isSafeUrl(url)) {
        window.open(url!, target);
    } else {
        console.warn('Blocked opening potentially unsafe URL:', url);
    }
}
