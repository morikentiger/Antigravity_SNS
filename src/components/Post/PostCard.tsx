'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ref, set, get, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import { Linkify } from '@/components/common/Linkify';
import { calculateUserDataFromPost } from '@/lib/sentiment';
import styles from './PostCard.module.css';

interface Post {
    id: string;
    title: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    likes: number;
    likedBy: { [key: string]: boolean };
    replyCount?: number;
    imageUrl?: string;
}

interface PostCardProps {
    post: Post;
}

export default function PostCard({ post }: PostCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isLiked, setIsLiked] = useState(
        user ? post.likedBy?.[user.uid] || false : false
    );
    const [likeCount, setLikeCount] = useState(post.likes || 0);

    const handleCardClick = () => {
        router.push(`/threads/${post.id}`);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        const newLikedState = !isLiked;
        const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;

        setIsLiked(newLikedState);
        setLikeCount(newLikeCount);

        try {
            const postRef = ref(database, `threads/${post.id}`);
            const snapshot = await get(postRef);
            const currentPost = snapshot.val();

            const updatedLikedBy = { ...(currentPost.likedBy || {}) };
            if (newLikedState) {
                updatedLikedBy[user.uid] = true;
            } else {
                delete updatedLikedBy[user.uid];
            }

            await set(postRef, {
                ...currentPost,
                likes: newLikeCount,
                likedBy: updatedLikedBy,
            });
        } catch (error) {
            console.error('Error liking post:', error);
            setIsLiked(!newLikedState);
            setLikeCount(newLikedState ? likeCount - 1 : likeCount + 1);
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        return `${days}日前`;
    };

    // Calculate simple background gradient based on sentiment
    const userData = calculateUserDataFromPost({
        content: post.content,
        likes: likeCount,
        replyCount: post.replyCount,
        reports: []
    });

    // Generate background style and weather based on mood and stress
    const getWeatherState = () => {
        const mood = userData.moodScore / 100; // 0-1
        const stress = Math.min(userData.reportCount / 10, 1); // 0-1
        const negativeSentiment = userData.negativeSentiment; // 0-1

        // Weather conditions (adjusted for more variety)
        // 晴れ (Sunny): mood > 0.7 AND stress < 0.3 (より厳しく)
        // 曇り (Cloudy): mood 0.4-0.7 OR stress 0.3-0.6 (より広く)
        // 雨 (Rainy): mood < 0.4 OR stress 0.6-0.75
        // 雷雨 (Thunderstorm): stress > 0.75 OR (mood < 0.25 AND negativeSentiment > 0.4)

        let weather = 'cloudy'; // デフォルトを曇りに変更

        if (stress > 0.75 || (mood < 0.25 && negativeSentiment > 0.4)) {
            weather = 'thunderstorm';
        } else if (mood < 0.4 || stress > 0.6) {
            weather = 'rainy';
        } else if (mood > 0.7 && stress < 0.3) {
            weather = 'sunny'; // 晴れは高い気分が必要
        }
        // それ以外は曇り

        return { mood, stress, weather };
    };

    const getStatusBackgroundStyle = () => {
        const { mood, stress, weather } = getWeatherState();

        // Sky color based on weather
        let skyColor1, skyColor2;

        switch (weather) {
            case 'sunny':
                // Bright blue sky
                skyColor1 = 'hsl(200, 80%, 75%)';
                skyColor2 = 'hsl(200, 70%, 65%)';
                break;
            case 'cloudy':
                // Gray-blue sky
                skyColor1 = 'hsl(200, 40%, 60%)';
                skyColor2 = 'hsl(200, 35%, 50%)';
                break;
            case 'rainy':
                // Dark gray sky
                skyColor1 = 'hsl(200, 30%, 45%)';
                skyColor2 = 'hsl(200, 25%, 35%)';
                break;
            case 'thunderstorm':
                // Very dark, stormy sky
                skyColor1 = 'hsl(200, 20%, 30%)';
                skyColor2 = 'hsl(200, 15%, 20%)';
                break;
            default:
                skyColor1 = 'hsl(200, 60%, 70%)';
                skyColor2 = 'hsl(200, 50%, 60%)';
        }

        // Cloud coverage
        const cloudOpacity = weather === 'sunny' ? 0.1 :
            weather === 'cloudy' ? 0.5 :
                weather === 'rainy' ? 0.7 : 0.85;

        return {
            background: `
                linear-gradient(
                    to bottom,
                    ${skyColor1},
                    ${skyColor2}
                ),
                radial-gradient(
                    ellipse at top,
                    rgba(255, 255, 255, ${cloudOpacity}),
                    transparent 60%
                )
            `,
            filter: weather === 'thunderstorm' ? 'brightness(0.7)' : 'none',
            transition: 'all 2s ease'
        };
    };

    const getWeatherIcon = () => {
        const { weather } = getWeatherState();

        const icons = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            thunderstorm: '⛈️'
        };

        return icons[weather as keyof typeof icons];
    };

    return (
        <article className={styles.card} onClick={handleCardClick} style={{ cursor: 'pointer' }}>
            {/* STATUS Background Layer - Weather Expression */}
            <div
                className={styles.statusBackground}
                style={getStatusBackgroundStyle()}
            >
                {/* Sun for sunny weather */}
                {getWeatherState().weather === 'sunny' && (
                    <div className={styles.sun} />
                )}

                {/* Flower field for sunny weather */}
                {getWeatherState().weather === 'sunny' && (
                    <div className={styles.flowerField}>
                        {[...Array(15)].map((_, i) => (
                            <div
                                key={i}
                                className={styles.flower}
                                style={{
                                    left: `${5 + (i * 6)}%`,
                                    bottom: `${Math.random() * 15}%`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            >
                                🌸
                            </div>
                        ))}
                    </div>
                )}

                {/* Rain effect for rainy/thunderstorm weather */}
                {(getWeatherState().weather === 'rainy' || getWeatherState().weather === 'thunderstorm') && (
                    <div className={styles.rainEffect}>
                        {[...Array(getWeatherState().weather === 'thunderstorm' ? 30 : 20)].map((_, i) => (
                            <div
                                key={i}
                                className={styles.rainDrop}
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${0.5 + Math.random() * 0.5}s`
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Lightning flash for thunderstorm */}
                {getWeatherState().weather === 'thunderstorm' && (
                    <div className={styles.lightning} />
                )}
            </div>

            {/* コンテンツレイヤー */}
            <div className={styles.contentLayer}>
                <div className={styles.header}>
                    <Avatar src={post.userAvatar} alt={post.userName} size="md" />
                    <div className={styles.userInfo}>
                        <h4 className={styles.userName}>{post.userName}</h4>
                        <time className={styles.timestamp}>{formatTime(post.timestamp)}</time>
                    </div>
                </div>

                {post.title && <h4 className={styles.title}>{post.title}</h4>}
                <p className={styles.content} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <Linkify>{post.content}</Linkify>
                </p>
            </div>

            <div className={styles.actions}>
                <button
                    onClick={handleLike}
                    className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
                    aria-label="いいね"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span>{likeCount}</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/threads/${post.id}`);
                    }}
                    className={styles.commentButton}
                    aria-label="コメント"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>返信 {post.replyCount || 0}</span>
                </button>

                {/* 画像添付バッジ (Simple) */}
                {post.imageUrl && (
                    <div
                        className={styles.imageBadge}
                        title="画像あり"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                )}

                {user && user.uid === post.userId && (
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('本当にこの投稿を削除しますか？')) {
                                try {
                                    await remove(ref(database, `threads/${post.id}`));
                                } catch (error) {
                                    console.error('Error deleting post:', error);
                                    alert('削除に失敗しました');
                                }
                            }
                        }}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors ml-auto"
                        aria-label="削除"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                )}
            </div>
        </article>
    );
}
