'use client';

import React, { useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Avatar from '@/components/common/Avatar';
import styles from './PostCard.module.css';

interface Post {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    likes: number;
    likedBy: { [key: string]: boolean };
}

interface PostCardProps {
    post: Post;
}

export default function PostCard({ post }: PostCardProps) {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(
        user ? post.likedBy?.[user.uid] || false : false
    );
    const [likeCount, setLikeCount] = useState(post.likes || 0);

    const handleLike = async () => {
        if (!user) return;

        const newLikedState = !isLiked;
        const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;

        setIsLiked(newLikedState);
        setLikeCount(newLikeCount);

        try {
            const postRef = ref(database, `posts/${post.id}`);
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

    return (
        <article className={styles.card}>
            <div className={styles.header}>
                <Avatar src={post.userAvatar} alt={post.userName} size="md" />
                <div className={styles.userInfo}>
                    <h4 className={styles.userName}>{post.userName}</h4>
                    <time className={styles.timestamp}>{formatTime(post.timestamp)}</time>
                </div>
            </div>
            <p className={styles.content}>{post.content}</p>
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
                <button className={styles.commentButton} aria-label="コメント">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>返信</span>
                </button>
            </div>
        </article>
    );
}
