export const downloadFile = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link); // required by some browsers (older Firefox/Safari)
    link.click();
    document.body.removeChild(link);
    // Revoking immediately can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** e.g. "custom-ticket-report_30d_2026-10-08" */
export const buildExportFilename = (reportName: string, periodDays: number, generatedAt: Date) => {
    const slug = reportName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'custom-report';
    const date = generatedAt.toISOString().slice(0, 10);
    return `${slug}_${periodDays}d_${date}`;
};
