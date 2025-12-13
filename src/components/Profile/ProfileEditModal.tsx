'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { ref as dbRef, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import ImageCropper from '@/components/common/ImageCropper';
import styles from './ProfileEditModal.module.css';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [yuiName, setYuiName] = useState('YUi');
    const [yuiAvatar, setYuiAvatar] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingYui, setIsUploadingYui] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const yuiFileInputRef = useRef<HTMLInputElement>(null);

    // Cropping state
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'user' | 'yui' | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            setDisplayName(user.displayName || '');
            setPhotoURL(user.photoURL || '');
            setMessage(null);
            // FirebaseからyuiNameとyuiAvatarを取得
            const userDbRef = dbRef(database, `users/${user.uid}`);
            get(userDbRef).then((snapshot) => {
                const data = snapshot.val();
                if (data?.yuiName) {
                    setYuiName(data.yuiName);
                } else {
                    setYuiName('YUi');
                }
                if (data?.yuiAvatar) {
                    setYuiAvatar(data.yuiAvatar);
                } else {
                    setYuiAvatar('');
                }
            });
        }
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: '画像サイズは5MB以下にしてください' });
            return;
        }

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '画像ファイルを選択してください' });
            return;
        }

        // 画像を読み込んでクロッパーを表示
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setCropType('user');
        };
        reader.readAsDataURL(file);

        // ファイル入力をリセット
        e.target.value = '';
    };

    const handleYuiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'YUi画像は5MB以下にしてください' });
            return;
        }

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '画像ファイルを選択してください' });
            return;
        }

        // 画像を読み込んでクロッパーを表示
        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setCropType('yui');
        };
        reader.readAsDataURL(file);

        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!user || !cropType) return;

        const isYui = cropType === 'yui';
        isYui ? setIsUploadingYui(true) : setIsUploading(true);
        setMessage(null);
        setCropImageSrc(null);
        setCropType(null);

        try {
            const storage = getStorage();
            const folder = isYui ? 'yui-avatars' : 'avatars';
            const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_cropped.jpg`);

            await uploadBytes(storageRef, croppedBlob);
            const downloadURL = await getDownloadURL(storageRef);

            if (isYui) {
                setYuiAvatar(downloadURL);
                setMessage({ type: 'success', text: 'YUi画像をアップロードしました。「保存する」を押して確定してください。' });
            } else {
                setPhotoURL(downloadURL);
                setMessage({ type: 'success', text: '画像をアップロードしました。「保存する」を押して確定してください。' });
            }
        } catch (error: any) {
            console.error('Error uploading cropped image:', error);
            setMessage({ type: 'error', text: 'アップロードに失敗しました: ' + error.message });
        } finally {
            isYui ? setIsUploadingYui(false) : setIsUploading(false);
        }
    };

    const handleCropCancel = () => {
        setCropImageSrc(null);
        setCropType(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const newDisplayName = displayName.trim();

            await updateProfile(user, {
                displayName: newDisplayName,
                photoURL: photoURL,
            });

            // 過去の投稿や返信のプロフィール画像も更新
            // 非同期で実行し、ユーザーを待たせないようにすることもできるが、
            // ここでは完了を待ってからメッセージを表示する
            await import('@/lib/userUtils').then(({ updateUserProfileImages }) =>
                updateUserProfileImages(user.uid, photoURL, newDisplayName)
            );

            // YUi返信のプロフィールも更新
            const finalYuiName = yuiName.trim() || 'YUi';
            await import('@/lib/userUtils').then(({ updateYuiProfileImages }) =>
                updateYuiProfileImages(user.uid, yuiAvatar, finalYuiName, newDisplayName)
            );

            // Firebase Realtime DatabaseにyuiNameも保存
            const userDbRef = dbRef(database, `users/${user.uid}`);
            const existingSnapshot = await get(userDbRef);
            const existingData = existingSnapshot.val() || {};
            await set(userDbRef, {
                ...existingData,
                displayName: newDisplayName,
                photoURL: photoURL,
                yuiName: finalYuiName,
                yuiAvatar: yuiAvatar || '',
                email: user.email,
                updatedAt: Date.now(),
            });

            setMessage({ type: 'success', text: 'プロフィールを更新しました' });
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: '更新に失敗しました: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={cropImageSrc ? undefined : onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>プロフィール編集</h2>
                </div>

                <div className={styles.content}>
                    <div className="flex flex-col items-center gap-6 mb-8">
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
                        <div className="text-center">
                            <p className="text-sm text-gray-400 mb-1">メールアドレス</p>
                            <p className="text-lg font-medium break-all text-white">{user.email}</p>
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

                        <div>
                            <label htmlFor="yuiName" className="block text-sm font-medium text-gray-300 mb-2">
                                ✨ あなたのYUiの名前
                            </label>
                            <input
                                id="yuiName"
                                type="text"
                                value={yuiName}
                                onChange={(e) => setYuiName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="YUi"
                                maxLength={20}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                YUiが返信するときの名前です（例: ゆい、ナビちゃん）
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                🌟 YUiのアバター
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Avatar
                                        src={yuiAvatar || '/yui-avatar.png'}
                                        alt="YUi Avatar"
                                        size="md"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => yuiFileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-1.5 shadow-lg transition-colors text-xs"
                                        disabled={isUploadingYui}
                                    >
                                        {isUploadingYui ? '...' : '✨'}
                                    </button>
                                    <input
                                        ref={yuiFileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleYuiFileChange}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    YUiが返信するときのアイコンです
                                </p>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving || isUploading}>
                                キャンセル
                            </Button>
                            <Button type="submit" variant="primary" disabled={isSaving || isUploading || isUploadingYui}>
                                {isSaving ? '保存中...' : '保存する'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Image Cropper Modal */}
            {cropImageSrc && (
                <ImageCropper
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspectRatio={1}
                />
            )}
        </div>
    );
}
