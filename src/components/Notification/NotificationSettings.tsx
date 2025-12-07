'use client';

import React, { useEffect, useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useNotifications } from '@/lib/useNotifications';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import styles from './NotificationSettings.module.css';

interface NotificationPreferences {
    messages: boolean;
    threads: boolean;
}

export default function NotificationSettings() {
    const { user } = useAuth();
    const { permission, requestPermission, isSupported } = useNotifications(user?.uid || null);
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        messages: true,
        threads: true,
    });
    const [loading, setLoading] = useState(true);

    // Load user's notification preferences
    useEffect(() => {
        if (!user) return;

        const loadPreferences = async () => {
            try {
                const prefsRef = ref(database, `users/${user.uid}/notificationSettings`);
                const snapshot = await get(prefsRef);

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setPreferences({
                        messages: data.messages !== false,
                        threads: data.threads !== false,
                    });
                }
            } catch (error) {
                console.error('Error loading preferences:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPreferences();
    }, [user]);

    const handleToggle = async (type: 'messages' | 'threads') => {
        if (!user) return;

        const newValue = !preferences[type];
        setPreferences(prev => ({ ...prev, [type]: newValue }));

        try {
            await set(
                ref(database, `users/${user.uid}/notificationSettings/${type}`),
                newValue
            );
        } catch (error) {
            console.error('Error saving preference:', error);
            // Revert on error
            setPreferences(prev => ({ ...prev, [type]: !newValue }));
        }
    };

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

            {permission !== 'granted' && (
                <>
                    <p className={styles.description}>
                        新しいメッセージや返信があったときに通知を受け取ります
                    </p>
                    <Button
                        onClick={handleEnableNotifications}
                        variant="primary"
                    >
                        通知を有効にする
                    </Button>
                </>
            )}

            {permission === 'granted' && !loading && (
                <div className={styles.preferences}>
                    <p className={styles.description}>
                        通知の種類を選択できます
                    </p>

                    <div className={styles.toggleGroup}>
                        <div className={styles.toggleItem}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleLabel}>💬 メッセージ通知</span>
                                <span className={styles.toggleDesc}>
                                    ダイレクトメッセージを受信したとき
                                </span>
                            </div>
                            <button
                                className={`${styles.toggle} ${preferences.messages ? styles.toggleOn : ''}`}
                                onClick={() => handleToggle('messages')}
                                aria-label="メッセージ通知の切り替え"
                            >
                                <span className={styles.toggleSlider} />
                            </button>
                        </div>

                        <div className={styles.toggleItem}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleLabel}>🧵 スレッド返信通知</span>
                                <span className={styles.toggleDesc}>
                                    あなたのスレッドや参加しているスレッドに返信があったとき
                                </span>
                            </div>
                            <button
                                className={`${styles.toggle} ${preferences.threads ? styles.toggleOn : ''}`}
                                onClick={() => handleToggle('threads')}
                                aria-label="スレッド通知の切り替え"
                            >
                                <span className={styles.toggleSlider} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {permission === 'denied' && (
                <p className={styles.help}>
                    通知が拒否されています。ブラウザの設定から許可してください。
                </p>
            )}
        </div>
    );
}
