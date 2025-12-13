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
    authorType?: 'user' | 'yui';  // YUi返信かどうか
    masterUserId?: string;        // YUi返信の場合、マスターユーザーID
    replyToId?: string;           // どの返信に対する返信か
    replyToUserName?: string;     // 返信先のユーザー名
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

    // YUi Assist states
    const [showYuiModal, setShowYuiModal] = useState(false);
    const [yuiSuggestions, setYuiSuggestions] = useState<{
        summary: string;
        emotion: string;
        encourage: string;
    } | null>(null);
    const [isLoadingYui, setIsLoadingYui] = useState(false);
    const [isPostingYui, setIsPostingYui] = useState(false);
    const [yuiReplyTarget, setYuiReplyTarget] = useState<{ type: 'post' | 'reply'; content: string; userName?: string; replyId?: string } | null>(null);

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

    // YUi Assist機能（投稿対象）
    const handleYuiAssist = async () => {
        if (!thread) return;

        setIsLoadingYui(true);
        setShowYuiModal(true);
        setYuiReplyTarget({ type: 'post', content: `${thread.title}\n${thread.content}` });

        try {
            const response = await fetch('/api/yui/assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `${thread.title}\n${thread.content}`
                }),
            });

            if (!response.ok) throw new Error('API call failed');

            const data = await response.json();
            setYuiSuggestions(data);
        } catch (error) {
            console.error('YUi assist error:', error);
            alert('YUiの提案を取得できませんでした');
            setShowYuiModal(false);
        } finally {
            setIsLoadingYui(false);
        }
    };

    // YUi Assist機能（返信対象）
    const handleYuiAssistForReply = async (reply: Reply) => {
        setIsLoadingYui(true);
        setShowYuiModal(true);
        setYuiReplyTarget({ type: 'reply', content: reply.content, userName: reply.userName, replyId: reply.id });

        try {
            const response = await fetch('/api/yui/assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: reply.content,
                    context: `${reply.userName}さんの返信に対して`
                }),
            });

            if (!response.ok) throw new Error('API call failed');

            const data = await response.json();
            setYuiSuggestions(data);
        } catch (error) {
            console.error('YUi assist error:', error);
            alert('YUiの提案を取得できませんでした');
            setShowYuiModal(false);
        } finally {
            setIsLoadingYui(false);
        }
    };

    const handleYuiReply = async (content: string) => {
        if (!user || !threadId || !thread) return;

        setIsPostingYui(true);
        try {
            // Firebase Realtime Databaseから最新のプロフィール情報を取得
            const userDbRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userDbRef);
            const userData = userSnapshot.val();
            const userName = userData?.displayName || user.displayName || 'Anonymous';
            const yuiName = userData?.yuiName || 'YUi';
            const yuiAvatar = userData?.yuiAvatar || '/yui-avatar.png';

            const repliesRef = ref(database, `threads/${threadId}/replies`);
            const replyData: any = {
                content: content,
                userId: user.uid,
                userName: `${yuiName}（${userName}のYUi）`,
                userAvatar: yuiAvatar,
                timestamp: serverTimestamp(),
                authorType: 'yui',
                masterUserId: user.uid,
            };

            // 返信対象がある場合は参照情報を追加
            if (yuiReplyTarget?.type === 'reply' && yuiReplyTarget.replyId) {
                replyData.replyToId = yuiReplyTarget.replyId;
                replyData.replyToUserName = yuiReplyTarget.userName;
            }

            await push(repliesRef, replyData);

            // スレッドのメタデータを更新
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

            setShowYuiModal(false);
            setYuiSuggestions(null);
        } catch (error) {
            console.error('Error posting YUi reply:', error);
            alert('YUi返信の投稿に失敗しました');
        } finally {
            setIsPostingYui(false);
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

                    {/* YUi Assist Button */}
                    {user && (
                        <button
                            className={styles.yuiAssistButton}
                            onClick={handleYuiAssist}
                            disabled={isLoadingYui}
                        >
                            ✨ YUiに一言補足してもらう
                        </button>
                    )}
                </div>

                {/* 返信一覧 */}
                <div className={styles.repliesSection}>
                    <h2 className={styles.repliesTitle}>返信 ({replies.length})</h2>
                    {replies.map((reply) => (
                        <div key={reply.id} id={`reply-${reply.id}`} className={styles.reply}>
                            {/* 返信先リンク */}
                            {reply.replyToId && reply.replyToUserName && (
                                <button
                                    className={styles.replyToLink}
                                    onClick={() => {
                                        const element = document.getElementById(`reply-${reply.replyToId}`);
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            element.classList.add(styles.replyHighlight);
                                            setTimeout(() => element.classList.remove(styles.replyHighlight), 2000);
                                        }
                                    }}
                                >
                                    ↩️ {reply.replyToUserName}さんへの返信
                                </button>
                            )}
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
                                {/* 返信主またはYUi返信のマスターのみ削除ボタンを表示 */}
                                {user && (
                                    (user.uid === reply.userId) ||
                                    (reply.authorType === 'yui' && user.uid === reply.masterUserId)
                                ) && (
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
                            {/* YUi返信ボタン（自分のYUi返信以外に表示） */}
                            {user && !(reply.authorType === 'yui' && reply.masterUserId === user.uid) && (
                                <button
                                    className={styles.yuiReplyButton}
                                    onClick={() => handleYuiAssistForReply(reply)}
                                    disabled={isLoadingYui}
                                >
                                    ✨ YUiからの返信
                                </button>
                            )}
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

                {/* YUi Assist Modal */}
                {showYuiModal && (
                    <div className={styles.modalOverlay} onClick={() => { setShowYuiModal(false); setYuiSuggestions(null); setYuiReplyTarget(null); }}>
                        <div className={styles.yuiModal} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.yuiModalTitle}>
                                {yuiReplyTarget?.type === 'reply'
                                    ? `✨ ${yuiReplyTarget.userName}さんへのYUi返信`
                                    : '✨ YUiの提案'}
                            </h3>
                            {isLoadingYui ? (
                                <p className={styles.yuiModalLoading}>考え中...</p>
                            ) : yuiSuggestions ? (
                                <div className={styles.yuiSuggestions}>
                                    <div className={styles.yuiSuggestionItem}>
                                        <span className={styles.yuiLabel}>📝 要約</span>
                                        <p className={styles.yuiContent}>{yuiSuggestions.summary}</p>
                                        <button
                                            className={styles.yuiSelectButton}
                                            onClick={() => handleYuiReply(yuiSuggestions.summary)}
                                            disabled={isPostingYui}
                                        >
                                            これで返信
                                        </button>
                                    </div>
                                    <div className={styles.yuiSuggestionItem}>
                                        <span className={styles.yuiLabel}>💭 気持ち</span>
                                        <p className={styles.yuiContent}>{yuiSuggestions.emotion}</p>
                                        <button
                                            className={styles.yuiSelectButton}
                                            onClick={() => handleYuiReply(yuiSuggestions.emotion)}
                                            disabled={isPostingYui}
                                        >
                                            これで返信
                                        </button>
                                    </div>
                                    <div className={styles.yuiSuggestionItem}>
                                        <span className={styles.yuiLabel}>🌟 応援</span>
                                        <p className={styles.yuiContent}>{yuiSuggestions.encourage}</p>
                                        <button
                                            className={styles.yuiSelectButton}
                                            onClick={() => handleYuiReply(yuiSuggestions.encourage)}
                                            disabled={isPostingYui}
                                        >
                                            これで返信
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            <button
                                className={styles.yuiCloseButton}
                                onClick={() => { setShowYuiModal(false); setYuiSuggestions(null); }}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
