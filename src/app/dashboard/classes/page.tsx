import React from 'react';
import styles from './page.module.css';

async function getClasses() {
  const res = await fetch(`http://backend:5001/api/classes`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  return res.json();
}

const ClassesPage = async () => {
  const classes = await getClasses();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Classes</h1>
      <div className={styles.classList}>
        {classes.map((classInfo: any) => (
          <div key={classInfo.group_id} className={styles.classCard}>
            <h2 className={styles.className}>{classInfo.group_name}</h2>
            <div className={styles.studentRoster}>
              <h3 className={styles.rosterTitle}>Student Roster</h3>
              <table className={styles.rosterTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Subscription</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {classInfo.StudentGroupMapping.map((mapping: any) => (
                    <tr key={mapping.student.student_id}>
                      <td>{mapping.student.nickname || mapping.student.username}</td>
                      <td>{mapping.student.student_login_email?.email}</td>
                      <td>{mapping.student.student_subscription?.end_date ? new Date(mapping.student.student_subscription.end_date) > new Date() ? 'Active' : 'Inactive' : 'N/A'}</td>
                      <td>{mapping.student.student_activity_stats?.last_activity_date ? new Date(mapping.student.student_activity_stats.last_activity_date).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassesPage;