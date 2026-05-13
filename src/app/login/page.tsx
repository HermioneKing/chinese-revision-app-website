'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Image from 'next/image';
import { apiPost, setToken } from '@/lib/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiPost('/auth/login', { username, password });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setToken(data.token);
          router.push('/home');
        } else {
          setError('Login failed: No token received');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Wrong username and/or password.');
      }
    } catch (_err) {
      setError('Login service is temporarily unavailable. Please try again shortly.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <p className={styles.logoTitle}>DSE Chinese</p>
          <p className={styles.logoSub}>Teacher Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.button}>Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
