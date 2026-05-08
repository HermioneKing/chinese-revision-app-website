'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiGet } from '@/lib/api';
import { usePalette } from '@/context/PaletteContext';
import styles from '../students.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// ── Types ────────────────────────────────────────────────────────────────────

interface StudentDetail {
  student: {
    student_id: number;
    username: string;
    nickname: string | null;
    register_date: string;
    plan: string | null;
  };
  history: Array<{
    practice_record_id: number;
    tested_date: string;
    wrong_count: number;
    duration: number | null;
    passage_title: string;
    question_type: string;
  }>;
  passages_attempted: number;
  total_passages: number;
}

interface PerfPoint {
  period: string;
  avg_wrong: number | null;
  sessions: number;
}

type Range   = '10' | '30' | '90' | 'all';
type GroupBy = 'daily' | 'weekly' | 'monthly';

// ── Helpers ──────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<string, string> = {
  word_explanation:   'Word explanation',
  word_rearrange:     'Word rearrange',
  mc:                 'Multiple choice',
  keyword:            'Keyword',
  translation:        'Translation',
  long_question:      'Long question',
  sentence_rearrange: 'Sentence rearrange',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(secs: number | null): string {
  if (secs === null) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPeriodLabel(dateStr: string, groupBy: GroupBy): string {
  const d = new Date(dateStr);
  if (groupBy === 'monthly') return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  if (groupBy === 'weekly')  return `w/c ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ── Performance chart sub-component ──────────────────────────────────────────

function PerformanceChart({ studentId }: { studentId: number }) {
  const { palette } = usePalette();
  const [range,   setRange]   = useState<Range>('30');
  const [groupBy, setGroupBy] = useState<GroupBy>('daily');
  const [perf,    setPerf]    = useState<PerfPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPerf = useCallback(async (r: Range, g: GroupBy) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: r, group_by: g });
      const res = await apiGet(`/students/${studentId}/performance?${params}`);
      if (res.ok) setPerf(await res.json());
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchPerf(range, groupBy); }, [range, groupBy, fetchPerf]);

  const labels = perf.map(p => formatPeriodLabel(p.period, groupBy));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Avg wrong',
        data: perf.map(p => p.avg_wrong),
        borderColor: palette.p4,
        backgroundColor: palette.p4 + '33',
        tension: 0.3,
        pointRadius: perf.length > 60 ? 0 : 3,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Sessions',
        data: perf.map(p => p.sessions),
        borderColor: palette.p1,
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: perf.length > 60 ? 0 : 3,
        yAxisID: 'y2',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const } },
    scales: {
      y:  { beginAtZero: true, title: { display: true, text: 'Avg wrong' } },
      y2: { beginAtZero: true, position: 'right' as const,
            grid: { drawOnChartArea: false }, title: { display: true, text: 'Sessions' } },
    },
  };

  const BtnGroup = <T extends string>({
    options, value, onChange,
  }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
  }) => (
    <div className={styles.chartFilterGroup}>
      {options.map(o => (
        <button
          key={o.value}
          className={`${styles.chartFilterBtn} ${value === o.value ? styles.chartFilterBtnActive : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.chartPanelHeader}>
        <h2 className={styles.panelTitle}>Performance</h2>
        <div className={styles.chartFilters}>
          <BtnGroup<Range>
            options={[
              { value: '10',  label: '10d' },
              { value: '30',  label: '30d' },
              { value: '90',  label: '90d' },
              { value: 'all', label: 'All' },
            ]}
            value={range}
            onChange={v => setRange(v)}
          />
          <BtnGroup<GroupBy>
            options={[
              { value: 'daily',   label: 'Daily'   },
              { value: 'weekly',  label: 'Weekly'  },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={groupBy}
            onChange={v => setGroupBy(v)}
          />
        </div>
      </div>
      {loading && <p className={styles.loading}>Loading…</p>}
      {!loading && perf.length === 0 && <p className={styles.loading}>No data for this period.</p>}
      {!loading && perf.length > 0 && <Line data={chartData} options={chartOptions} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data,    setData]    = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    apiGet(`/students/${id}`)
      .then(r => { if (!r.ok) throw new Error('Student not found'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;
  if (!data)   return null;

  const { student, history, passages_attempted, total_passages } = data;
  const displayName = student.nickname
    ? `${student.nickname} (${student.username})`
    : student.username;
  const avatarChar = (student.nickname ?? student.username)[0].toUpperCase();
  const avgWrong = history.length > 0
    ? (history.reduce((s, r) => s + r.wrong_count, 0) / history.length).toFixed(1)
    : '—';

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push('/dashboard/students')}>
        ← Back to students
      </button>

      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.avatar}>{avatarChar}</div>
        <div className={styles.detailInfo}>
          <span className={styles.detailName}>{displayName}</span>
          <div className={styles.detailMeta}>
            <span>Plan: <strong>{student.plan ?? 'none'}</strong></span>
            <span>Registered: <strong>{formatDate(student.register_date)}</strong></span>
            <span>ID: #{student.student_id}</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p1)' } as React.CSSProperties}>
          <div className={styles.statLabel}>Sessions (last 50)</div>
          <div className={styles.statValue}>{history.length}</div>
        </div>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p4)' } as React.CSSProperties}>
          <div className={styles.statLabel}>Avg wrong</div>
          <div className={styles.statValue}>{avgWrong}</div>
        </div>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p2)' } as React.CSSProperties}>
          <div className={styles.statLabel}>Passages tried</div>
          <div className={styles.statValue}>
            {passages_attempted}
            <span style={{ fontSize: 14, color: '#aaa', fontWeight: 400 }}> / {total_passages}</span>
          </div>
        </div>
      </div>

      {/* Interactive performance chart */}
      <PerformanceChart studentId={student.student_id} />

      {/* Practice history */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Practice history (last 50)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Date</th><th>Passage</th><th>Type</th><th>Wrong</th><th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {history.map(r => (
                <tr key={r.practice_record_id}>
                  <td>{formatDateTime(r.tested_date)}</td>
                  <td>{r.passage_title}</td>
                  <td>{QUESTION_TYPE_LABELS[r.question_type] ?? r.question_type}</td>
                  <td className={r.wrong_count === 0 ? styles.wrongGood : styles.wrongBad}>
                    {r.wrong_count === 0 ? '✓ 0' : r.wrong_count}
                  </td>
                  <td>{formatDuration(r.duration)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={5} className={styles.loading}>No practice records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
