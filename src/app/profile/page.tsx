'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user) {
            setDisplayName(user.displayName || '');
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setMessage(null);

        try {
            await updateProfile(user, {
                displayName: displayName.trim(),
            });
            setMessage({ type: 'success', text: 'プロフィールを更新しました' });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: '更新に失敗しました: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !user) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8">プロフィール設定</h1>

                <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex items-center gap-6 mb-8">
                        <Avatar src={user.photoURL || ''} alt={user.displayName || 'User'} size="lg" />
                        <div>
                            <p className="text-sm text-gray-400">メールアドレス</p>
                            <p className="text-lg">{user.email}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                                表示名
                            </label>
                            <input
                                id="displayName"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="あなたの名前"
                                required
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button type="submit" variant="primary" disabled={isSaving}>
                                {isSaving ? '保存中...' : '保存する'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
