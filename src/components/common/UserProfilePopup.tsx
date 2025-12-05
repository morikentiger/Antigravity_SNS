'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import styles from './UserProfilePopup.module.css';

interface UserProfilePopupProps {
    userId: string;
    userName: string;
    userAvatar: string;
    size?: 'sm' | 'md' | 'lg';
    currentUserId?: string;
}

export default function UserProfilePopup({
    userId,
    userName,
    userAvatar,
    size = 'md',
    currentUserId,
}: UserProfilePopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // 自分自身の場合はクリック不可
    const isSelf = currentUserId === userId;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isSelf) {
            setIsOpen(!isOpen);
        }
    };

    const handleMessageClick = () => {
        setIsOpen(false);
        const params = new URLSearchParams({
            name: userName,
            avatar: userAvatar || '',
        });
        router.push(`/messages/${userId}?${params.toString()}`);
    };

    return (
        <div ref={containerRef} className={styles.popupContainer}>
            <div
                onClick={handleAvatarClick}
                style={{ cursor: isSelf ? 'default' : 'pointer' }}
            >
                <Avatar src={userAvatar} alt={userName} size={size} />
            </div>

            {isOpen && (
                <>
                    <div className={styles.overlay} onClick={() => setIsOpen(false)} />
                    <div className={styles.popup}>
                        <div className={styles.popupContent}>
                            <div className={styles.userInfo}>
                                <Avatar src={userAvatar} alt={userName} size="md" />
                                <p className={styles.userName}>{userName}</p>
                            </div>
                            <button
                                className={styles.messageButton}
                                onClick={handleMessageClick}
                            >
                                <svg
                                    className={styles.messageIcon}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                                メッセージを送る
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
