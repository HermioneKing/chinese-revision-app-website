'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { usePalette } from '@/context/PaletteContext';
import styles from './reports.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentEntry {
  rank: number;
  student_id: number;
  username: string;
  nickname: string | null;
  plan: string | null;
  sessions: number;
  avg_wrong: number | null;
  pct_perfect: number | null;
  last_active: string | null;
}

interface PassageEntry {
  rank: number;
  passage_id: number;
  title: string;
  author: string | null;
  attempts: number;
  students: number;
  avg_wrong: number | null;
  pct_perfect: number | null;
}

interface ReportMeta {
  teacher_username: string;
  school_name: string | null;
  generated_at: string;
  range: string;
  plan: string;
}

interface ReportData {
  meta: ReportMeta;
  top_students: StudentEntry[];
  bottom_students: StudentEntry[];
  top_passages_attempts: PassageEntry[];
  top_passages_mistakes: PassageEntry[];
}

type Range = '7' | '30' | '90' | 'all';
type Plan  = 'all' | 'free' | 'premium';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<Range, string> = {
  '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', all: 'All time',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Print HTML generator ──────────────────────────────────────────────────────

function generatePrintHTML(data: ReportData, range: Range, plan: Plan, accent: string): string {
  const { meta, top_students, bottom_students, top_passages_attempts, top_passages_mistakes } = data;

  const css = `
    @page {
      size: A4;
      margin: 18mm 15mm 22mm 15mm;
      @bottom-left  { content: "DSE Chinese Revision — Teacher Report";
                      font-size: 8pt; color: #aaa; font-family: Arial, sans-serif; }
      @bottom-right { content: "Page " counter(page) " of " counter(pages);
                      font-size: 8pt; color: #aaa; font-family: Arial, sans-serif; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; }

    .cover { padding-bottom: 12mm; border-bottom: 2px solid ${accent}; margin-bottom: 8mm; }
    .cover h1 { font-size: 22pt; color: ${accent}; margin-bottom: 3mm; }
    .cover .sub { font-size: 11pt; color: #555; margin-bottom: 5mm; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-top: 5mm; }
    .meta-item { font-size: 9pt; }
    .meta-item .lbl { color: #888; font-size: 8pt; text-transform: uppercase;
                      letter-spacing: 0.05em; display: block; margin-bottom: 1mm; }

    .section { page-break-before: always; }
    .section-header { display: flex; align-items: center; gap: 4mm;
                      margin-bottom: 5mm; padding-bottom: 2mm;
                      border-bottom: 1.5px solid ${accent}; }
    .section-header h2 { font-size: 14pt; color: ${accent}; }
    .section-header .badge { background: ${accent}; color: #fff; font-size: 8pt;
                              padding: 1mm 3mm; border-radius: 3mm; margin-left: auto; }
    .note { font-size: 8pt; color: #aaa; margin-bottom: 3mm; }

    table { width: 100%; border-collapse: collapse; }
    thead tr { background: ${accent}; }
    th { color: #fff; text-align: left; padding: 3mm; font-size: 8.5pt;
         font-weight: 600; white-space: nowrap; }
    td { padding: 2.5mm 3mm; border-bottom: 0.5px solid #eee;
         font-size: 9pt; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #f8fffe; }
    .rank { color: #aaa; font-size: 8pt; text-align: center; }
    .good { color: #2e7d32; font-weight: 600; }
    .bad  { color: #c62828; font-weight: 600; }
    .plan-badge { display: inline-block; padding: 0.5mm 2mm; border-radius: 2mm;
                  font-size: 7.5pt; font-weight: 600; text-transform: capitalize; }
    .plan-free    { background: #f0f0f0; color: #555; }
    .plan-premium { background: #fff3cd; color: #856404; }
  `;

  const planBadge = (p: string | null) =>
    `<span class="plan-badge plan-${p ?? 'free'}">${p ?? 'none'}</span>`;

  const studentTable = (rows: StudentEntry[]) => `
    <table>
      <thead><tr>
        <th style="width:20px">#</th>
        <th>Username</th><th>Nickname</th><th>Plan</th>
        <th>Sessions</th><th>Avg Wrong</th><th>% Perfect</th><th>Last Active</th>
      </tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td class="rank">${r.rank}</td>
          <td><strong>${r.username}</strong></td>
          <td>${r.nickname ?? '—'}</td>
          <td>${planBadge(r.plan)}</td>
          <td>${r.sessions.toLocaleString()}</td>
          <td class="${(r.avg_wrong ?? 99) <= 0.5 ? 'good' : 'bad'}">${r.avg_wrong ?? '—'}</td>
          <td class="${(r.pct_perfect ?? 0) >= 60 ? 'good' : ''}">${r.pct_perfect != null ? r.pct_perfect + '%' : '—'}</td>
          <td>${fmtDate(r.last_active)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  const passageTable = (rows: PassageEntry[]) => `
    <table>
      <thead><tr>
        <th style="width:20px">#</th>
        <th>Title</th><th>Author</th>
        <th>Attempts</th><th>Students</th><th>Avg Wrong</th><th>% Perfect</th>
      </tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td class="rank">${r.rank}</td>
          <td><strong>${r.title}</strong></td>
          <td>${r.author ?? '—'}</td>
          <td>${r.attempts.toLocaleString()}</td>
          <td>${r.students.toLocaleString()}</td>
          <td class="${(r.avg_wrong ?? 99) <= 0.5 ? 'good' : 'bad'}">${r.avg_wrong ?? '—'}</td>
          <td class="${(r.pct_perfect ?? 0) >= 60 ? 'good' : ''}">${r.pct_perfect != null ? r.pct_perfect + '%' : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Teacher Report — DSE Chinese Revision</title>
  <style>${css}</style>
</head>
<body>

  <div class="cover">
    <h1>Teacher Report</h1>
    <p class="sub">DSE Chinese Revision</p>
    <div class="meta-grid">
      <div class="meta-item"><span class="lbl">Teacher</span>${meta.teacher_username}</div>
      <div class="meta-item"><span class="lbl">School</span>${meta.school_name ?? 'N/A'}</div>
      <div class="meta-item"><span class="lbl">Date generated</span>${fmtDateTime(meta.generated_at)}</div>
      <div class="meta-item"><span class="lbl">Date range</span>${RANGE_LABELS[range]}</div>
      <div class="meta-item"><span class="lbl">Plan filter</span>${plan === 'all' ? 'All plans' : plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <h2>Top 10 Performing Students</h2>
      <span class="badge">Lowest avg wrong</span>
    </div>
    <p class="note">Ranked by average wrong count (ascending). Minimum 10 sessions required.</p>
    ${studentTable(top_students)}
  </div>

  <div class="section">
    <div class="section-header">
      <h2>Bottom 10 Struggling Students</h2>
      <span class="badge">Highest avg wrong</span>
    </div>
    <p class="note">Ranked by average wrong count (descending). Minimum 10 sessions required.</p>
    ${studentTable(bottom_students)}
  </div>

  <div class="section">
    <div class="section-header">
      <h2>Top 10 Most Attempted Passages</h2>
      <span class="badge">By total attempts</span>
    </div>
    ${passageTable(top_passages_attempts)}
  </div>

  <div class="section">
    <div class="section-header">
      <h2>Top 10 Passages with Most Mistakes</h2>
      <span class="badge">Highest avg wrong</span>
    </div>
    ${passageTable(top_passages_mistakes)}
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { palette } = usePalette();
  const [range, setRange] = useState<Range>('30');
  const [plan,  setPlan]  = useState<Plan>('all');
  const [data,  setData]  = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchReport = useCallback(async (r: Range, p: Plan) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: r, plan: p });
      const res = await apiGet(`/reports/summary?${params}`);
      if (!res.ok) throw new Error('Failed to load report');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(range, plan); }, [range, plan, fetchReport]);

  const handlePrint = () => {
    if (!data) return;
    const html = generatePrintHTML(data, range, plan, palette.p1);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const PlanBadge = ({ plan: p }: { plan: string | null }) => (
    <span className={`${styles.planBadge} ${p === 'premium' ? styles.planPremium : styles.planFree}`}>
      {p ?? 'none'}
    </span>
  );

  const StudentTable = ({ rows }: { rows: StudentEntry[] }) => (
    <table className={styles.table}>
      <thead><tr>
        <th>#</th><th>Username</th><th>Nickname</th><th>Plan</th>
        <th>Sessions</th><th>Avg Wrong</th><th>% Perfect</th>
      </tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.student_id}>
            <td className={styles.rankCell}>{r.rank}</td>
            <td className={styles.nameCell}>{r.username}</td>
            <td>{r.nickname ?? '—'}</td>
            <td><PlanBadge plan={r.plan} /></td>
            <td>{r.sessions.toLocaleString()}</td>
            <td className={(r.avg_wrong ?? 99) <= 0.5 ? styles.goodNum : styles.badNum}>
              {r.avg_wrong ?? '—'}
            </td>
            <td className={(r.pct_perfect ?? 0) >= 60 ? styles.goodNum : ''}>
              {r.pct_perfect != null ? `${r.pct_perfect}%` : '—'}
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={7} className={styles.loading}>No data — try a wider date range.</td></tr>
        )}
      </tbody>
    </table>
  );

  const PassageTable = ({ rows }: { rows: PassageEntry[] }) => (
    <table className={styles.table}>
      <thead><tr>
        <th>#</th><th>Title</th><th>Attempts</th>
        <th>Students</th><th>Avg Wrong</th><th>% Perfect</th>
      </tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.passage_id}>
            <td className={styles.rankCell}>{r.rank}</td>
            <td className={styles.nameCell}>{r.title}{r.author ? ` — ${r.author}` : ''}</td>
            <td>{r.attempts.toLocaleString()}</td>
            <td>{r.students.toLocaleString()}</td>
            <td className={(r.avg_wrong ?? 99) <= 0.5 ? styles.goodNum : styles.badNum}>
              {r.avg_wrong ?? '—'}
            </td>
            <td className={(r.pct_perfect ?? 0) >= 60 ? styles.goodNum : ''}>
              {r.pct_perfect != null ? `${r.pct_perfect}%` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Reports</h1>

      <div className={styles.toolbar}>
        <div className={styles.rangeGroup}>
          {(['7','30','90','all'] as Range[]).map(r => (
            <button key={r}
              className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ''}`}
              onClick={() => setRange(r)}
            >
              {r === 'all' ? 'All time' : `Last ${r}d`}
            </button>
          ))}
        </div>

        <div className={styles.planGroup}>
          {(['all','free','premium'] as Plan[]).map(p => (
            <button key={p}
              className={`${styles.planBtn} ${plan === p ? styles.planBtnActive : ''}`}
              onClick={() => setPlan(p)}
            >
              {p === 'all' ? 'All plans' : p}
            </button>
          ))}
        </div>

        <button className={styles.printBtn} onClick={handlePrint} disabled={loading || !data}>
          Print / Save PDF
        </button>
      </div>

      {loading && <p className={styles.loading}>Loading…</p>}
      {error   && <p className={styles.error}>{error}</p>}

      {!loading && !error && data && (
        <>
          <p className={styles.note}>
            Preview · {RANGE_LABELS[range]} · {plan === 'all' ? 'All plans' : plan} · Generated {fmtDateTime(data.meta.generated_at)}
          </p>
          <div className={styles.grid}>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Top 10 Performing Students</h2>
              <StudentTable rows={data.top_students} />
            </div>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Bottom 10 Struggling Students</h2>
              <StudentTable rows={data.bottom_students} />
            </div>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Top 10 Most Attempted Passages</h2>
              <PassageTable rows={data.top_passages_attempts} />
            </div>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Top 10 Passages with Most Mistakes</h2>
              <PassageTable rows={data.top_passages_mistakes} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
