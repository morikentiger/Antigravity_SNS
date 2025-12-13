'use client';

import React from 'react';
import Avatar from '@/components/common/Avatar';
import styles from './SpeakerPanel.module.css';

export interface Speaker {
    id: string;
    name: string;
    avatar: string;
    muted: boolean;
    isSpeaking: boolean;
    isHost: boolean;
    hasYui?: boolean;
}

interface SpeakerPanelProps {
    speakers: Speaker[];
    maxSlots?: number;
    onAvatarClick: (userId: string) => void;
    onEmptySlotClick: () => void;
}

export default function SpeakerPanel({
    speakers,
    maxSlots = 6,
    onAvatarClick,
    onEmptySlotClick,
}: SpeakerPanelProps) {
    // ホスト（ルーム主）を一番上に固定
    const sortedSpeakers = [...speakers].sort((a, b) => {
        if (a.isHost) return -1;
        if (b.isHost) return 1;
        return 0;
    });

    const emptySlots = Math.max(0, maxSlots - speakers.length);

    return (
        <div className={styles.panel}>
            <div className={styles.speakerGrid}>
                {sortedSpeakers.map((speaker, index) => (
                    <div key={speaker.id} className={styles.speakerRow}>
                        <div className={styles.speakerSlot}>
                            <button
                                className={`${styles.avatarWrapper} ${speaker.isSpeaking ? styles.speaking : ''}`}
                                onClick={() => onAvatarClick(speaker.id)}
                                type="button"
                            >
                                <Avatar
                                    src={speaker.avatar}
                                    alt={speaker.name}
                                    size="lg"
                                />
                                {/* スピーキングインジケータ */}
                                {speaker.isSpeaking && !speaker.muted && (
                                    <div className={styles.speakingRing} />
                                )}
                                {/* ミュート表示 */}
                                {speaker.muted && (
                                    <div className={styles.mutedBadge}>
                                        🔇
                                    </div>
                                )}
                            </button>
                            {/* 順位番号（ホストは1固定） */}
                            <span className={`${styles.slotNumber} ${speaker.isHost ? styles.hostNumber : ''}`}>
                                {speaker.isHost ? '👑' : index + 1}
                            </span>
                        </div>

                        {/* YUiアイコン */}
                        {speaker.hasYui && (
                            <div className={styles.yuiSlot}>
                                <div className={styles.yuiAvatar}>
                                    🤖
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* 空スロット */}
                {Array.from({ length: emptySlots }).map((_, index) => (
                    <div key={`empty-${index}`} className={styles.speakerRow}>
                        <div className={styles.speakerSlot}>
                            <button
                                className={styles.emptySlot}
                                onClick={onEmptySlotClick}
                                type="button"
                            >
                                <span className={styles.plusIcon}>+</span>
                            </button>
                            <span className={styles.slotNumber}>
                                {speakers.length + index + 1}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ゲスト表示エリア */}
            <div className={styles.guestSection}>
                <span className={styles.guestLabel}>ゲスト（0人）</span>
                <button className={styles.addMemberButton} type="button">
                    メンバーを追加
                </button>
            </div>
        </div>
    );
}
