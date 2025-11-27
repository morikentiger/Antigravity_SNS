'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { database } from '@/lib/firebase';
import PostCard from './PostCard';
import styles from './PostFeed.module.css';

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
    lastReplyTime?: number;
}

export default function PostFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const threadsRef = query(
            ref(database, 'threads'),
            orderByChild('timestamp')
        );

        const unsubscribe = onValue(threadsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const postsArray: Post[] = Object.entries(data)
                    .map(([id, post]: [string, any]) => ({
                        id,
                        title: post.title || '',
                        content: post.content,
                        userId: post.userId,
                        userName: post.userName,
                        userAvatar: post.userAvatar,
                        timestamp: post.timestamp,
                        likes: post.likes || 0,
                        likedBy: post.likedBy || {},
                        replyCount: post.replyCount || 0,
                        lastReplyTime: post.lastReplyTime,
                    }))
                    .sort((a, b) => {
                        // 最終返信時刻でソート（返信があればそれを、なければ作成時刻を使う）
                        const aTime = a.lastReplyTime || a.timestamp;
                        const bTime = b.lastReplyTime || b.timestamp;
                        return bTime - aTime;
                    });
                setPosts(postsArray);
            } else {
                setPosts([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className={styles.loading}>読み込み中...</div>;
    }

    if (posts.length === 0) {
        return <div className={styles.empty}>まだスレッドがありません</div>;
    }

    return (
        <div className={styles.feed}>
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
