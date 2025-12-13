'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import Button from '@/components/common/Button';
import styles from './ImageCropper.module.css';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number;
}

export default function ImageCropper({
    imageSrc,
    onCropComplete,
    onCancel,
    aspectRatio = 1,
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = useCallback((location: Point) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropCompleteInternal = useCallback(
        (_croppedArea: Area, croppedAreaPixels: Area) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    const createCroppedImage = useCallback(async () => {
        if (!croppedAreaPixels) return;

        const image = new Image();
        image.src = imageSrc;
        await new Promise((resolve) => {
            image.onload = resolve;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            croppedAreaPixels.width,
            croppedAreaPixels.height
        );

        canvas.toBlob((blob) => {
            if (blob) {
                onCropComplete(blob);
            }
        }, 'image/jpeg', 0.9);
    }, [imageSrc, croppedAreaPixels, onCropComplete]);

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <h3 className={styles.title}>画像をトリミング</h3>

                <div className={styles.cropperWrapper}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteInternal}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                <div className={styles.controls}>
                    <label className={styles.zoomLabel}>
                        ズーム
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className={styles.zoomSlider}
                        />
                    </label>
                </div>

                <div className={styles.actions}>
                    <Button variant="ghost" onClick={onCancel}>
                        キャンセル
                    </Button>
                    <Button variant="primary" onClick={createCroppedImage}>
                        適用
                    </Button>
                </div>
            </div>
        </div>
    );
}
