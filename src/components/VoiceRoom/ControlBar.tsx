'use client';

import React, { useState } from 'react';
import Avatar from '@/components/common/Avatar';
import styles from './ControlBar.module.css';

interface Game {
    id: string;
    name: string;
    icon: string;
}

const AVAILABLE_GAMES: Game[] = [
    { id: 'summon-shogi', name: '召喚将棋', icon: '♟️' },
    { id: 'quiz', name: 'クイズ', icon: '❓' },
    { id: 'word-chain', name: 'しりとり', icon: '🔤' },
    { id: 'drawing', name: 'お絵描き', icon: '🎨' },
];

// YuiSuggestions type matching the hook
interface YuiSuggestions {
    summary: string;
    emotion: string;
    encourage: string;
}

type SuggestionType = 'summary' | 'emotion' | 'encourage';

interface MicRequest {
    userId: string;
    userName: string;
}

interface ControlBarProps {
    isHost: boolean;
    isSpeaker: boolean;
    isMuted: boolean;
    hasMicRequest: boolean;
    micRequestCount: number;
    micRequests: MicRequest[];
    autoGrantMic: boolean;
    yuiSuggestions: YuiSuggestions | null;
    isYuiLoading: boolean;
    yuiAvatar?: string;
    realtimeTranscript?: string | null;
    onSendMessage: (message: string) => void;
    onSendImage: () => void;
    onSharePost: () => void;
    onShareDM: () => void;
    onGame: (gameId: string) => void;
    onToggleMute: () => void;
    onRequestMic: () => void;
    onGrantMic: (userId: string) => void;
    onToggleAutoGrant: (enabled: boolean) => void;
    onRequestYuiSuggestions: () => void;
    onSelectYuiSuggestion: (type: SuggestionType) => void;
}

const SUGGESTION_LABELS: { type: SuggestionType; label: string; emoji: string }[] = [
    { type: 'summary', label: '要約', emoji: '📝' },
    { type: 'emotion', label: '共感', emoji: '💭' },
    { type: 'encourage', label: '応援', emoji: '✨' },
];

