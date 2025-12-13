'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, push, serverTimestamp, get, set, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import UserProfilePopup from '@/components/common/UserProfilePopup';
import Button from '@/components/common/Button';
import { Linkify } from '@/components/common/Linkify';

import styles from './page.module.css';

interface Thread {
    id: string;
    title: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    imageUrl?: string;
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
    const [deleteReplyId, setDeleteReplyId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
            // Firebase Realtime Databaseから最新のプロフィール情報を取得
            const userDbRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userDbRef);
            const userData = userSnapshot.val();

            // 最新のプロフィール情報を使用（なければFirebase Authから）
            const userName = userData?.displayName || user.displayName || 'Anonymous';
            const userAvatar = userData?.photoURL || user.photoURL || '';

            const repliesRef = ref(database, `threads/${threadId}/replies`);
            await push(repliesRef, {
                content: replyContent.trim(),
                userId: user.uid,
                userName: userName,
                userAvatar: userAvatar,
                timestamp: serverTimestamp(),
            });

            // 実際の返信数を数えてスレッドのメタデータを更新
            const repliesSnapshot = await get(repliesRef);
            const repliesData = repliesSnapshot.val();
            const actualReplyCount = repliesData ? Object.keys(repliesData).length : 0;

            const threadRef = ref(database, `threads/${threadId}`);
            const threadSnapshot = await get(threadRef);
            const threadData = threadSnapshot.val();

            if (threadData) {
                await set(threadRef, {
                    ...threadData,
                    replyCount: actualReplyCount,
                    lastReplyTime: Date.now(),
                });
            }

            setReplyContent('');
        } catch (error) {
            console.error('Error posting reply:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!threadId || isDeleting) return;

        setIsDeleting(true);
        try {
            // 返信を削除
            const replyRef = ref(database, `threads/${threadId}/replies/${replyId}`);
            await remove(replyRef);

            // スレッドの返信数を更新
            const repliesRef = ref(database, `threads/${threadId}/replies`);
            const repliesSnapshot = await get(repliesRef);
            const repliesData = repliesSnapshot.val();
            const actualReplyCount = repliesData ? Object.keys(repliesData).length : 0;

            const threadRef = ref(database, `threads/${threadId}`);
            const threadSnapshot = await get(threadRef);
            const threadData = threadSnapshot.val();

            if (threadData) {
                await set(threadRef, {
                    ...threadData,
                    replyCount: actualReplyCount,
                });
            }
        } catch (error) {
            console.error('Error deleting reply:', error);
            alert('返信の削除に失敗しました');
        } finally {
            setIsDeleting(false);
            setDeleteReplyId(null);
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
                <div className="flex items-center justify-center h-96">
                    <p>読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
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
            <div className={styles.container}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    ← 戻る
                </button>


                {/* スレッド本体 */}
                <div className={styles.threadMain}>
                    <h1 className={styles.threadTitle}>{thread.title}</h1>
                    <div className={styles.threadHeader}>
                        <UserProfilePopup
                            userId={thread.userId}
                            userName={thread.userName}
                            userAvatar={thread.userAvatar}
                            size="md"
                            currentUserId={user?.uid}
                        />
                        <div>
                            <p className={styles.userName}>{thread.userName}</p>
                            <p className={styles.timestamp}>{formatTime(thread.timestamp)}</p>
                        </div>
                    </div>
                    <p className={styles.threadContent}>
                        <Linkify>{thread.content}</Linkify>
                    </p>

                    {/* Display image if available */}
                    {thread.imageUrl && (
                        <div className={styles.threadImage}>
                            <img src={thread.imageUrl} alt="スレッド画像" />
                        </div>
                    )}
                </div>

                {/* 返信一覧 */}
                <div className={styles.repliesSection}>
                    <h2 className={styles.repliesTitle}>返信 ({replies.length})</h2>
                    {replies.map((reply) => (
                        <div key={reply.id} className={styles.reply}>
                            <div className={styles.replyHeader}>
                                <UserProfilePopup
                                    userId={reply.userId}
                                    userName={reply.userName}
                                    userAvatar={reply.userAvatar}
                                    size="sm"
                                    currentUserId={user?.uid}
                                />
                                <div className={styles.replyUserInfo}>
                                    <p className={styles.replyUserName}>{reply.userName}</p>
                                    <p className={styles.replyTimestamp}>{formatTime(reply.timestamp)}</p>
                                </div>
                                {/* 返信主のみ削除ボタンを表示 */}
                                {user && user.uid === reply.userId && (
                                    <button
                                        className={styles.deleteReplyButton}
                                        onClick={() => setDeleteReplyId(reply.id)}
                                        title="この返信を削除"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                            <p className={styles.replyContent}>
                                <Linkify>{reply.content}</Linkify>
                            </p>
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

                {/* 削除確認モーダル */}
                {deleteReplyId && (
                    <div className={styles.modalOverlay} onClick={() => setDeleteReplyId(null)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>返信を削除しますか？</h3>
                            <p className={styles.modalText}>この操作は取り消せません。</p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.modalCancelButton}
                                    onClick={() => setDeleteReplyId(null)}
                                    disabled={isDeleting}
                                >
                                    キャンセル
                                </button>
                                <button
                                    className={styles.modalDeleteButton}
                                    onClick={() => handleDeleteReply(deleteReplyId)}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? '削除中...' : '削除する'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
