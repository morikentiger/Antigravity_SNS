'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { updateProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { ref as dbRef, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';


export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user) {
            setDisplayName(user.displayName || '');
            setPhotoURL(user.photoURL || '');
        }
    }, [user, loading, router]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: '画像サイズは5MB以下にしてください' });
            return;
        }

        // 画像タイプチェック
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '画像ファイルを選択してください' });
            return;
        }

        setIsUploading(true);
        setMessage(null);

        try {
            const storage = getStorage();
            const fileRef = storageRef(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);

            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);

            setPhotoURL(downloadURL);
            setMessage({ type: 'success', text: '画像をアップロードしました。「保存する」を押して確定してください。' });
        } catch (error: any) {
            console.error('Error uploading file:', error);
            setMessage({ type: 'error', text: 'アップロードに失敗しました: ' + error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const newDisplayName = displayName.trim();

            // Firebase Authのプロフィールを更新
            await updateProfile(user, {
                displayName: newDisplayName,
                photoURL: photoURL,
            });

            // Firebase Realtime Databaseにも保存（他のページで参照される）
            const userDbRef = dbRef(database, `users/${user.uid}`);
            const userData = {
                displayName: newDisplayName,
                photoURL: photoURL,
                email: user.email,
                updatedAt: Date.now(),
            };
            console.log('Saving user data to database:', userData);
            console.log('User ID:', user.uid);
            await set(userDbRef, userData);
            console.log('User data saved successfully!');

            setMessage({ type: 'success', text: 'プロフィールを更新しました' });

            // ページをリロードして最新の情報を反映
            setTimeout(() => {
                window.location.reload();
            }, 1000);
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
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8">プロフィール設定</h1>

                <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-8 text-center md:text-left">
                        <div className="relative">
                            <Avatar src={photoURL || user.photoURL || ''} alt={user.displayName || 'User'} size="lg" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors"
                                disabled={isUploading}
                            >
                                {isUploading ? '...' : '📷'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-1">メールアドレス</p>
                            <p className="text-lg font-medium break-all">{user.email}</p>
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
                            <Button type="submit" variant="primary" disabled={isSaving || isUploading}>
                                {isSaving ? '保存中...' : '保存する'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
