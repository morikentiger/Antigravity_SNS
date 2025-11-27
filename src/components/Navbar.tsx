'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, signInWithGoogle, signOut } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'フィード', icon: '🏠' },
        { href: '/rooms', label: 'ルーム', icon: '🎤' },
        { href: '/messages', label: 'メッセージ', icon: '💬' },
    ];

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <h1>Antigravity</h1>
                </Link>

                {user && (
                    <div className={styles.navItems}>
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                            >
                                <span className={styles.icon}>{item.icon}</span>
                                <span className={styles.label}>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                )}

                <div className={styles.auth}>
                    {user ? (
                        <>
                            <Link href="/profile">
                                <Avatar src={user.photoURL || ''} alt={user.displayName || 'User'} size="sm" />
                            </Link>
                            <Button onClick={signOut} variant="ghost" size="sm">
                                ログアウト
                            </Button>
                        </>
                    ) : (
                        <Button onClick={signInWithGoogle} variant="primary" size="sm">
                            Googleでログイン
                        </Button>
                    )}
                </div>
            </div>
        </nav>
    );
}
