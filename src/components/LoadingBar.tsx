'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './LoadingBar.module.css';

const LoadingBarContent = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Hide the loading bar after a short delay to allow navigation to complete
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return <div className={styles.loadingBar}></div>;
};

const LoadingBar = () => {
  return (
    <Suspense fallback={null}>
      <LoadingBarContent />
    </Suspense>
  );
};

export default LoadingBar;
