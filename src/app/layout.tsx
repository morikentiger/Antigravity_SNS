import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
    title: 'Antigravity - 自由なSNS',
    description: '投稿、音声ルーム、DMを楽しめる自由でおかしいSNSアプリ',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body>
                <AuthProvider>
                    <Navbar />
                    <main>{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
