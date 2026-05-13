'use client';

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { apiGet } from '@/lib/api';
import { usePalette } from '@/context/PaletteContext';
import { paletteColors, paletteColorsAlpha } from '@/lib/palettes';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  total_students: number;
  active_this_week: number;
  avg_wrong_count: number | null;
  total_sessions: number;
}

interface ActivityRecord {
  practice_record_id: number;
  tested_date: string;
  wrong_count: number;
  duration: number | null;
  username: string;
  nickname: string | null;
  passage_title: string;
  question_type: string;
}

interface TopPassage {
  passage_id: number;
  title: string;
  attempt_count: number;
  avg_wrong_count: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function questionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    word_explanation: 'Word explanation',
    word_rearrange: 'Word rearrange',
    mc: 'Multiple choice',
    keyword: 'Keyword',
    translation: 'Translation',
    long_question: 'Long question',
    sentence_rearrange: 'Sentence rearrange',
  };
  return map[type] ?? type;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const { palette } = usePalette();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [topPassages, setTopPassages] = useState<TopPassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, actRes, topRes] = await Promise.all([
          apiGet('/dashboard/summary'),
          apiGet('/dashboard/recent-activity'),
          apiGet('/dashboard/top-passages'),
        ]);
        if (!sumRes.ok || !actRes.ok || !topRes.ok) {
          throw new Error('Failed to load dashboard data');
        }
        const [sumData, actData, topData] = await Promise.all([
          sumRes.json(),
          actRes.json(),
          topRes.json(),
        ]);
        setSummary(sumData);
        setActivity(actData);
        setTopPassages(topData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const chartData = {
    labels: topPassages.map((p) => p.title),
    datasets: [
      {
        label: 'Attempts this week',
        data: topPassages.map((p) => p.attempt_count),
        backgroundColor: paletteColorsAlpha(palette),
        borderColor: paletteColors(palette),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (ctx: { dataIndex: number }) => {
            const p = topPassages[ctx.dataIndex];
            return p.avg_wrong_count !== null
              ? `Avg wrong: ${p.avg_wrong_count}`
              : '';
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p1)' } as React.CSSProperties}>
          <span className={styles.statLabel}>Total students</span>
          <span className={styles.statValue}>{summary!.total_students.toLocaleString()}</span>
        </div>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p2)' } as React.CSSProperties}>
          <span className={styles.statLabel}>Active this week</span>
          <span className={styles.statValue}>{summary!.active_this_week.toLocaleString()}</span>
        </div>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p3)' } as React.CSSProperties}>
          <span className={styles.statLabel}>Avg wrong / session</span>
          <span className={styles.statValue}>
            {summary!.avg_wrong_count !== null ? summary!.avg_wrong_count : '—'}
          </span>
          <span className={styles.statSub}>last 7 days</span>
        </div>
        <div className={styles.statCard} style={{ '--card-accent': 'var(--p6)' } as React.CSSProperties}>
          <span className={styles.statLabel}>Practice sessions</span>
          <span className={styles.statValue}>{summary!.total_sessions.toLocaleString()}</span>
          <span className={styles.statSub}>last 7 days</span>
        </div>
      </div>

      {/* Two-column section */}
      <div className={styles.twoCol}>

        {/* Recent activity */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent activity</h2>
          <div className={styles.activityList}>
            {activity.length === 0 && (
              <p className={styles.loading}>No recent activity.</p>
            )}
            {activity.map((rec) => (
              <div key={rec.practice_record_id} className={styles.activityRow}>
                <div className={styles.activityDot} />
                <div className={styles.activityMain}>
                  <span className={styles.activityStudent}>
                    {rec.nickname ? `${rec.nickname} (${rec.username})` : rec.username}
                  </span>
                  <span className={styles.activityMeta}>
                    {rec.passage_title} · {questionTypeLabel(rec.question_type)} · {timeAgo(rec.tested_date)}
                  </span>
                </div>
                <span
                  className={
                    rec.wrong_count === 0
                      ? `${styles.activityWrong} ${styles.activityWrongZero}`
                      : styles.activityWrong
                  }
                >
                  {rec.wrong_count === 0 ? '✓' : `${rec.wrong_count} wrong`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top passages chart */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Top passages this week</h2>
          {topPassages.length === 0 ? (
            <p className={styles.loading}>No data for this week yet.</p>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>

      </div>
    </div>
  );
}
