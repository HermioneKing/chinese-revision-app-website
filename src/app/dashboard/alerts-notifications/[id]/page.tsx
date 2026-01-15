'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import styles from '../detail.module.css';

const dummyNotifications = [
  { id: 1, type: 'alert', message: 'Student John Doe has low performance.', read: false },
  { id: 2, type: 'notification', message: 'New feature: Challenge Mode added.', read: true },
  { id: 3, type: 'alert', message: 'Student Jane Smith has been inactive for 7 days.', read: false },
  { id: 4, type: 'notification', message: 'Your subscription will expire in 3 days.', read: false },
];

const NotificationDetailPage = () => {
  const { id } = useParams();
  const notification = dummyNotifications.find(n => n.id === parseInt(id as string));

  if (!notification) {
    return <div className={styles.container}>Notification not found.</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{notification.type}</h1>
      <p className={styles.message}>{notification.message}</p>
    </div>
  );
};

export default NotificationDetailPage;
