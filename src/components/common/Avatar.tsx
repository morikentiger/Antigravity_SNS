import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
    src?: string;
    alt: string;
    size?: 'sm' | 'md' | 'lg';
    online?: boolean;
}

export default function Avatar({ src, alt, size = 'md', online }: AvatarProps) {
    const fallbackInitial = alt.charAt(0).toUpperCase();

    return (
        <div className={`${styles.avatar} ${styles[size]}`}>
            {src ? (
                <img src={src} alt={alt} className={styles.image} />
            ) : (
                <div className={styles.fallback}>{fallbackInitial}</div>
            )}
            {online !== undefined && (
                <div className={`${styles.status} ${online ? styles.online : styles.offline}`} />
            )}
        </div>
    );
}
