'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import PostCard from '@/components/Post/PostCard';
import styles from './page.module.css';

interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string;
    bio?: string;
}

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

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const userId = params.userId as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const loadUserProfile = async () => {
            try {
                // Load user profile
                const userRef = ref(database, `users/${userId}`);
                const userSnapshot = await get(userRef);

                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    setProfile({
                        uid: userId,
                        displayName: userData.displayName || 'Unknown User',
                        photoURL: userData.photoURL || '',
                        bio: userData.bio || '',
                    });
                } else {
                    // Try to get from threads if not in users
                    const threadsRef = ref(database, 'threads');
                    const threadsSnapshot = await get(threadsRef);

                    if (threadsSnapshot.exists()) {
                        const threads = threadsSnapshot.val();
                        const userThread = Object.values(threads).find(
                            (thread: any) => thread.userId === userId
                        ) as any;

                        if (userThread) {
                            setProfile({
                                uid: userId,
                                displayName: userThread.userName || 'Unknown User',
                                photoURL: userThread.userAvatar || '',
                                bio: '',
                            });
                        }
                    }
                }

                // Load user's posts
                const threadsRef = ref(database, 'threads');
                const threadsSnapshot = await get(threadsRef);

                if (threadsSnapshot.exists()) {
                    const threadsData = threadsSnapshot.val();
                    const userPosts: Post[] = [];

                    Object.entries(threadsData).forEach(([id, post]: [string, any]) => {
                        if (post.userId === userId) {
                            userPosts.push({
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
                                imageUrl: post.imageUrl || null,
                            });
                        }
                    });

                    // Sort by timestamp (newest first)
                    userPosts.sort((a, b) => b.timestamp - a.timestamp);
                    setPosts(userPosts);
                }
            } catch (error) {
                console.error('Error loading user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserProfile();
    }, [userId]);

    const handleSendMessage = () => {
        if (!profile) return;

        const params = new URLSearchParams({
            name: profile.displayName,
            avatar: profile.photoURL || '',
        });
        router.push(`/messages/${userId}?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>読み込み中...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>
                    <h2>ユーザーが見つかりません</h2>
                    <Button onClick={() => router.push('/')} variant="primary">
                        ホームに戻る
                    </Button>
                </div>
            </div>
        );
    }

    const isOwnProfile = currentUser?.uid === userId;

    return (
        <div className={styles.container}>
            <div className={styles.profileCard}>
                <div className={styles.profileHeader}>
                    <Avatar src={profile.photoURL} alt={profile.displayName} size="lg" />
                    <div className={styles.profileInfo}>
                        <h1 className={styles.displayName}>{profile.displayName}</h1>
                        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                        <div className={styles.stats}>
                            <span className={styles.stat}>
                                <strong>{posts.length}</strong> 投稿
                            </span>
                        </div>
                    </div>
                </div>

                {!isOwnProfile && currentUser && (
                    <div className={styles.actions}>
                        <Button onClick={handleSendMessage} variant="primary" size="lg">
                            💬 メッセージを送る
                        </Button>
                    </div>
                )}
            </div>

            <div className={styles.postsSection}>
                <h2 className={styles.sectionTitle}>投稿一覧</h2>
                {posts.length === 0 ? (
                    <div className={styles.empty}>
                        <p>まだ投稿がありません</p>
                    </div>
                ) : (
                    <div className={styles.postsList}>
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
