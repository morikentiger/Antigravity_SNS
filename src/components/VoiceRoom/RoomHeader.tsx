'use client';

import React from 'react';
import styles from './RoomHeader.module.css';

interface RoomHeaderProps {
    title: string;
    onMinimize: () => void;
    onLeave: () => void;
    onSettings: () => void;
}

export default function RoomHeader({
    title,
    onMinimize,
    onLeave,
    onSettings,
}: RoomHeaderProps) {
    return (
        <header className={styles.header}>
            <button
                className={styles.minimizeButton}
                onClick={onMinimize}
                title="音声ルームを維持したまま他の画面へ"
                type="button"
            >
                ←→
            </button>

            <h1 className={styles.title}>{title}</h1>

            <div className={styles.rightControls}>
                <button
                    className={styles.leaveButton}
                    onClick={onLeave}
                    title="退出"
                    type="button"
                >
                    ⏻
                </button>
                <button
                    className={styles.settingsButton}
                    onClick={onSettings}
                    title="設定"
                    type="button"
                >
                    ☰
                </button>
            </div>
        </header>
    );
}
