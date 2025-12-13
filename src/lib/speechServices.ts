/**
 * Voice Room × YUi Audio I/O Services
 *
 * STT (Speech-to-Text), TTS (Text-to-Speech), VAD (Voice Activity Detection)
 * のコアサービスを提供。
 *
 * 設計思想:
 * - 音声データは保存しない
 * - メモリ上のみで処理
 * - 使ったら忘れる
 */

// ============================================
// Web Speech API Type Declarations
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionEventType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionErrorEventType = any;

// ============================================
// Types
// ============================================

export interface STTResult {
    transcript: string;
    isFinal: boolean;
    timestamp: number;
}

export interface TTSOptions {
    text: string;
    rate?: number;   // 0.1 - 10, default: 1
    pitch?: number;  // 0 - 2, default: 1
    volume?: number; // 0 - 1, default: 1
}

export type VoiceActivityCallback = (isActive: boolean, volume: number) => void;
export type STTCallback = (result: STTResult) => void;

// ============================================
// Voice Activity Detector (VAD)
// 音量ベースの発話検知（50ms以内のレスポンス）
// ============================================

export class VoiceActivityDetector {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private animationFrameId: number | null = null;
    private isRunning = false;
    private threshold: number;
    private callback: VoiceActivityCallback | null = null;
    private lastActivityState = false;

    constructor(threshold: number = 0.02) {
        this.threshold = threshold;
    }

    async start(stream: MediaStream, callback: VoiceActivityCallback): Promise<void> {
        if (this.isRunning) return;

        try {
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.3;

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
            this.mediaStreamSource.connect(this.analyser);

            this.callback = callback;
            this.isRunning = true;
            this.detectActivity();
        } catch (error) {
            console.error('VAD start error:', error);
            this.stop();
        }
    }

    private detectActivity(): void {
        if (!this.isRunning || !this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        // RMS (Root Mean Square) で音量を計算
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const normalized = dataArray[i] / 255;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        const isActive = rms > this.threshold;

        // 状態が変わった時のみコールバック
        if (isActive !== this.lastActivityState) {
            this.lastActivityState = isActive;
            this.callback?.(isActive, rms);
        }

        this.animationFrameId = requestAnimationFrame(() => this.detectActivity());
    }

    stop(): void {
        this.isRunning = false;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.analyser = null;
        this.callback = null;
        this.lastActivityState = false;
    }

    setThreshold(threshold: number): void {
        this.threshold = threshold;
    }
}

// ============================================
// Speech Recognition Service (STT)
// Web Speech API ラッパー
// ============================================

export class SpeechRecognitionService {
    private recognition: SpeechRecognitionType | null = null;
    private isListening = false;
    private lastTranscript = '';
    private lastTranscriptTimestamp = 0;
    private callback: STTCallback | null = null;

    // ブラウザサポートチェック
    static isSupported(): boolean {
        return typeof window !== 'undefined' &&
            ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    }

    constructor() {
        if (typeof window === 'undefined') return;

        const SpeechRecognitionAPI =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (SpeechRecognitionAPI) {
            this.recognition = new SpeechRecognitionAPI();
            this.setupRecognition();
        }
    }

    private setupRecognition(): void {
        if (!this.recognition) return;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ja-JP';
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: SpeechRecognitionEventType) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            const isFinal = result.isFinal;

            // 直前1文のみをバッファ（メモリ上のみ）
            if (isFinal) {
                this.lastTranscript = transcript;
                this.lastTranscriptTimestamp = Date.now();
            }

            this.callback?.({
                transcript,
                isFinal,
                timestamp: Date.now(),
            });
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
            console.warn('STT error:', event.error);
            // no-speech エラーは無視（正常な動作）
            if (event.error !== 'no-speech') {
                this.stop();
            }
        };

