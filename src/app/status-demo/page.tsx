'use client';

import { useState } from 'react';
import UserStatusCard from '@/components/Post/UserStatusCard';

export default function StatusDemo() {
    const [moodScore, setMoodScore] = useState(75);
    const [positiveSentiment, setPositiveSentiment] = useState(0.7);
    const [negativeSentiment, setNegativeSentiment] = useState(0.1);
    const [activityLevel, setActivityLevel] = useState(0.6);
    const [flowScore, setFlowScore] = useState(0.7);
    const [reportCount, setReportCount] = useState(0);

    return (
        <div style={{
            minHeight: '100vh',
            padding: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{
                    color: 'white',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    STATUS System Demo
                </h1>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2rem',
                    marginBottom: '2rem'
                }}>
                    {/* STATUS Visualization */}
                    <div>
                        <h2 style={{ color: 'white', marginBottom: '1rem' }}>STATUS Visualization</h2>
                        <UserStatusCard
                            userId="demo-user"
                            userData={{
                                moodScore,
                                positiveSentiment,
                                negativeSentiment,
                                reportCount,
                                activityLevel,
                                flowScore
                            }}
                        />
                    </div>

                    {/* Controls */}
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '1rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Controls</h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Mood Score: {moodScore}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={moodScore}
                                onChange={(e) => setMoodScore(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Positive Sentiment: {positiveSentiment.toFixed(2)}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={positiveSentiment}
                                onChange={(e) => setPositiveSentiment(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Negative Sentiment: {negativeSentiment.toFixed(2)}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={negativeSentiment}
                                onChange={(e) => setNegativeSentiment(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Activity Level: {activityLevel.toFixed(2)}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={activityLevel}
                                onChange={(e) => setActivityLevel(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Flow Score: {flowScore.toFixed(2)}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={flowScore}
                                onChange={(e) => setFlowScore(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Report Count: {reportCount}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={reportCount}
                                onChange={(e) => setReportCount(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: '#f3f4f6',
                            borderRadius: '0.5rem'
                        }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Visual Effects Guide:</h3>
                            <ul style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                <li>☀️ <strong>Sunny</strong>: Mood &gt; 60, Stress &lt; 40</li>
                                <li>🌈 <strong>Rainbow</strong>: Mood &gt; 80, Stress &lt; 20</li>
                                <li>🌸 <strong>Flowers</strong>: Flow &gt; 60</li>
                                <li>🌧️ <strong>Rain</strong>: Stress &gt; 50 (Reports &gt; 5)</li>
                                <li>⚡ <strong>Thunder</strong>: Stress &gt; 85 (Reports &gt; 8)</li>
                                <li>🌑 <strong>Darkness</strong>: Mood &lt; 30 or Stress &gt; 50</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Preset Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => {
                            setMoodScore(90);
                            setPositiveSentiment(0.9);
                            setNegativeSentiment(0.05);
                            setActivityLevel(0.8);
                            setFlowScore(0.85);
                            setReportCount(0);
                        }}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        😊 Happy State
                    </button>

                    <button
                        onClick={() => {
                            setMoodScore(30);
                            setPositiveSentiment(0.2);
                            setNegativeSentiment(0.7);
                            setActivityLevel(0.3);
                            setFlowScore(0.2);
                            setReportCount(0);
                        }}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        😢 Sad State
                    </button>

                    <button
                        onClick={() => {
                            setMoodScore(40);
                            setPositiveSentiment(0.3);
                            setNegativeSentiment(0.6);
                            setActivityLevel(0.5);
                            setFlowScore(0.3);
                            setReportCount(8);
                        }}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        😡 Stressed State
                    </button>

                    <button
                        onClick={() => {
                            setMoodScore(75);
                            setPositiveSentiment(0.7);
                            setNegativeSentiment(0.1);
                            setActivityLevel(0.9);
                            setFlowScore(0.85);
                            setReportCount(0);
                        }}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        🌊 Flow State
                    </button>
                </div>
            </div>
        </div>
    );
}
