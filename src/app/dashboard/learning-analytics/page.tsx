'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { apiGet } from '@/lib/api';
import { usePalette } from '@/context/PaletteContext';
import { paletteColors, paletteColorsAlpha } from '@/lib/palettes';
import styles from './analytics.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Types ────────────────────────────────────────────────────────────────────

interface PassageStat {
  passage_id: number;
  title: string;
  author: string | null;
  attempts: number;
  students: number;
  avg_wrong: number | null;
  pct_perfect: number | null;
  avg_duration: number | null;
}

interface QuestionTypeStat {
  type: string;
  attempts: number;
  avg_wrong: number | null;
}

interface DowStat  { dow: number; name: string; attempts: number; }
interface HourStat { hour: number; attempts: number; }

interface AnalyticsData {
  passages:       PassageStat[];
  question_types: QuestionTypeStat[];
  day_of_week:    DowStat[];
  hour_of_day:    HourStat[];
}

interface PassageOption { passage_id: number; title: string; author: string | null; }

// ── Constants ─────────────────────────────────────────────────────────────────

type Range = '7' | '30' | '90' | 'all';
const RANGES: { value: Range; label: string }[] = [
  { value: '7',   label: 'Last 7d'  },
  { value: '30',  label: 'Last 30d' },
  { value: '90',  label: 'Last 90d' },
  { value: 'all', label: 'All time' },
];

type PassageSortKey = 'title' | 'attempts' | 'students' | 'avg_wrong' | 'pct_perfect' | 'avg_duration';

const QUESTION_LABELS: Record<string, string> = {
  word_explanation:   'Word explanation',
  word_rearrange:     'Word rearrange',
  mc:                 'Multiple choice',
  keyword:            'Keyword',
  translation:        'Translation',
  long_question:      'Long question',
  sentence_rearrange: 'Sentence rearrange',
};

