import { BREAKDOWN_LABELS, normalizeCell, withShare } from './reportExportTypes';
import type { ExportCell, ReportExportInput } from './reportExportTypes';

const esc = (value: ExportCell) =>
    String(normalizeCell(value) ?? '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const STYLES = `
:root{color-scheme:light;--ink:#162d3d;--muted:#5a6b78;--line:#dfe5eb;--accent:#3899ec;--bg:#f4f7fa}
*{box-sizing:border-box}
body{margin:0;padding:40px 24px;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.page{max-width:880px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:12px;padding:40px}
h1{margin:0 0 4px;font-size:26px}
h2{margin:32px 0 12px;font-size:16px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.meta{color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.card{border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.card .label{color:var(--muted);font-size:12px}
.card .value{font-size:24px;font-weight:600;margin-top:2px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}
th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.bar{height:6px;border-radius:3px;background:var(--line);min-width:80px}
.bar>span{display:block;height:100%;border-radius:3px;background:var(--accent)}
footer{margin-top:32px;color:var(--muted);font-size:12px}
@media print{body{background:#fff;padding:0}.page{border:0;padding:0;max-width:none}.card,tr{break-inside:avoid}}
`;

export const buildReportHtml = (input: ReportExportInput): string => {
    const title = input.reportName.trim() || 'Custom report';
    const isTeam = input.breakdownKind === 'team';
    const breakdownTitle = BREAKDOWN_LABELS[input.breakdownKind];

    const summary = input.summaryRows.length
        ? `<h2>Summary</h2><div class="grid">${input.summaryRows
              .map(
                  (row) =>
                      `<div class="card"><div class="label">${esc(row.label)}</div><div class="value">${esc(row.value)}</div></div>`
              )
              .join('')}</div>`
        : '';

    const breakdown =
        input.breakdownKind !== 'none' && input.breakdownRows.length
            ? `<h2>Breakdown by ${esc(breakdownTitle.toLowerCase())}</h2>
<table>
<thead><tr><th>${esc(breakdownTitle)}</th><th class="num">Tickets</th><th class="num">Share</th><th></th>${
                  isTeam ? '<th class="num">Open</th><th class="num">SLA met</th>' : ''
              }</tr></thead>
<tbody>${withShare(input.breakdownRows)
                  .map(
                      (row) => `<tr>
<td>${esc(row.label)}</td>
<td class="num">${esc(row.count)}</td>
<td class="num">${row.sharePct == null ? '—' : `${row.sharePct}%`}</td>
<td><div class="bar"><span style="width:${row.sharePct ?? 0}%"></span></div></td>${
                          isTeam
                              ? `<td class="num">${esc(row.openTickets)}</td><td class="num">${
                                    normalizeCell(row.slaMetPct) == null ? '—' : `${esc(row.slaMetPct)}%`
                                }</td>`
                              : ''
                      }
</tr>`
                  )
                  .join('')}</tbody></table>`
            : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="page">
<h1>${esc(title)}</h1>
<div class="meta">${esc(input.timeframeLabel)} · Generated ${esc(
        input.generatedAt.toLocaleString()
    )}</div>
${summary}
${breakdown}
<footer>Tickets are counted by creation date within the selected timeframe.</footer>
</div>
</body>
</html>`;
};
