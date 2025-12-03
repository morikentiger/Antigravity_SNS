'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Avatar from '@/components/common/Avatar';
import styles from './page.module.css';

interface ScoreEntry {
    id: string;
    game: string;
    score: number;
    userName: string;
    userAvatar: string;
    userId: string;
    timestamp: number;
    threadId: string;
    category?: string;
    categoryName?: string;
}

const CATEGORY_NAMES: Record<string, string> = {
    'mobile-portrait': 'スマホ（縦画面）',
    'mobile-landscape': 'スマホ（横画面）',
    'pc': 'PC',
    'general': '一般',
};

export default function RankingPage() {
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const threadsRef = ref(database, 'threads');

        const unsubscribe = onValue(threadsRef, (snapshot) => {
            const data = snapshot.val();
            const scoresArray: ScoreEntry[] = [];

            if (data) {
                Object.entries(data).forEach(([id, thread]: [string, any]) => {
                    // スコア情報を含む投稿を検出
                    const scoreMatch = thread.content?.match(/スコア[：:]\s*(\d+)点/);
                    const gameMatch = thread.title?.match(/(.+)でハイスコア達成！/);

                    if (scoreMatch && gameMatch) {
                        const category = thread.category || 'general';
                        scoresArray.push({
                            id,
                            game: gameMatch[1],
                            score: parseInt(scoreMatch[1]),
                            userName: thread.userName,
                            userAvatar: thread.userAvatar,
                            userId: thread.userId,
                            timestamp: thread.timestamp,
                            threadId: id,
                            category: category,
                            categoryName: CATEGORY_NAMES[category] || category,
                        });
                    }
                });
            }

            // スコアの高い順にソート
            scoresArray.sort((a, b) => b.score - a.score);
            setScores(scoresArray);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ゲームの一覧を取得
    const games = ['all', ...Array.from(new Set(scores.map(s => s.game)))];

    // 部門の一覧を取得
    const categories = ['all', ...Array.from(new Set(scores.map(s => s.category || 'general')))];

    // フィルタリングされたスコア
    let filteredScores = scores;

    if (selectedGame !== 'all') {
        filteredScores = filteredScores.filter(s => s.game === selectedGame);
    }

    if (selectedCategory !== 'all') {
        filteredScores = filteredScores.filter(s => (s.category || 'general') === selectedCategory);
    }

    // ゲームごとのトップスコアを取得
    const topScoresByGame = new Map<string, ScoreEntry>();
    scores.forEach(score => {
        if (!topScoresByGame.has(score.game) ||
            topScoresByGame.get(score.game)!.score < score.score) {
            topScoresByGame.set(score.game, score);
        }
    });

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🏆 ハイスコアランキング</h1>
                    <p className={styles.subtitle}>ゲームのハイスコアを競おう！</p>
                    <a
                        href="https://morikentiger.github.io/BreakBlockBuild/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.playButton}
                    >
                        🎮 ゲームをプレイ
                    </a>
                </div>

                {/* ゲーム選択タブ */}
                <div className={styles.tabs}>
                    {games.map(game => (
                        <button
                            key={game}
                            onClick={() => setSelectedGame(game)}
                            className={`${styles.tab} ${selectedGame === game ? styles.activeTab : ''}`}
                        >
                            {game === 'all' ? '全て' : game}
                        </button>
                    ))}
                </div>

                {/* 部門選択タブ */}
                <div className={styles.tabs}>
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`${styles.tab} ${selectedCategory === category ? styles.activeTab : ''}`}
                        >
                            {category === 'all' ? '全部門' : CATEGORY_NAMES[category] || category}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.loading}>読み込み中...</div>
                ) : filteredScores.length === 0 ? (
                    <div className={styles.empty}>
                        <p>まだスコアが投稿されていません</p>
                        <p className={styles.emptySubtext}>ゲームをプレイしてハイスコアを投稿しよう！</p>
                    </div>
                ) : (
                    <div className={styles.rankingList}>
                        {filteredScores.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`${styles.rankItem} ${index < 3 ? styles[`rank${index + 1}`] : ''}`}
                                onClick={() => window.location.href = `/threads/${entry.threadId}`}
                            >
                                <div className={styles.rank}>
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                    {index > 2 && `${index + 1}位`}
                                </div>
                                <Avatar src={entry.userAvatar} alt={entry.userName} size="md" />
                                <div className={styles.info}>
                                    <div className={styles.userName}>{entry.userName}</div>
                                    <div className={styles.game}>{entry.game}</div>
                                    {entry.categoryName && (
                                        <div className={styles.category}>📱 {entry.categoryName}</div>
                                    )}
                                </div>
                                <div className={styles.scoreSection}>
                                    <div className={styles.score}>{entry.score.toLocaleString()}点</div>
                                    <div className={styles.date}>{formatTime(entry.timestamp)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 各ゲームのチャンピオン */}
                {selectedGame === 'all' && topScoresByGame.size > 0 && (
                    <div className={styles.championsSection}>
                        <h2 className={styles.championsTitle}>🎮 各ゲームのチャンピオン</h2>
                        <div className={styles.championsList}>
                            {Array.from(topScoresByGame.entries()).map(([game, entry]) => (
                                <div key={game} className={styles.championCard}>
                                    <div className={styles.championGame}>{game}</div>
                                    <Avatar src={entry.userAvatar} alt={entry.userName} size="lg" />
                                    <div className={styles.championName}>{entry.userName}</div>
                                    <div className={styles.championScore}>{entry.score.toLocaleString()}点</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
