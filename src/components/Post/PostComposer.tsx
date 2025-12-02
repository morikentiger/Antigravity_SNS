'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ref, push, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import styles from './PostComposer.module.css';

export default function PostComposer() {
    const searchParams = useSearchParams();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const maxTitleLength = 100;
    const maxContentLength = 500;

    // URLパラメータからスコアを読み取る
    useEffect(() => {
        const score = searchParams.get('score');
        const game = searchParams.get('game');

        if (score && game) {
            setTitle(`${game}でハイスコア達成！`);
            setContent(`スコア: ${score}点\n\n${game}をプレイしました！`);
        }
    }, [searchParams]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('画像サイズは5MB以下にしてください');
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('画像ファイルを選択してください');
                return;
            }

            setSelectedImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim() || !user) return;

        setIsPosting(true);
        try {
            let imageUrl = '';

            // Upload image if selected
            if (selectedImage) {
                const timestamp = Date.now();
                const imagePath = `posts/${user.uid}/${timestamp}_${selectedImage.name}`;
                const imageRef = storageRef(storage, imagePath);

                await uploadBytes(imageRef, selectedImage);
                imageUrl = await getDownloadURL(imageRef);
            }

            const threadsRef = ref(database, 'threads');
            await push(threadsRef, {
                title: title.trim(),
                content: content.trim(),
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                timestamp: serverTimestamp(),
                likes: 0,
                likedBy: {},
                replyCount: 0,
                imageUrl: imageUrl || null,
            });
            setTitle('');
            setContent('');
            handleRemoveImage();
        } catch (error) {
            console.error('Error creating thread:', error);
            alert('投稿に失敗しました');
        } finally {
            setIsPosting(false);
        }
    };

    const remainingTitleChars = maxTitleLength - title.length;
    const remainingContentChars = maxContentLength - content.length;
    const isTitleOverLimit = remainingTitleChars < 0;
    const isContentOverLimit = remainingContentChars < 0;

    return (
        <div className={styles.composer}>
            <div className={styles.header}>
                <Avatar src={user?.photoURL || ''} alt={user?.displayName || 'User'} size="md" />
                <h3>スレッドを立てる</h3>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="スレッドのタイトル（話題）"
                        className={styles.titleInput}
                        maxLength={maxTitleLength}
                    />
                    <span className={`${styles.counter} ${isTitleOverLimit ? styles.overLimit : ''}`}>
                        {remainingTitleChars}
                    </span>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="スレッドの内容を書こう..."
                    className={styles.textarea}
                    rows={4}
                />

                {/* Image Preview */}
                {imagePreview && (
                    <div className={styles.imagePreview}>
                        <img src={imagePreview} alt="Preview" />
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className={styles.removeImageButton}
                            aria-label="画像を削除"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className={styles.footer}>
                    <div className={styles.leftActions}>
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        {/* Image upload button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={styles.imageButton}
                            aria-label="画像を追加"
                            disabled={isPosting}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </button>
                        <span className={`${styles.counter} ${isContentOverLimit ? styles.overLimit : ''}`}>
                            {remainingContentChars}
                        </span>
                    </div>
                    <Button
                        type="submit"
                        disabled={!title.trim() || !content.trim() || isTitleOverLimit || isContentOverLimit || isPosting}
                        variant="primary"
                    >
                        {isPosting ? '作成中...' : 'スレッドを立てる'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
