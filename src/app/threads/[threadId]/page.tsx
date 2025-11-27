'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import Navbar from '@/components/Navbar';
import styles from './page.module.css';

interface Thread {
    id: string;
    title: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
}

interface Reply {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
}

export default function ThreadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const threadId = params.threadId as string;

    const [thread, setThread] = useState<Thread | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyContent, setReplyContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!threadId) return;

        // スレッド本体を取得
        const threadRef = ref(database, `threads/${threadId}`);
        const unsubscribeThread = onValue(threadRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setThread({
                    id: threadId,
                    ...data,
                });
            } else {
                setThread(null);
            }
            setLoading(false);
        });

        // 返信を取得
        const repliesRef = ref(database, `threads/${threadId}/replies`);
        const unsubscribeReplies = onValue(repliesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const repliesArray: Reply[] = Object.entries(data)
                    .map(([id, reply]: [string, any]) => ({
                        id,
                        ...reply,
                    }))
                    .sort((a, b) => a.timestamp - b.timestamp);
                setReplies(repliesArray);
            } else {
                setReplies([]);
            }
        });

        return () => {
            unsubscribeThread();
            unsubscribeReplies();
        };
    }, [threadId]);

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !user || !threadId) return;

        setIsPosting(true);
        try {
            const repliesRef = ref(database, `threads/${threadId}/replies`);
            await push(repliesRef, {
                content: replyContent.trim(),
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                timestamp: serverTimestamp(),
            });
            setReplyContent('');
        } catch (error) {
            console.error('Error posting reply:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <p>読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <p>スレッドが見つかりません</p>
                    <Button onClick={() => router.push('/')} variant="primary">
                        スレッド一覧に戻る
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className={styles.container}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    ← 戻る
                </button>

                {/* スレッド本体 */}
                <div className={styles.threadMain}>
                    <h1 className={styles.threadTitle}>{thread.title}</h1>
                    <div className={styles.threadHeader}>
                        <Avatar src={thread.userAvatar} alt={thread.userName} size="md" />
                        <div>
                            <p className={styles.userName}>{thread.userName}</p>
                            <p className={styles.timestamp}>{formatTime(thread.timestamp)}</p>
                        </div>
                    </div>
                    <p className={styles.threadContent}>{thread.content}</p>
                </div>

                {/* 返信一覧 */}
                <div className={styles.repliesSection}>
                    <h2 className={styles.repliesTitle}>返信 ({replies.length})</h2>
                    {replies.map((reply) => (
                        <div key={reply.id} className={styles.reply}>
                            <div className={styles.replyHeader}>
                                <Avatar src={reply.userAvatar} alt={reply.userName} size="sm" />
                                <div>
                                    <p className={styles.replyUserName}>{reply.userName}</p>
                                    <p className={styles.replyTimestamp}>{formatTime(reply.timestamp)}</p>
                                </div>
                            </div>
                            <p className={styles.replyContent}>{reply.content}</p>
                        </div>
                    ))}
                </div>

                {/* 返信フォーム */}
                {user && (
                    <div className={styles.replyForm}>
                        <h3 className={styles.replyFormTitle}>返信を書く</h3>
                        <form onSubmit={handleSubmitReply}>
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="返信を書く..."
                                className={styles.textarea}
                                rows={4}
                            />
                            <div className={styles.formFooter}>
                                <Button
                                    type="submit"
                                    disabled={!replyContent.trim() || isPosting}
                                    variant="primary"
                                >
                                    {isPosting ? '投稿中...' : '返信する'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
