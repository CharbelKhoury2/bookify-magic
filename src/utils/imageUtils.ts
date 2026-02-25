/**
 * Utility functions for handling image URLs, especially from Google Drive
 */

/**
 * Extracts a Google Drive file ID from a variety of URL formats
 */
export function getGoogleDriveFileId(url: string | null | undefined): string | null {
    if (!url) return null;

    // Standard /d/ID/ format
    const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch) return dMatch[1];

    // query param ?id=ID format
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];

    // lh3 thumbnail format (lh3.googleusercontent.com/d/ID)
    const lhMatch = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lhMatch) return lhMatch[1];

    return null;
}

/**
 * Returns a high-quality thumbnail URL for a Google Drive file
 * that bypasses most permission issues for previewing.
 */
export function getThumbnailUrl(url: string | null | undefined, size: number = 1000): string | null {
    if (!url) return null;

    const driveId = getGoogleDriveFileId(url);
    if (!driveId) return url; // Not a drive URL, return as is

    // Return the most reliable thumbnail endpoint
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;
}

/**
 * Converts a Google Drive /view link to a /preview link which is suitable for iframes
 */
export function getEmbedUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    if (url.includes('drive.google.com') && url.includes('/view')) {
        return url.replace('/view', '/preview');
    }

    return url;
}
