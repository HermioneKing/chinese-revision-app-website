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
  total_time: number;
  last_online: string | null;
}

interface PassageRow {
  passage_id: number;
  title: string;
  attempts: number;
  avg_wrong: number | null;
  pct_perfect: number | null;
  total_time: number;
}

interface QuestionRow {
  question_id: string;
  type: string;
  question_text: string | null;
  attempts: number;
  avg_wrong: number | null;
  pct_perfect: number | null;
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

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(secs: number | null): string {
  if (secs === null) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTotalTime(secs: number): string {
  if (secs === 0) return '—';
  return formatDuration(secs);
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

  const [passages,        setPassages]        = useState<PassageRow[]>([]);
  const [passagesLoading, setPassagesLoading] = useState(false);
  const [passagesError,   setPassagesError]   = useState<string | null>(null);

  const [selectedPassageId, setSelectedPassageId] = useState<number | null>(null);
  const [questions,         setQuestions]          = useState<QuestionRow[]>([]);
  const [questionsLoading,  setQuestionsLoading]   = useState(false);

  useEffect(() => {
    apiGet(`/students/${id}`)
      .then(r => { if (!r.ok) throw new Error('Student not found'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setPassagesLoading(true);
    apiGet(`/students/${id}/passages`)
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(setPassages)
      .catch(e => setPassagesError(e.message))
      .finally(() => setPassagesLoading(false));
  }, [id]);

  const handlePassageClick = async (passageId: number) => {
    if (selectedPassageId === passageId) {
      setSelectedPassageId(null);
      setQuestions([]);
      return;
    }
    setSelectedPassageId(passageId);
    setQuestionsLoading(true);
    try {
      const res = await apiGet(`/students/${id}/passages/${passageId}`);
      if (res.ok) setQuestions(await res.json());
    } finally {
      setQuestionsLoading(false);
    }
  };

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;
  if (!data)   return null;

  const { student, history, passages_attempted, total_passages, total_time, last_online } = data;
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
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p3)' } as React.CSSProperties}>
          <div className={styles.statLabel}>Total time</div>
          <div className={styles.statValue} style={{ fontSize: 20 }}>{formatTotalTime(total_time)}</div>
        </div>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p5)' } as React.CSSProperties}>
          <div className={styles.statLabel}>Last online</div>
          <div className={styles.statValue} style={{ fontSize: 16 }}>{formatDateTime(last_online)}</div>
        </div>
      </div>

      {/* Interactive performance chart */}
      <PerformanceChart studentId={student.student_id} />

      {/* Passage performance */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Passage performance</h2>
        {passagesLoading && <p className={styles.loading}>Loading…</p>}
        {passagesError   && <p className={styles.error}>{passagesError}</p>}
        {!passagesLoading && !passagesError && (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Passage</th>
                  <th>Attempts</th>
                  <th>Avg wrong ↓</th>
                  <th>% Perfect</th>
                  <th>Total time</th>
                </tr>
              </thead>
              <tbody>
                {passages.length === 0 && (
                  <tr><td colSpan={5} className={styles.loading}>No passage data yet.</td></tr>
                )}
                {passages.map(p => (
                  <React.Fragment key={p.passage_id}>
                    <tr
                      className={`${styles.passageRow} ${selectedPassageId === p.passage_id ? styles.passageRowSelected : ''}`}
                      onClick={() => handlePassageClick(p.passage_id)}
                    >
                      <td className={styles.passageTitleCell}>
                        <span className={styles.expandIcon}>
                          {selectedPassageId === p.passage_id ? '▼' : '▶'}
                        </span>
                        {p.title}
                      </td>
                      <td>{p.attempts}</td>
                      <td className={p.avg_wrong !== null && p.avg_wrong > 0 ? styles.wrongBad : styles.wrongGood}>
                        {p.avg_wrong !== null ? p.avg_wrong.toFixed(2) : '—'}
                      </td>
                      <td>{p.pct_perfect !== null ? `${p.pct_perfect.toFixed(1)}%` : '—'}</td>
                      <td>{formatTotalTime(p.total_time)}</td>
                    </tr>
                    {selectedPassageId === p.passage_id && (
                      <tr className={styles.questionExpandRow}>
                        <td colSpan={5} className={styles.questionExpandCell}>
                          {questionsLoading ? (
                            <p className={styles.loading} style={{ padding: '16px' }}>Loading questions…</p>
                          ) : (
                            <div className={styles.questionExpandScroll}>
                              <table className={styles.miniTable}>
                                <thead>
                                  <tr>
                                    <th style={{ position: 'sticky', top: 0, background: '#f8faf8', zIndex: 1 }}>Question</th>
                                    <th style={{ position: 'sticky', top: 0, background: '#f8faf8', zIndex: 1 }}>Type</th>
                                    <th style={{ position: 'sticky', top: 0, background: '#f8faf8', zIndex: 1 }}>Attempts</th>
                                    <th style={{ position: 'sticky', top: 0, background: '#f8faf8', zIndex: 1 }}>Avg wrong ↓</th>
                                    <th style={{ position: 'sticky', top: 0, background: '#f8faf8', zIndex: 1 }}>% Perfect</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {questions.length === 0 && (
                                    <tr><td colSpan={5} className={styles.loading}>No data.</td></tr>
                                  )}
                                  {questions.map(q => (
                                    <tr key={q.question_id}>
                                      <td className={styles.questionTextCell}>{q.question_text ?? '—'}</td>
                                      <td>{QUESTION_TYPE_LABELS[q.type] ?? q.type}</td>
                                      <td>{q.attempts}</td>
                                      <td className={q.avg_wrong !== null && q.avg_wrong > 0 ? styles.wrongBad : styles.wrongGood}>
                                        {q.avg_wrong !== null ? q.avg_wrong.toFixed(2) : '—'}
                                      </td>
                                      <td>{q.pct_perfect !== null ? `${q.pct_perfect.toFixed(1)}%` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
