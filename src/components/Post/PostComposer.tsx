'use client';

import React, { useState } from 'react';
import { ref, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import styles from './PostComposer.module.css';

export default function PostComposer() {
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { user } = useAuth();
    const maxLength = 280;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setIsPosting(true);
        try {
            const postsRef = ref(database, 'posts');
            await push(postsRef, {
                content: content.trim(),
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                timestamp: serverTimestamp(),
                likes: 0,
                likedBy: {},
            });
            setContent('');
        } catch (error) {
            console.error('Error posting:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const remainingChars = maxLength - content.length;
    const isOverLimit = remainingChars < 0;

    return (
        <div className={styles.composer}>
            <div className={styles.header}>
                <Avatar src={user?.photoURL || ''} alt={user?.displayName || 'User'} size="md" />
                <h3>投稿する</h3>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="今何してる？何考えてる？自由に投稿しよう..."
                    className={styles.textarea}
                    rows={4}
                />
                <div className={styles.footer}>
                    <span className={`${styles.counter} ${isOverLimit ? styles.overLimit : ''}`}>
                        {remainingChars}
                    </span>
                    <Button
                        type="submit"
                        disabled={!content.trim() || isOverLimit || isPosting}
                        variant="primary"
                    >
                        {isPosting ? '投稿中...' : '投稿'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
