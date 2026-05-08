'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import styles from './students.module.css';

interface Student {
  student_id: number;
  username: string;
  nickname: string | null;
  register_date: string;
  plan: string | null;
  total_sessions: number;
  last_active: string | null;
}

interface StudentsResponse {
  students: Student[];
  total: number;
  page: number;
  total_pages: number;
}

type SortKey = 'username' | 'nickname' | 'plan' | 'register_date' | 'total_sessions' | 'last_active';
type SortOrder = 'asc' | 'desc';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'username',       label: 'Username' },
  { key: 'nickname',       label: 'Nickname' },
  { key: 'plan',           label: 'Plan' },
  { key: 'register_date',  label: 'Registered' },
  { key: 'total_sessions', label: 'Sessions' },
  { key: 'last_active',    label: 'Last active' },
];

export default function StudentsPage() {
  const router = useRouter();
  const [data, setData]       = useState<StudentsResponse | null>(null);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('total_sessions');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchStudents = useCallback(async (
    q: string, p: number, sort: SortKey, order: SortOrder
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: q,
        page: String(p),
        limit: '20',
        sort,
        order,
      });
      const res = await apiGet(`/students?${params}`);
      if (!res.ok) throw new Error('Failed to load students');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search — reset to page 1
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchStudents(search, 1, sortKey, sortOrder);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Page / sort changes — fetch immediately
  useEffect(() => {
    fetchStudents(search, page, sortKey, sortOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey) return <span className={styles.sortIcon}>↕</span>;
    return <span className={`${styles.sortIcon} ${styles.sortActive}`}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Students</h1>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search username or nickname…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {data && (
          <span className={styles.totalLabel}>
            {data.total.toLocaleString()} students
          </span>
        )}
      </div>

      <div className={styles.tableWrap}>
        {loading && <p className={styles.loading}>Loading…</p>}
        {error   && <p className={styles.error}>{error}</p>}
        {!loading && !error && data && (
          <table className={styles.table}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`${styles.sortableHeader} ${col.key === sortKey ? styles.activeHeader : ''}`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label} {sortIndicator(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map(s => (
                <tr key={s.student_id} onClick={() => router.push(`/dashboard/students/${s.student_id}`)}>
                  <td className={styles.usernameCell}>{s.username}</td>
                  <td className={styles.nicknameCell}>{s.nickname ?? '—'}</td>
                  <td>
                    <span className={`${styles.planBadge} ${s.plan === 'premium' ? styles.planPremium : styles.planFree}`}>
                      {s.plan ?? 'none'}
                    </span>
                  </td>
                  <td>{formatDate(s.register_date)}</td>
                  <td>{s.total_sessions.toLocaleString()}</td>
                  <td>{formatDate(s.last_active)}</td>
                </tr>
              ))}
              {data.students.length === 0 && (
                <tr><td colSpan={6} className={styles.loading}>No students found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            ← Prev
          </button>
          <span className={styles.pageInfo}>Page {page} of {data.total_pages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page === data.total_pages}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