        this.recognition.onend = () => {
            // continuous モードでも終了することがあるので再開
            if (this.isListening) {
                try {
                    this.recognition?.start();
                } catch (e) {
                    // already started
                }
            }
        };
    }

    start(callback: STTCallback): void {
        if (!this.recognition || this.isListening) return;

        this.callback = callback;
        this.isListening = true;

        try {
            this.recognition.start();
        } catch (e) {
            console.warn('STT start error:', e);
        }
    }

    stop(): void {
        if (!this.recognition) return;

        this.isListening = false;
        this.callback = null;

        try {
            this.recognition.stop();
        } catch (e) {
            // already stopped
        }
    }

    /**
     * 直前の発話を取得（2秒以内のもののみ）
     * 取得後は即破棄
     */
    getLastTranscript(): string | null {
        const now = Date.now();
        const maxAge = 2000; // 2秒

        if (this.lastTranscript && now - this.lastTranscriptTimestamp < maxAge) {
            const transcript = this.lastTranscript;
            this.clearBuffer(); // 取得後は即破棄
            return transcript;
        }

        return null;
    }

    /**
     * バッファを即破棄
     */
    clearBuffer(): void {
        this.lastTranscript = '';
        this.lastTranscriptTimestamp = 0;
    }
}

// ============================================
// Speech Synthesis Service (TTS)
// Web Speech API ラッパー
// ============================================

export class SpeechSynthesisService {
    private utterance: SpeechSynthesisUtterance | null = null;
    private isSpeaking = false;
    private delayTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private onEndCallback: (() => void) | null = null;
    private onStartCallback: (() => void) | null = null;

    // ブラウザサポートチェック
    static isSupported(): boolean {
        return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }

    /**
     * 0.2秒ディレイ後に発話開始
     * ディレイ中はキャンセル可能
     */
    speak(options: TTSOptions, onStart?: () => void, onEnd?: () => void): void {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // 既存の発話をキャンセル
        this.stop();

        this.onStartCallback = onStart || null;
        this.onEndCallback = onEnd || null;

        // 0.2秒ディレイ（仕様通り）
        this.delayTimeoutId = setTimeout(() => {
            this.startSpeaking(options);
        }, 200);
    }

    private startSpeaking(options: TTSOptions): void {
        const { text, rate = 1, pitch = 1, volume = 1 } = options;

        // 最大5秒制限（仕様通り）
        // 日本語で約15-20文字/秒なので、約100文字まで
        const maxLength = 100;
        const truncatedText = text.slice(0, maxLength);

        this.utterance = new SpeechSynthesisUtterance(truncatedText);
        this.utterance.lang = 'ja-JP';
        this.utterance.rate = rate;
        this.utterance.pitch = pitch;
        this.utterance.volume = volume;

        // 日本語の声を選択
        const voices = window.speechSynthesis.getVoices();
        const japaneseVoice = voices.find(v => v.lang.startsWith('ja'));
        if (japaneseVoice) {
            this.utterance.voice = japaneseVoice;
        }

        this.utterance.onstart = () => {
            this.isSpeaking = true;
            this.onStartCallback?.();
        };

        this.utterance.onend = () => {
            this.isSpeaking = false;
            this.onEndCallback?.();
            this.cleanup();
        };

        this.utterance.onerror = (event) => {
            console.warn('TTS error:', event.error);
            this.isSpeaking = false;
            this.onEndCallback?.();
            this.cleanup();
        };

        window.speechSynthesis.speak(this.utterance);
    }

    /**
     * 即停止（最重要）
     * 他者発話検知時に呼び出す
     */
    stop(): void {
        // ディレイ中ならキャンセル
        if (this.delayTimeoutId) {
            clearTimeout(this.delayTimeoutId);
            this.delayTimeoutId = null;
        }

        // 発話中なら即停止
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        this.isSpeaking = false;
        this.cleanup();
    }

    private cleanup(): void {
        this.utterance = null;
        this.onStartCallback = null;
        this.onEndCallback = null;
        this.delayTimeoutId = null;
    }

    getIsSpeaking(): boolean {
        return this.isSpeaking;
    }
}

// ============================================
// Factory / Utilities
// ============================================

export function createVoiceServices() {
    return {
        vad: new VoiceActivityDetector(),
        stt: new SpeechRecognitionService(),
        tts: new SpeechSynthesisService(),
    };
}

export function checkVoiceSupport(): { stt: boolean; tts: boolean } {
    return {
        stt: SpeechRecognitionService.isSupported(),
        tts: SpeechSynthesisService.isSupported(),
    };
}
