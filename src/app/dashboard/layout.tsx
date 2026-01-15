'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './layout.module.css';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isAccountMenuVisible, setAccountMenuVisible] = useState(false);
  const [isAlertsMenuVisible, setAlertsMenuVisible] = useState(false);

  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
  };

  const navItems = [
    { name: 'Classes', path: '/dashboard/classes' },
    { name: 'Performance', path: '/dashboard/performance-analytics' },
    { name: 'Content', path: '/dashboard/content-analytics' },
    { name: 'Student Engagement', path: '/dashboard/student-engagement' },
    { name: 'Challenge Mode', path: '/dashboard/challenge-mode' },
    { name: 'Reports', path: '/dashboard/reports-exports' },
    { name: 'Actions', path: '/dashboard/interventions-actions' },
  ];

  const dummyAlerts = [
    { id: 1, type: 'alert', message: 'Student John Doe has low performance.' },
    { id: 2, type: 'notification', message: 'New feature: Challenge Mode added.' },
  ];

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${isSidebarVisible ? styles.sidebarVisible : ''}`}>
        <nav>
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className={`${styles.overlay} ${isSidebarVisible ? styles.overlayVisible : ''}`} onClick={toggleSidebar}></div>

      <div className={`${styles.main} ${isSidebarVisible ? styles.mainWithSidebar : ''}`}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={toggleSidebar} className={styles.toggleButton}>
              ☰
            </button>
            <Link href="/dashboard" className={styles.appNameLink}>
              <span className={styles.appName}>DSE Chinese Revision</span>
            </Link>
          </div>
          <div className={styles.headerRight}>
            <div 
              className={styles.alertsIconContainer}
              onClick={() => setAlertsMenuVisible(!isAlertsMenuVisible)}
            >
              <div className={styles.alertsIcon}>🔔</div>
              {isAlertsMenuVisible && (
                <div className={styles.alertsMenu}>
                  {dummyAlerts.map(alert => (
                    <div key={alert.id} className={styles.alertItem}>
                      <Link href={`/dashboard/alerts-notifications/${alert.id}`}>{alert.message}</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div 
              className={styles.accountIconContainer}
              onMouseEnter={() => setAccountMenuVisible(true)}
              onMouseLeave={() => setAccountMenuVisible(false)}
            >
              <div className={styles.accountIcon}></div>
              {isAccountMenuVisible && (
                <div className={styles.accountMenu}>
                  <Link href="/dashboard/settings">Setting</Link>
                  <Link href="/auth/signout">Sign out</Link>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;



