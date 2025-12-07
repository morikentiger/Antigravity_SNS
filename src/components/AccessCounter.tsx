'use client';

import React, { useEffect, useState } from 'react';
import { ref, get, set, runTransaction } from 'firebase/database';
import { database } from '@/lib/firebase';
import styles from './AccessCounter.module.css';

const KIRIBAN_NUMBERS = [100, 500, 1000, 1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999, 10000];

export default function AccessCounter() {
    const [count, setCount] = useState<number | null>(null);
    const [isKiriban, setIsKiriban] = useState(false);
    const [showCongrats, setShowCongrats] = useState(false);

    useEffect(() => {
        const incrementCounter = async () => {
            const counterRef = ref(database, 'siteStats/accessCount');

            try {
                // トランザクションでカウントをインクリメント
                const result = await runTransaction(counterRef, (currentCount) => {
                    return (currentCount || 0) + 1;
                });

                if (result.committed) {
                    const newCount = result.snapshot.val();
                    setCount(newCount);

                    // キリ番チェック
                    if (KIRIBAN_NUMBERS.includes(newCount) ||
                        newCount % 100 === 0 ||
                        newCount % 1000 === 0) {
                        setIsKiriban(true);
                        setShowCongrats(true);

                        // 5秒後に閉じる
                        setTimeout(() => {
                            setShowCongrats(false);
                        }, 5000);
                    }
                }
            } catch (error) {
                // カウンターが存在しない場合は取得のみ
                const snapshot = await get(counterRef);
                if (snapshot.exists()) {
                    setCount(snapshot.val());
                } else {
                    setCount(1);
                    await set(counterRef, 1);
                }
            }
        };

        incrementCounter();
    }, []);

    const formatCount = (num: number) => {
        return num.toString().padStart(6, '0');
    };

    if (count === null) return null;

    return (
        <>
            <div className={styles.counterContainer}>
                <div className={styles.counterLabel}>
                    あなたは
                </div>
                <div className={styles.counter}>
                    {formatCount(count).split('').map((digit, index) => (
                        <span key={index} className={styles.digit}>{digit}</span>
                    ))}
                </div>
                <div className={styles.counterLabel}>
                    人目の訪問者です
                </div>
            </div>

            {showCongrats && (
                <div className={styles.congratsOverlay} onClick={() => setShowCongrats(false)}>
                    <div className={styles.congratsModal}>
                        <div className={styles.congratsTitle}>
                            🎊 キリ番おめでとう！ 🎊
                        </div>
                        <div className={styles.congratsNumber}>
                            {count.toLocaleString()}
                        </div>
                        <div className={styles.congratsMessage}>
                            あなたは {count.toLocaleString()} 人目の訪問者です！
                            <br />
                            記念にスクショを撮ってね！📸
                        </div>
                        <div className={styles.sparkles}>
                            ✨🌟⭐💫✨🌟⭐💫✨
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
