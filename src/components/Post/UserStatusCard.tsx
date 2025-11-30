'use client';

import { useEffect, useRef } from 'react';

interface UserStatusCardProps {
    userId: string;
    userData: {
        moodScore: number;
        positiveSentiment: number;
        negativeSentiment: number;
        reportCount: number;
        activityLevel: number;
        flowScore: number;
    };
}

declare global {
    interface Window {
        StatusSystem: any;
    }
}

export default function UserStatusCard({ userId, userData }: UserStatusCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const statusSystemRef = useRef<any>(null);
    const scriptLoadedRef = useRef(false);

    useEffect(() => {
        // StatusSystemをロード
        if (typeof window !== 'undefined' && !window.StatusSystem && !scriptLoadedRef.current) {
            scriptLoadedRef.current = true;
            const script = document.createElement('script');
            script.src = '/lib/StatusSystem.js';
            script.onload = initializeSystem;
            document.body.appendChild(script);
        } else if (window.StatusSystem) {
            initializeSystem();
        }

        function initializeSystem() {
            if (containerRef.current && !statusSystemRef.current) {
                try {
                    statusSystemRef.current = new window.StatusSystem(containerRef.current);
                    updateStatus();
                } catch (error) {
                    console.error('Failed to initialize StatusSystem:', error);
                }
            }
        }

        function updateStatus() {
            if (statusSystemRef.current && userData) {
                try {
                    statusSystemRef.current.update({
                        mood_self_report: userData.moodScore,
                        chat_sentiment_positive: userData.positiveSentiment,
                        chat_sentiment_negative: userData.negativeSentiment,
                        attack_count: userData.reportCount,
                        talk_rate: userData.activityLevel,
                        chat_flow: userData.flowScore
                    });
                } catch (error) {
                    console.error('Failed to update StatusSystem:', error);
                }
            }
        }

        // Update when userData changes
        updateStatus();

        return () => {
            if (statusSystemRef.current) {
                try {
                    statusSystemRef.current.destroy();
                } catch (error) {
                    console.error('Failed to destroy StatusSystem:', error);
                }
                statusSystemRef.current = null;
            }
        };
    }, [userData]);

    return (
        <div className="rounded-xl overflow-hidden shadow-lg">
            <div
                ref={containerRef}
                className="w-full h-64 bg-gradient-to-b from-sky-400 to-cyan-400"
                style={{
                    background: 'linear-gradient(to bottom, #38bdf8, #22d3ee)',
                    minHeight: '256px'
                }}
            />
        </div>
    );
}
