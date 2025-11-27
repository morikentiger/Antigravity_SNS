'use client';

import React, { useState } from 'react';
import { ref, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import styles from './PostComposer.module.css';

export default function PostComposer() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const { user } = useAuth();
    const maxTitleLength = 100;
    const maxContentLength = 500;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim() || !user) return;

        setIsPosting(true);
        try {
            const threadsRef = ref(database, 'threads');
            await push(threadsRef, {
                title: title.trim(),
                content: content.trim(),
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                timestamp: serverTimestamp(),
                likes: 0,
                likedBy: {},
                replyCount: 0,
            });
            setTitle('');
            setContent('');
        } catch (error) {
            console.error('Error creating thread:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const remainingTitleChars = maxTitleLength - title.length;
    const remainingContentChars = maxContentLength - content.length;
    const isTitleOverLimit = remainingTitleChars < 0;
    const isContentOverLimit = remainingContentChars < 0;

    return (
        <div className={styles.composer}>
            <div className={styles.header}>
                <Avatar src={user?.photoURL || ''} alt={user?.displayName || 'User'} size="md" />
                <h3>スレッドを立てる</h3>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="スレッドのタイトル（話題）"
                        className={styles.titleInput}
                        maxLength={maxTitleLength}
                    />
                    <span className={`${styles.counter} ${isTitleOverLimit ? styles.overLimit : ''}`}>
                        {remainingTitleChars}
                    </span>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="スレッドの内容を書こう..."
                    className={styles.textarea}
                    rows={4}
                />
                <div className={styles.footer}>
                    <span className={`${styles.counter} ${isContentOverLimit ? styles.overLimit : ''}`}>
                        {remainingContentChars}
                    </span>
                    <Button
                        type="submit"
                        disabled={!title.trim() || !content.trim() || isTitleOverLimit || isContentOverLimit || isPosting}
                        variant="primary"
                    >
                        {isPosting ? '作成中...' : 'スレッドを立てる'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
