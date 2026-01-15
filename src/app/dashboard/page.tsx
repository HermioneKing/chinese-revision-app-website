import React from 'react';
import styles from './page.module.css';

const DashboardHomePage = () => {
  return (
    <div>
      <h1 className={styles.title}>Home</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Quick Stats Overview</h2>
          <ul>
            <li>Total Active Students: 120</li>
            <li>Class Average Score: 85%</li>
            <li>Weekly Completion Rate: 92%</li>
            <li>Students Needing Attention ⚠️: 5</li>
          </ul>
        </div>
        <div className={styles.card}>
          <h2>Recent Activity Feed</h2>
          <ul>
            <li>[Timestamp] John Doe completed "Passage A" with 95%.</li>
            <li>[Timestamp] Jane Smith achieved a new high score in "Challenge Mode".</li>
            <li>[Timestamp] Mike Johnson logged in.</li>
          </ul>
        </div>
        <div className={styles.card}>
          <h2>Quick Actions</h2>
          <ul>
            <li><button className={styles.button}>Assign New Passage</button></li>
            <li><button className={styles.button}>View Reports</button></li>
            <li><button className={styles.button}>Send Announcement</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardHomePage;