export default function ControlBar({
    isHost,
    isSpeaker,
    isMuted,
    hasMicRequest,
    micRequestCount,
    micRequests,
    autoGrantMic,
    yuiSuggestions,
    isYuiLoading,
    yuiAvatar,
    realtimeTranscript,
    onSendMessage,
    onSendImage,
    onSharePost,
    onShareDM,
    onGame,
    onToggleMute,
    onRequestMic,
    onGrantMic,
    onToggleAutoGrant,
    onRequestYuiSuggestions,
    onSelectYuiSuggestion,
}: ControlBarProps) {
    const [isMessageExpanded, setIsMessageExpanded] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [showMicMenu, setShowMicMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [showGameMenu, setShowGameMenu] = useState(false);
    const [showYuiModal, setShowYuiModal] = useState(false);
    const [showMicRequestList, setShowMicRequestList] = useState(false);

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            onSendMessage(messageInput.trim());
            setMessageInput('');
            setIsMessageExpanded(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSharePost = () => {
        onSharePost();
        setShowShareMenu(false);
    };

    const handleShareDM = () => {
        onShareDM();
        setShowShareMenu(false);
    };

    const handleSelectGame = (gameId: string) => {
        onGame(gameId);
        setShowGameMenu(false);
    };

    const handleYuiClick = () => {
        setShowYuiModal(true);
        if (onRequestYuiSuggestions) {
            onRequestYuiSuggestions();
        }
    };

    const handleSelectSuggestion = (type: SuggestionType) => {
        if (onSelectYuiSuggestion) {
            onSelectYuiSuggestion(type);
        }
        setShowYuiModal(false);
    };

    const handleGrantMicRequest = (userId: string) => {
        onGrantMic(userId);
    };

    return (
        <div className={styles.controlBar}>
            {/* 認識中の音声表示（メッセージ入力の上） */}
            {realtimeTranscript && (
                <div className={styles.transcriptBar}>
                    <span className={styles.transcriptIcon}>🎙️</span>
                    <span className={styles.transcriptText}>{realtimeTranscript}</span>
                </div>
            )}

            {/* メッセージ入力エリア */}
            <div className={styles.inputRow}>
                {isMessageExpanded ? (
                    <div className={styles.messageInputArea}>
                        <input
                            type="text"
                            className={styles.messageInput}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="メッセージを入力..."
                            autoFocus
                        />
                        <button
                            className={styles.imageButton}
                            onClick={onSendImage}
                            type="button"
                            title="画像を送信"
                        >
                            📷
                        </button>
                        <button
                            className={styles.sendButton}
                            onClick={handleSendMessage}
                            type="button"
                            disabled={!messageInput.trim()}
                        >
                            送信
                        </button>
                        <button
                            className={styles.yuiButton}
                            onClick={handleYuiClick}
                            type="button"
                            title="YUiに聞く"
                        >
                            {yuiAvatar ? (
                                <Avatar src={yuiAvatar} alt="YUi" size="sm" />
                            ) : (
                                '🤖'
                            )}
                        </button>
                        <button
                            className={styles.cancelButton}
                            onClick={() => setIsMessageExpanded(false)}
                            type="button"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className={styles.messageToggleArea}>
                        <button
                            className={styles.messageToggle}
                            onClick={() => setIsMessageExpanded(true)}
                            type="button"
                        >
                            メッセージを送信
                        </button>
                        <button
                            className={styles.yuiButtonSmall}
                            onClick={handleYuiClick}
                            type="button"
                            title="YUiに聞く"
                        >
                            {yuiAvatar ? (
                                <Avatar src={yuiAvatar} alt="YUi" size="sm" />
                            ) : (
                                '🤖'
                            )}
                        </button>
                    </div>
                )}

                {/* アクションボタン群 */}
                <div className={styles.actionButtons}>
                    {/* シェアボタン */}
                    <div className={styles.menuContainer}>
                        <button
                            className={styles.actionButton}
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            type="button"
                            title="シェア"
                        >
                            📤
                        </button>

                        {showShareMenu && (
                            <div className={styles.popupMenu}>
                                <div className={styles.menuHeader}>
                                    <span>シェア</span>
                                    <button
                                        className={styles.closeMenuButton}
                                        onClick={() => setShowShareMenu(false)}
                                        type="button"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <button
                                    className={styles.menuItem}
                                    onClick={handleSharePost}
                                    type="button"
                                >
                                    📝 投稿でシェア
                                </button>
                                <button
                                    className={styles.menuItem}
                                    onClick={handleShareDM}
                                    type="button"
                                >
                                    💬 DMでシェア
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ゲームボタン */}
                    <div className={styles.menuContainer}>
                        <button
                            className={styles.actionButton}
                            onClick={() => setShowGameMenu(!showGameMenu)}
                            type="button"
                            title="ゲーム"
                        >
                            🎮
                        </button>

                        {showGameMenu && (
                            <div className={styles.popupMenu}>
                                <div className={styles.menuHeader}>
                                    <span>ゲームを選択</span>
                                    <button
                                        className={styles.closeMenuButton}
                                        onClick={() => setShowGameMenu(false)}
                                        type="button"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {AVAILABLE_GAMES.map((game) => (
                                    <button
                                        key={game.id}
                                        className={styles.menuItem}
                                        onClick={() => handleSelectGame(game.id)}
                                        type="button"
                                    >
                                        {game.icon} {game.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ルーム主のみ：マイク付与ボタン */}
                    {isHost && (
                        <div className={styles.menuContainer}>
                            <button
                                className={`${styles.actionButton} ${hasMicRequest ? styles.hasRequest : ''}`}
                                onClick={() => setShowMicMenu(!showMicMenu)}
                                type="button"
                                title="マイク付与"
                            >
                                🎤
                                {micRequestCount > 0 && (
                                    <span className={styles.requestBadge}>{micRequestCount}</span>
                                )}
                            </button>

                            {showMicMenu && (
                                <div className={styles.popupMenu}>
                                    <div className={styles.menuHeader}>
                                        <span>マイク設定</span>
                                        <button
                                            className={styles.closeMenuButton}
                                            onClick={() => setShowMicMenu(false)}
                                            type="button"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className={styles.autoGrantToggle}>
                                        <span>自動でマイク付与</span>
                                        <label className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={autoGrantMic}
                                                onChange={(e) => onToggleAutoGrant(e.target.checked)}
                                            />
                                            <span className={styles.toggleSlider}></span>
                                        </label>
                                    </div>
                                    <button
                                        className={styles.menuItem}
                                        onClick={() => {
                                            setShowMicRequestList(true);
                                            setShowMicMenu(false);
                                        }}
                                        type="button"
                                    >
                                        🙋 申請一覧を見る
                                        {micRequestCount > 0 && (
                                            <span className={styles.requestCount}>({micRequestCount})</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* マイクミュート/申請ボタン */}
                    {isSpeaker ? (
                        <button
                            className={`${styles.micButton} ${isMuted ? styles.muted : styles.unmuted}`}
                            onClick={onToggleMute}
                            type="button"
                            title={isMuted ? 'ミュート解除' : 'ミュート'}
                        >
                            {isMuted ? '🔇' : '🎙️'}
                        </button>
                    ) : (
                        <button
                            className={styles.requestMicButton}
                            onClick={onRequestMic}
                            type="button"
                            title="マイク申請"
                        >
                            🙋 マイク申請
                        </button>
                    )}
                </div>
            </div>

            {/* YUi提案モーダル */}
            {showYuiModal && (
                <div className={styles.yuiModal} onClick={() => setShowYuiModal(false)}>
                    <div className={styles.yuiModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.yuiModalHeader}>
                            <span className={styles.yuiModalIcon}>
                                {yuiAvatar ? (
                                    <Avatar src={yuiAvatar} alt="YUi" size="sm" />
                                ) : (
                                    '🤖'
                                )}
                            </span>
                            <span>YUiからの一言提案</span>
                            <button
                                className={styles.closeMenuButton}
                                onClick={() => setShowYuiModal(false)}
                                type="button"
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.yuiModalBody}>
                            {isYuiLoading ? (
                                <div className={styles.yuiLoading}>
                                    <span className={styles.loadingDots}>考え中</span>
                                </div>
                            ) : yuiSuggestions ? (
                                <div className={styles.yuiSuggestions}>
                                    {SUGGESTION_LABELS.map(({ type, label, emoji }) => (
                                        <button
                                            key={type}
                                            className={styles.yuiSuggestionItem}
                                            onClick={() => handleSelectSuggestion(type)}
                                            type="button"
                                        >
                                            <span className={styles.suggestionNumber}>{emoji}</span>
                                            <div className={styles.suggestionContent}>
                                                <span className={styles.suggestionLabel}>{label}</span>
                                                <span className={styles.suggestionText}>
                                                    {yuiSuggestions[type]}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.yuiNoSuggestion}>
                                    会話を聞いて提案を考えます...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* マイク申請者リストモーダル */}
            {showMicRequestList && (
                <div className={styles.yuiModal} onClick={() => setShowMicRequestList(false)}>
                    <div className={styles.yuiModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.yuiModalHeader}>
                            <span className={styles.yuiModalIcon}>🙋</span>
                            <span>マイク申請一覧</span>
                            <button
                                className={styles.closeMenuButton}
                                onClick={() => setShowMicRequestList(false)}
                                type="button"
                            >
                                ✕
                            </button>
                        </div>
                        <div className={styles.yuiModalBody}>
                            {micRequests.length === 0 ? (
                                <div className={styles.yuiNoSuggestion}>
                                    マイク申請はありません
                                </div>
                            ) : (
                                <div className={styles.yuiSuggestions}>
                                    {micRequests.map((request) => (
                                        <div
                                            key={request.userId}
                                            className={styles.micRequestItem}
                                        >
                                            <span className={styles.micRequestName}>
                                                {request.userName}
                                            </span>
                                            <button
                                                className={styles.grantButton}
                                                onClick={() => handleGrantMicRequest(request.userId)}
                                                type="button"
                                            >
                                                ✅ 許可
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
