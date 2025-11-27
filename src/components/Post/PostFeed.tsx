'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '@/lib/firebase';
import PostCard from './PostCard';
import styles from './PostFeed.module.css';

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

export default function PostFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const postsRef = ref(database, 'posts');
        const postsQuery = query(postsRef, orderByChild('timestamp'), limitToLast(50));

        const unsubscribe = onValue(postsQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const postsArray: Post[] = Object.entries(data).map(([id, post]: [string, any]) => ({
                    id,
                    ...post,
                }));
                postsArray.sort((a, b) => b.timestamp - a.timestamp);
                setPosts(postsArray);
            } else {
                setPosts([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>読み込み中...</p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className={styles.empty}>
                <p>まだ投稿がありません</p>
                <p className={styles.emptySubtext}>最初の投稿をしてみましょう！</p>
            </div>
        );
    }

    return (
        <div className={styles.feed}>
            {posts.map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </div>
    );
}
