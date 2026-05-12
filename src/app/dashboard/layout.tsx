'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './layout.module.css';
import { logout } from '@/lib/auth';
import { PaletteProvider } from '@/context/PaletteContext';
import PalettePicker from '@/components/PalettePicker';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [isAccountMenuVisible, setAccountMenuVisible] = useState(false);
  const [isAlertsMenuVisible, setAlertsMenuVisible] = useState(false);
  const alertsMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
  };

  const handleSidebarLinkClick = () => {
    setSidebarVisible(false);
  };

  const toggleAlertsMenu = () => {
    setAlertsMenuVisible(!isAlertsMenuVisible);
    if (!isAlertsMenuVisible) {
      setAccountMenuVisible(false); // Close account menu when opening alerts menu
    }
  };

  const toggleAccountMenu = () => {
    setAccountMenuVisible(!isAccountMenuVisible);
    if (!isAccountMenuVisible) {
      setAlertsMenuVisible(false); // Close alerts menu when opening account menu
    }
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    // Clear any local state
    setAccountMenuVisible(false);
    setAlertsMenuVisible(false);
    setSidebarVisible(false);
    
    // Execute logout (removes token, clears user state, and redirects)
    logout();
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both menu containers
      const isOutsideAlertsMenu = alertsMenuRef.current && !alertsMenuRef.current.contains(target);
      const isOutsideAccountMenu = accountMenuRef.current && !accountMenuRef.current.contains(target);
      
      // If both menus are outside the click, close them
      if (isOutsideAlertsMenu && isOutsideAccountMenu) {
        setAlertsMenuVisible(false);
        setAccountMenuVisible(false);
      }
    };

    // Only add listener if at least one menu is open
    if (isAlertsMenuVisible || isAccountMenuVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAlertsMenuVisible, isAccountMenuVisible]);

  const navItems = [
    { name: 'Home', path: '/dashboard' },
    { name: 'Students', path: '/dashboard/students' },
    { name: 'Learning Analytics', path: '/dashboard/learning-analytics' },
    { name: 'Reports', path: '/dashboard/reports' },
  ];

  const dummyAlerts = [
    { id: 1, type: 'alert', message: 'Student John Doe has low performance.' },
    { id: 2, type: 'notification', message: 'New feature: Challenge Mode added.' },
  ];

  return (
    <PaletteProvider>
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${isSidebarVisible ? styles.sidebarVisible : ''}`}>
        <div className={styles.sidebarLogo}>
          <Link href="/dashboard" onClick={handleSidebarLinkClick} className={styles.sidebarLogoLink}>
            DSE Chinese
          </Link>
        </div>
        <nav>
          <ul>
            {navItems.map((item) => {
              const isActive = item.path === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={handleSidebarLinkClick}
                    className={isActive ? styles.navLinkActive : styles.navLink}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.sidebarBottom}>
          <hr className={styles.sidebarDivider} />
          <Link
            href="/dashboard/settings"
            onClick={handleSidebarLinkClick}
            className={pathname.startsWith('/dashboard/settings') ? styles.navLinkActive : styles.navLink}
          >
            Settings
          </Link>
        </div>
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
            <PalettePicker />
            <div
              ref={alertsMenuRef}
              className={styles.alertsIconContainer}
              onClick={toggleAlertsMenu}
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
              ref={accountMenuRef}
              className={styles.accountIconContainer}
              onClick={toggleAccountMenu}
            >
              <div className={styles.accountIcon}></div>
              {isAccountMenuVisible && (
                <div className={styles.accountMenu}>
                  <Link href="/dashboard/settings">Setting</Link>
                  <a href="#" onClick={handleLogout} style={{ cursor: 'pointer' }}>Sign out</a>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
    </PaletteProvider>
  );
};

export default DashboardLayout;
