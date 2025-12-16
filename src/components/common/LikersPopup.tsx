'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ref, get, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import styles from './LikersPopup.module.css';

interface LikerInfo {
    uid: string;
    displayName: string;
    photoURL: string;
}

interface LikersPopupProps {
    likedBy: { [key: string]: boolean } | undefined;
    isOpen: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement>;
}

export default function LikersPopup({ likedBy, isOpen, onClose, anchorRef }: LikersPopupProps) {
    const [likers, setLikers] = useState<LikerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const popupRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (!isOpen || !likedBy) {
            setLikers([]);
            setLoading(false);
            return;
        }

        const fetchLikers = async () => {
            setLoading(true);
            const likerIds = Object.keys(likedBy).filter(uid => likedBy[uid]);
            const likerInfos: LikerInfo[] = [];

            for (const uid of likerIds) {
                try {
                    const userRef = ref(database, `users/${uid}`);
                    const snapshot = await get(userRef);
                    const userData = snapshot.val();

                    likerInfos.push({
                        uid,
                        displayName: userData?.displayName || 'Unknown User',
                        photoURL: userData?.photoURL || '',
                    });
                } catch (error) {
                    console.error(`Error fetching user ${uid}:`, error);
                    likerInfos.push({
                        uid,
                        displayName: 'Unknown User',
                        photoURL: '',
                    });
                }
            }

            setLikers(likerInfos);
            setLoading(false);
        };

        fetchLikers();
    }, [isOpen, likedBy]);

    // クリック外で閉じる
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                popupRef.current &&
                !popupRef.current.contains(e.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    const handleUserClick = (uid: string) => {
        router.push(`/profile/${uid}`);
        onClose();
    };

    return (
        <div ref={popupRef} className={styles.popup}>
            <div className={styles.header}>
                <span className={styles.title}>いいねした人</span>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>
            </div>
            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>読み込み中...</div>
                ) : likers.length === 0 ? (
                    <div className={styles.empty}>まだいいねがありません</div>
                ) : (
                    <ul className={styles.likerList}>
                        {likers.map((liker) => (
                            <li
                                key={liker.uid}
                                className={styles.likerItem}
                                onClick={() => handleUserClick(liker.uid)}
                            >
                                <Avatar src={liker.photoURL} alt={liker.displayName} size="sm" />
                                <span className={styles.likerName}>{liker.displayName}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
