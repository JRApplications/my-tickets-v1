export type ExportCell = string | number | null | undefined;

export type BreakdownKind = 'none' | 'team' | 'agent' | 'status' | 'priority';

export interface ReportSummaryRow {
    label: string;
    value: ExportCell;
}

export interface ReportBreakdownRow {
    label: string;
    count: number;
    openTickets: ExportCell;
    slaMetPct: ExportCell;
}

export interface ReportExportInput {
    reportName: string;
    timeframeLabel: string;
    periodDays: number;
    generatedAt: Date;
    summaryRows: ReportSummaryRow[];
    breakdownKind: BreakdownKind;
    breakdownRows: ReportBreakdownRow[];
}

export const BREAKDOWN_LABELS: Record<BreakdownKind, string> = {
    none: '',
    team: 'Team',
    agent: 'Agent',
    status: 'Status',
    priority: 'Priority',
};

/** Treats '', 'No data' and non-finite numbers as "no value". */
export const normalizeCell = (value: ExportCell): string | number | null => {
    if (value == null || value === '' || value === 'No data') return null;
    if (typeof value === 'number' && !Number.isFinite(value)) return null;
    return value;
};

/** Share of the breakdown total, one decimal place. */
export const withShare = (rows: ReportBreakdownRow[]) => {
    const total = rows.reduce((sum, row) => sum + (row.count || 0), 0);
    return rows.map((row) => ({
        ...row,
        sharePct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : null,
    }));
};
