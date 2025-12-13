'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
    VoiceActivityDetector,
    SpeechRecognitionService,
    SpeechSynthesisService,
    checkVoiceSupport,
} from '@/lib/speechServices';

// ============================================
// Types
// ============================================

export interface YuiSuggestions {
    summary: string;
    emotion: string;
    encourage: string;
}

export type SuggestionType = 'summary' | 'emotion' | 'encourage';

export interface UseYuiVoiceAssistReturn {
    // State
    isSupported: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    isLoading: boolean;
    suggestions: YuiSuggestions | null;
    capturedContext: string | null;  // 取得したSTT結果を表示用に公開
    error: string | null;

    // Actions
    startListening: (stream: MediaStream) => void;
    stopListening: () => void;
    requestSuggestions: () => Promise<void>;
    speakSuggestion: (type: SuggestionType) => void;
    cancelSpeaking: () => void;
    reset: () => void;
}

// ============================================
// Hook
// ============================================

export function useYuiVoiceAssist(): UseYuiVoiceAssistReturn {
    // Services (refs to persist across renders)
    const vadRef = useRef<VoiceActivityDetector | null>(null);
    const sttRef = useRef<SpeechRecognitionService | null>(null);
    const ttsRef = useRef<SpeechSynthesisService | null>(null);

    // State
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<YuiSuggestions | null>(null);
    const [capturedContext, setCapturedContext] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 最後のコンテキスト（メモリ上のみ）
    const lastContextRef = useRef<string>('');

    // Initialize services
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const support = checkVoiceSupport();
        setIsSupported(support.stt && support.tts);

        vadRef.current = new VoiceActivityDetector();
        sttRef.current = new SpeechRecognitionService();
        ttsRef.current = new SpeechSynthesisService();

        return () => {
            vadRef.current?.stop();
            sttRef.current?.stop();
            ttsRef.current?.stop();
        };
    }, []);

    // STTとVADを開始（ルーム参加時）
    const startListening = useCallback((stream: MediaStream) => {
        if (!vadRef.current || !sttRef.current) return;

        // VAD: 音量検知開始
        vadRef.current.start(stream, (isActive, _volume) => {
            if (isActive && ttsRef.current?.getIsSpeaking()) {
                // 他者発話検知 → TTS即停止（仕様4.2）
                console.log('Voice detected, stopping TTS');
                ttsRef.current.stop();
                setIsSpeaking(false);
            }
        });

        // STT: 音声認識開始
        sttRef.current.start((result) => {
            if (result.isFinal) {
                // 直前の発話をバッファ（メモリのみ）
                lastContextRef.current = result.transcript;
            }
        });

        setIsListening(true);
        setError(null);
    }, []);

    // STTとVADを停止（ルーム退出時）
    const stopListening = useCallback(() => {
        vadRef.current?.stop();
        sttRef.current?.stop();
        ttsRef.current?.stop();

        setIsListening(false);
        setIsSpeaking(false);
        lastContextRef.current = '';
    }, []);

    // YUi APIに候補をリクエスト
    const requestSuggestions = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            // 直前のSTT断片を取得（仕様8.4）
            const context = sttRef.current?.getLastTranscript() || lastContextRef.current;

            // コンテキストがない場合はデフォルトのプロンプトを使用
            // ただしAPIは必ず呼び出す（生成させる）
            const hasRealContext = context && context.trim().length > 0;
            const promptContent = hasRealContext
                ? context
                : '（音声ルームで会話中。会話の様子を見守っている状況）';

            // 表示用にコンテキストを保存
            setCapturedContext(hasRealContext ? context : null);

            const response = await fetch('/api/yui/assist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: promptContent }),
            });

            if (!response.ok) {
                throw new Error('Failed to get suggestions');
            }

            const data = await response.json();
            setSuggestions(data);

            // 取得後にバッファをクリア（仕様4.3: 即破棄）
            sttRef.current?.clearBuffer();
            lastContextRef.current = '';
        } catch (err) {
            console.error('YUi assist error:', err);
            setError('候補の取得に失敗しました');
            // フォールバック
            setSuggestions({
                summary: '会話が続いているね',
                emotion: 'みんなの気持ちが伝わってくる',
                encourage: 'いい時間を過ごしてるね',
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    // 選択した候補をTTSで発話
    const speakSuggestion = useCallback((type: SuggestionType) => {
        if (!suggestions || !ttsRef.current) return;

        const text = suggestions[type];
        if (!text) return;

        // TTS発話（0.2秒ディレイ付き、仕様5.3）
        ttsRef.current.speak(
            { text },
            () => setIsSpeaking(true),  // onStart
            () => {                      // onEnd
                setIsSpeaking(false);
                setSuggestions(null);      // 発話完了後にリセット
            }
        );
    }, [suggestions]);

    // TTS即停止
    const cancelSpeaking = useCallback(() => {
        ttsRef.current?.stop();
        setIsSpeaking(false);
    }, []);

    // 状態リセット
    const reset = useCallback(() => {
        ttsRef.current?.stop();
        sttRef.current?.clearBuffer();
        lastContextRef.current = '';
        setSuggestions(null);
        setCapturedContext(null);
        setIsSpeaking(false);
        setIsLoading(false);
        setError(null);
    }, []);

    return {
        isSupported,
        isListening,
        isSpeaking,
        isLoading,
        suggestions,
        capturedContext,
        error,
        startListening,
        stopListening,
        requestSuggestions,
        speakSuggestion,
        cancelSpeaking,
        reset,
    };
}