function fmtDuration(secs: number | null): string {
  if (secs === null) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtHour(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearningAnalyticsPage() {
  const { palette } = usePalette();
  const [range, setRange]           = useState<Range>('30');
  const [passageId, setPassageId]   = useState<string>('all');
  const [passages, setPassages]     = useState<PassageOption[]>([]);
  const [data, setData]             = useState<AnalyticsData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [qtMetric, setQtMetric]     = useState<'avg_wrong' | 'attempts'>('avg_wrong');
  const [sortKey, setSortKey]       = useState<PassageSortKey>('attempts');
  const [sortOrder, setSortOrder]   = useState<'asc' | 'desc'>('desc');

  // Load passage list once
  useEffect(() => {
    apiGet('/analytics/passages')
      .then(r => r.json())
      .then(setPassages)
      .catch(() => {});
  }, []);

  // Load analytics whenever filters change
  const fetchAnalytics = useCallback(async (r: Range, pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: r, passage_id: pid });
      const res = await apiGet(`/analytics?${params}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(range, passageId); }, [range, passageId, fetchAnalytics]);

  // ── Passage table sort (client-side, max 44 rows) ──────────────────────────
  const handleSort = (key: PassageSortKey) => {
    if (key === sortKey) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('desc'); }
  };

  const sortedPassages = data ? [...data.passages].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    if (typeof av === 'string' && typeof bv === 'string')
      return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortOrder === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  }) : [];

  const sortIcon = (key: PassageSortKey) => key !== sortKey
    ? <span className={styles.sortIcon}>↕</span>
    : <span className={`${styles.sortIcon} ${styles.sortActive}`}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;

  // ── Chart: question type ───────────────────────────────────────────────────
  const qtSorted = data
    ? [...data.question_types].sort((a, b) =>
        qtMetric === 'avg_wrong'
          ? (b.avg_wrong ?? 0) - (a.avg_wrong ?? 0)
          : b.attempts - a.attempts)
    : [];

  const qtChartData = {
    labels: qtSorted.map(q => QUESTION_LABELS[q.type] ?? q.type),
    datasets: [{
      label: qtMetric === 'avg_wrong' ? 'Avg wrong' : 'Attempts',
      data: qtSorted.map(q => qtMetric === 'avg_wrong' ? (q.avg_wrong ?? 0) : q.attempts),
      backgroundColor: paletteColorsAlpha(palette).slice(0, qtSorted.length),
      borderColor:     paletteColors(palette).slice(0, qtSorted.length),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const qtOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  // ── Chart: day of week ─────────────────────────────────────────────────────
  const dowChartData = {
    labels: data?.day_of_week.map(d => d.name) ?? [],
    datasets: [{
      label: 'Attempts',
      data: data?.day_of_week.map(d => d.attempts) ?? [],
      backgroundColor: palette.p1 + 'CC',
      borderColor: palette.p1,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // ── Chart: hour of day ─────────────────────────────────────────────────────
  const hourChartData = {
    labels: data?.hour_of_day.map(h => fmtHour(h.hour)) ?? [],
    datasets: [{
      label: 'Attempts (HKT)',
      data: data?.hour_of_day.map(h => h.attempts) ?? [],
      backgroundColor: palette.p2 + 'CC',
      borderColor: palette.p2,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const basicBarOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  // ── Wrong count colouring ──────────────────────────────────────────────────
  const wrongClass = (v: number | null) => {
    if (v === null) return '';
    if (v <= 0.5) return styles.goodNum;
    if (v <= 1.5) return styles.warnNum;
    return styles.badNum;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Learning Analytics</h1>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.rangeGroup}>
          {RANGES.map(r => (
            <button
              key={r.value}
              className={`${styles.rangeBtn} ${range === r.value ? styles.rangeBtnActive : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <select
          className={styles.passageSelect}
          value={passageId}
          onChange={e => setPassageId(e.target.value)}
        >
          <option value="all">All passages</option>
          {passages.map(p => (
            <option key={p.passage_id} value={String(p.passage_id)}>
              {p.title}{p.author ? ` — ${p.author}` : ''}
            </option>
          ))}
        </select>

        {data && (
          <span className={styles.filterLabel}>
            {data.passages.reduce((s, p) => s + p.attempts, 0).toLocaleString()} sessions
          </span>
        )}
      </div>

      {loading && <p className={styles.loading}>Loading…</p>}
      {error   && <p className={styles.error}>{error}</p>}

      {!loading && !error && data && (
        <>
          {/* Passage table */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Passage performance</h2>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {([
                      ['title',        'Passage'],
                      ['attempts',     'Attempts'],
                      ['students',     'Students'],
                      ['avg_wrong',    'Avg wrong'],
                      ['pct_perfect',  '% Perfect'],
                      ['avg_duration', 'Avg duration'],
                    ] as [PassageSortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        className={key === sortKey ? styles.activeHeader : ''}
                        onClick={() => handleSort(key)}
                      >
                        {label} {sortIcon(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPassages.map(p => (
                    <tr key={p.passage_id}>
                      <td>
                        <div className={styles.passageTitle}>{p.title}</div>
                        {p.author && <div className={styles.authorCell}>{p.author}</div>}
                      </td>
                      <td>{p.attempts.toLocaleString()}</td>
                      <td>{p.students.toLocaleString()}</td>
                      <td className={wrongClass(p.avg_wrong)}>
                        {p.avg_wrong !== null ? p.avg_wrong : '—'}
                      </td>
                      <td className={p.pct_perfect !== null && p.pct_perfect >= 60 ? styles.goodNum : ''}>
                        {p.pct_perfect !== null ? `${p.pct_perfect}%` : '—'}
                      </td>
                      <td>{fmtDuration(p.avg_duration)}</td>
                    </tr>
                  ))}
                  {sortedPassages.length === 0 && (
                    <tr><td colSpan={6} className={styles.loading}>No data for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Question type + Day of week */}
          <div className={styles.twoCol}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Question type difficulty</h2>
                <div className={styles.toggleGroup}>
                  <button
                    className={`${styles.toggleBtn} ${qtMetric === 'avg_wrong' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setQtMetric('avg_wrong')}
                  >
                    Avg wrong
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${qtMetric === 'attempts' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setQtMetric('attempts')}
                  >
                    Attempts
                  </button>
                </div>
              </div>
              <Bar data={qtChartData} options={qtOptions} />
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Activity by day of week (HKT)</h2>
              </div>
              <Bar data={dowChartData} options={basicBarOptions} />
            </div>
          </div>

          {/* Hour of day */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Activity by hour of day (HKT)</h2>
            </div>
            <Bar data={hourChartData} options={basicBarOptions} />
          </div>
        </>
      )}
    </div>
  );
}
