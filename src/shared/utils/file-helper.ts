export function extractFileName(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
}

export function extractMimeTypeFromUrl(url: string): string {
    const extension = extractFileName(url).split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'pdf':
            return 'application/pdf';
        case 'doc':
        case 'docx':
            return 'application/msword';
        case 'xls':
        case 'xlsx':
            return 'application/vnd.ms-excel';
        case 'txt':
            return 'text/plain';
        default:
            return 'application/octet-stream'; // fallback
    }
}
