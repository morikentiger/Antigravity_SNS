'use client';

import { useAuth } from '@/components/AuthContext';
import PostComposer from '@/components/Post/PostComposer';
import PostFeed from '@/components/Post/PostFeed';
import Button from '@/components/common/Button';
import styles from './page.module.css';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ref, push } from 'firebase/database';
import { database } from '@/lib/firebase';

const CATEGORY_NAMES: Record<string, string> = {
    'mobile-portrait': 'スマホ（縦画面）',
    'mobile-landscape': 'スマホ（横画面）',
    'pc': 'PC',
};

export default function Home() {
    const { user, signInWithGoogle, loading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isCreatingThread, setIsCreatingThread] = useState(false);

    // URLパラメータからスコア情報を受け取り、自動的にスレッドを作成
    useEffect(() => {
        const score = searchParams.get('score');
        const game = searchParams.get('game');
        const category = searchParams.get('category');

        if (score && game && user && !isCreatingThread) {
            setIsCreatingThread(true);

            const createScoreThread = async () => {
                try {
                    const threadsRef = ref(database, 'threads');
                    const categoryName = category ? CATEGORY_NAMES[category] || category : '一般';

                    await push(threadsRef, {
                        title: `${game}でハイスコア達成！`,
                        content: `スコア： ${score}点\n部門： ${categoryName}`,
                        userId: user.uid,
                        userName: user.displayName || 'Anonymous',
                        userAvatar: user.photoURL || '',
                        timestamp: Date.now(),
                        game: game,
                        score: parseInt(score),
                        category: category || 'general',
                    });

                    // URLパラメータをクリアしてランキングページにリダイレクト
                    router.push('/ranking');
                } catch (error) {
                    console.error('Error creating score thread:', error);
                    setIsCreatingThread(false);
                }
            };

            createScoreThread();
        }
    }, [searchParams, user, isCreatingThread, router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>読み込み中...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.welcome}>
                <div className={styles.hero}>
                    <h1>Antigravity</h1>
                    <p className={styles.tagline}>自由でおかしいSNS体験</p>
                    <p className={styles.description}>
                        投稿して、音声ルームで話して、DMで繋がろう。<br />
                        重力に逆らって、自由に楽しもう。
                    </p>
                    <Button onClick={signInWithGoogle} variant="primary" size="lg">
                        Googleでログイン
                    </Button>
                </div>
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>📝</div>
                        <h3>投稿機能</h3>
                        <p>思いついたことを自由に投稿しよう</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>🎤</div>
                        <h3>音声ルーム</h3>
                        <p>リアルタイムで会話を楽しもう</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>💬</div>
                        <h3>DM機能</h3>
                        <p>1対1で深い会話をしよう</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.main}>
                <PostComposer />
                <PostFeed />
            </div>
        </div>
    );
}
