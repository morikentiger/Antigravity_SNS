'use client';

import React from 'react';
import Avatar from '@/components/common/Avatar';
import styles from './ParticipantPanel.module.css';

export interface Participant {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    isSpeaker: boolean;
}

interface ParticipantPanelProps {
    isVisible: boolean;
    isHost: boolean;
    participants: Participant[];
    onClose: () => void;
    onKick: (userId: string) => void;
    onGrantMic: (userId: string) => void;
    onRevokeMic: (userId: string) => void;
    onAvatarClick: (userId: string) => void;
}

export default function ParticipantPanel({
    isVisible,
    isHost,
    participants,
    onClose,
    onKick,
    onGrantMic,
    onRevokeMic,
    onAvatarClick,
}: ParticipantPanelProps) {
    if (!isVisible) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>参加者一覧</h3>
                    <span className={styles.count}>{participants.length}人</span>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.participantList}>
                    {participants.map((participant) => (
                        <div key={participant.id} className={styles.participantItem}>
                            <button
                                className={styles.avatarButton}
                                onClick={() => onAvatarClick(participant.id)}
                                type="button"
                            >
                                <Avatar
                                    src={participant.avatar}
                                    alt={participant.name}
                                    size="md"
                                />
                            </button>

                            <div className={styles.participantInfo}>
                                <span className={styles.participantName}>
                                    {participant.name}
                                    {participant.isHost && (
                                        <span className={styles.hostBadge}>👑 ホスト</span>
                                    )}
                                </span>
                                {participant.isSpeaker && (
                                    <span className={styles.speakerBadge}>🎤 スピーカー</span>
                                )}
                            </div>

                            {/* ホストのみ表示：管理ボタン */}
                            {isHost && !participant.isHost && (
                                <div className={styles.adminButtons}>
                                    {!participant.isSpeaker ? (
                                        <button
                                            className={styles.grantMicButton}
                                            onClick={() => onGrantMic(participant.id)}
                                            type="button"
                                            title="マイクを付与"
                                        >
                                            🎤
                                        </button>
                                    ) : (
                                        <button
                                            className={styles.stepDownButton}
                                            onClick={() => onRevokeMic(participant.id)}
                                            type="button"
                                            title="マイクを取り消す"
                                        >
                                            ⬇️
                                        </button>
                                    )}
                                    <button
                                        className={styles.kickButton}
                                        onClick={() => onKick(participant.id)}
                                        type="button"
                                        title="退出させる"
                                    >
                                        🚪
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
