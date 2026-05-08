'use client';

import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '@/lib/api';
import styles from './page.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  teacher_id: number;
  username: string;
  email: string | null;
  title: string | null;
  given_name: string | null;
  surname: string | null;
  tel: string | null;
  school: string | null;
  subject: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TITLES = ['', 'Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];

function displayName(p: Profile): string {
  const parts = [p.title, p.given_name, p.surname].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : p.username;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    apiGet('/settings/profile')
      .then(r => r.json())
      .then(setProfile)
      .finally(() => setPageLoading(false));
  }, []);

  if (pageLoading) return <p className={styles.loading}>Loading…</p>;
  if (!profile)    return <p className={styles.loading}>Could not load settings.</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Settings</h1>
      <ProfileCard profile={profile} onSave={setProfile} />
      <PasswordCard />
      <AboutCard profile={profile} />
    </div>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [form, setForm] = useState({
    title:      profile.title      ?? '',
    given_name: profile.given_name ?? '',
    surname:    profile.surname    ?? '',
    email:      profile.email      ?? '',
    tel:        profile.tel        ?? '',
    school:     profile.school     ?? '',
    subject:    profile.subject    ?? '',
  });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await apiPut('/settings/profile', form);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to save');
      }
      onSave({ ...profile, ...form, email: form.email || null });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const avatarChar = (form.given_name || form.surname || profile.username)[0].toUpperCase();
  const name = [form.title, form.given_name, form.surname].filter(Boolean).join(' ') || profile.username;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Profile</h2>

      <div className={styles.profileHeader}>
        <div className={styles.avatar}>{avatarChar}</div>
        <div className={styles.avatarMeta}>
          <span className={styles.avatarName}>{name}</span>
          <span className={styles.avatarSub}>@{profile.username}</span>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Title</label>
          <select className={styles.select} value={form.title} onChange={set('title')}>
            {TITLES.map(t => <option key={t} value={t}>{t || '—'}</option>)}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Given name</label>
          <input className={styles.input} value={form.given_name} onChange={set('given_name')} placeholder="e.g. Alex" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Surname</label>
          <input className={styles.input} value={form.surname} onChange={set('surname')} placeholder="e.g. Chan" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email</label>
          <input className={styles.input} type="email" value={form.email} onChange={set('email')} placeholder="e.g. teacher@school.edu.hk" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Phone</label>
          <input className={styles.input} value={form.tel} onChange={set('tel')} placeholder="e.g. +852 1234 5678" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Subject</label>
          <input className={styles.input} value={form.subject} onChange={set('subject')} placeholder="e.g. Chinese Language" />
        </div>

        <div className={`${styles.fieldGroup} ${styles.formGridFull}`}>
          <label className={styles.label}>School</label>
          <input className={styles.input} value={form.school} onChange={set('school')} placeholder="e.g. Pui Ching Middle School" />
        </div>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {success && <span className={styles.successMsg}>Saved</span>}
        {error   && <span className={styles.errorMsg}>{error}</span>}
      </div>
    </div>
  );
}

// ── Password card ─────────────────────────────────────────────────────────────

function PasswordCard() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    if (form.next.length < 8)       { setError('New password must be at least 8 characters'); return; }

    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await apiPut('/settings/password', {
        current_password: form.current,
        new_password: form.next,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed to change password');
      setSuccess(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Change Password</h2>

      <div className={styles.formGrid}>
        <div className={`${styles.fieldGroup} ${styles.formGridFull}`}>
          <label className={styles.label}>Current password</label>
          <input className={styles.input} type="password" value={form.current} onChange={set('current')} autoComplete="current-password" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>New password</label>
          <input className={styles.input} type="password" value={form.next} onChange={set('next')} autoComplete="new-password" placeholder="Min. 8 characters" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Confirm new password</label>
          <input className={styles.input} type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </div>
      </div>

      <div className={styles.btnRow}>
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={saving || !form.current || !form.next || !form.confirm}
        >
          {saving ? 'Updating…' : 'Update password'}
        </button>
        {success && <span className={styles.successMsg}>Password updated</span>}
        {error   && <span className={styles.errorMsg}>{error}</span>}
      </div>
    </div>
  );
}

// ── About card ────────────────────────────────────────────────────────────────

function AboutCard({ profile }: { profile: Profile }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Teacher ID',   value: `#${profile.teacher_id}` },
    { label: 'Username',     value: profile.username },
    { label: 'Display name', value: displayName(profile) },
    { label: 'Platform',     value: 'DSE Chinese Revision' },
  ];

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>About</h2>
      <div className={styles.aboutGrid}>
        {rows.map(r => (
          <div key={r.label} className={styles.aboutRow}>
            <span className={styles.aboutLabel}>{r.label}</span>
            <span className={styles.aboutValue}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
