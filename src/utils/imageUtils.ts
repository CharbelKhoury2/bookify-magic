import { isSafeUrl } from './security';

/**
 * Utility functions for handling image and PDF URLs, especially from Google Drive
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
 * Returns a URL that forces a download for a Google Drive file
 */
export function getDownloadUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    const driveId = getGoogleDriveFileId(url);
    if (driveId) {
        return `https://drive.google.com/uc?id=${driveId}&export=download`;
    }

    return url;
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

/**
 * Forces a browser download of a URL or Blob
 */
export function forceDownload(urlOrBlob: string | Blob | null | undefined, fileName: string): void {
    if (!urlOrBlob) return;

    // If it's a URL, transform it to a download-friendly version if it's Google Drive
    let downloadUrl: string;
    if (typeof urlOrBlob === 'string') {
        if (!isSafeUrl(urlOrBlob)) {
            console.warn('Blocked downloading from unsafe URL:', urlOrBlob);
            return;
        }
        downloadUrl = getDownloadUrl(urlOrBlob) || urlOrBlob;
    } else {
        downloadUrl = URL.createObjectURL(urlOrBlob);
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.png')
        ? fileName
        : `${fileName}${typeof urlOrBlob !== 'string' && urlOrBlob.type === 'application/pdf' ? '.pdf' : '.jpg'}`;

    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(link);
        if (typeof urlOrBlob !== 'string') {
            URL.revokeObjectURL(downloadUrl);
        }
    }, 100);
}
