'use client';

import React from 'react';
import { useNotifications } from '@/lib/useNotifications';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import styles from './NotificationSettings.module.css';

export default function NotificationSettings() {
    const { user } = useAuth();
    const { permission, requestPermission, isSupported } = useNotifications(user?.uid || null);

    if (!isSupported) {
        return (
            <div className={styles.container}>
                <p className={styles.unsupported}>
                    お使いのブラウザは通知機能に対応していません
                </p>
            </div>
        );
    }

    const handleEnableNotifications = async () => {
        const granted = await requestPermission();
        if (granted) {
            alert('通知が有効になりました！');
        } else {
            alert('通知の許可が拒否されました。ブラウザの設定から許可してください。');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>通知設定</h3>
                <div className={styles.status}>
                    {permission === 'granted' && (
                        <span className={styles.statusGranted}>✓ 有効</span>
                    )}
                    {permission === 'denied' && (
                        <span className={styles.statusDenied}>✗ 拒否</span>
                    )}
                    {permission === 'default' && (
                        <span className={styles.statusDefault}>未設定</span>
                    )}
                </div>
            </div>

            <p className={styles.description}>
                新しいメッセージや返信があったときに通知を受け取ります
            </p>

            {permission !== 'granted' && (
                <Button
                    onClick={handleEnableNotifications}
                    variant="primary"
                >
                    通知を有効にする
                </Button>
            )}

            {permission === 'denied' && (
                <p className={styles.help}>
                    通知が拒否されています。ブラウザの設定から許可してください。
                </p>
            )}
        </div>
    );
}
