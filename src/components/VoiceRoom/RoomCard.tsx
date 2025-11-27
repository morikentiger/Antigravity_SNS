'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import styles from './RoomCard.module.css';

interface Room {
    id: string;
    name: string;
    topic: string;
    participants: number;
    maxParticipants: number;
    createdBy: string;
}

interface RoomCardProps {
    room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleJoin = () => {
        router.push(`/rooms/${room.id}`);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await remove(ref(database, `rooms/${room.id}`));
            // 削除後は自動的にリストから消える
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('ルームの削除に失敗しました');
        } finally {
            setShowDeleteModal(false);
        }
    };

    const isFull = room.participants >= room.maxParticipants;

    return (
        <>
            <div className={styles.card}>
                <div className={styles.content}>
                    <h3 className={styles.title}>{room.name}</h3>
                    <p className={styles.topic}>{room.topic}</p>
                    <div className={styles.footer}>
                        <div className={styles.participants}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span>
                                {room.participants}/{room.maxParticipants}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {user && user.uid === room.createdBy && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="px-3 py-1 bg-red-900/50 text-red-200 rounded-md text-sm hover:bg-red-900 transition-colors"
                                >
                                    解散
                                </button>
                            )}
                            <button
                                onClick={handleJoin}
                                disabled={isFull}
                                className={styles.joinButton}
                            >
                                {isFull ? '満室' : '参加'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className={styles.waveform}>
                    <div className={styles.wave} style={{ animationDelay: '0s' }}></div>
                    <div className={styles.wave} style={{ animationDelay: '0.1s' }}></div>
                    <div className={styles.wave} style={{ animationDelay: '0.2s' }}></div>
                    <div className={styles.wave} style={{ animationDelay: '0.3s' }}></div>
                </div>
            </div>

            {/* 削除確認モーダル */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(false);
                    }}
                >
                    <div
                        className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-4 text-white">ルームを解散しますか？</h3>
                        <p className="text-gray-300 mb-6 text-sm">
                            この操作は取り消せません。ルーム内の参加者も全員退出することになります。
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                解散する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
