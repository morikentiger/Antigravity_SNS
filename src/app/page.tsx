'use client';

import { useAuth } from '@/components/AuthContext';
import PostComposer from '@/components/Post/PostComposer';
import PostFeed from '@/components/Post/PostFeed';
import Button from '@/components/common/Button';
import styles from './page.module.css';

export default function Home() {
    const { user, signInWithGoogle, loading } = useAuth();

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
