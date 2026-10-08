import { BREAKDOWN_LABELS, normalizeCell, withShare } from './reportExportTypes';
import type { ExportCell, ReportExportInput } from './reportExportTypes';

const escapeCell = (input: ExportCell): string => {
    const value = normalizeCell(input);
    if (value == null) return '';
    let text = String(value);
    // Prevent CSV/formula injection when opened in Excel or Sheets.
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) || text !== text.trim()
        ? `"${text.replace(/"/g, '""')}"`
        : text;
};

const toLine = (cells: ExportCell[]) => cells.map(escapeCell).join(',');

export const buildReportCsv = (input: ReportExportInput): string => {
    const lines: string[] = [
        toLine(['Report', input.reportName.trim() || 'Custom report']),
        toLine(['Timeframe', input.timeframeLabel]),
        toLine(['Generated at', input.generatedAt.toISOString()]),
    ];

    if (input.summaryRows.length) {
        lines.push('', toLine(['Summary']), toLine(['Metric', 'Value']));
        input.summaryRows.forEach((row) => lines.push(toLine([row.label, row.value])));
    }

    if (input.breakdownKind !== 'none' && input.breakdownRows.length) {
        const isTeam = input.breakdownKind === 'team';
        const title = BREAKDOWN_LABELS[input.breakdownKind];
        lines.push('', toLine([`Breakdown by ${title.toLowerCase()}`]));
        lines.push(
            toLine([
                title,
                'Tickets',
                'Share of tickets (%)',
                ...(isTeam ? ['Open tickets', 'SLA met (%)'] : []),
            ])
        );
        withShare(input.breakdownRows).forEach((row) =>
            lines.push(
                toLine([
                    row.label,
                    row.count,
                    row.sharePct,
                    ...(isTeam ? [row.openTickets, row.slaMetPct] : []),
                ])
            )
        );
    }

    // UTF-8 BOM so Excel reads accents/symbols correctly; CRLF per RFC 4180.
    return `\uFEFF${lines.join('\r\n')}\r\n`;
};
