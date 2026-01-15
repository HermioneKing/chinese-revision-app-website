import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const dummyNotifications = [
  { id: 1, type: 'alert', message: 'Student John Doe has low performance.', read: false },
  { id: 2, type: 'notification', message: 'New feature: Challenge Mode added.', read: true },
  { id: 3, type: 'alert', message: 'Student Jane Smith has been inactive for 7 days.', read: false },
  { id: 4, type: 'notification', message: 'Your subscription will expire in 3 days.', read: false },
];

const AlertsNotificationsPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Alerts & Notifications</h1>
      {dummyNotifications.length > 0 ? (
        <div className={styles.notificationList}>
          {dummyNotifications.map((notification) => (
            <Link key={notification.id} href={`/dashboard/alerts-notifications/${notification.id}`} className={`${styles.notificationItem} ${notification.read ? styles.read : ''}`}>
              <div className={styles.notificationType}>{notification.type}</div>
              <div className={styles.notificationMessage}>{notification.message}</div>
            </Link>
          ))}
        </div>
      ) : (
        <p>You don't have any notification now.</p>
      )}
    </div>
  );
};

export default AlertsNotificationsPage;