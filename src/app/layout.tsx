import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import './globals.css';

const siteUrl = 'https://www.antigravity-sns.online';
const siteName = 'Antigravity';
const siteDescription = '投稿、音声ルーム、DMを楽しめる自由でおかしいSNSアプリ。AIナビゲーター「YUi」があなたの投稿をサポート！';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Antigravity - 自由なSNS',
        template: '%s | Antigravity',
    },
    description: siteDescription,
    keywords: ['SNS', 'ソーシャルメディア', 'コミュニティ', 'AI', 'YUi', '音声チャット', 'DM', 'ゲーム', 'ハイスコア'],
    authors: [{ name: '森田健太' }],
    creator: '森田健太',
    publisher: 'Antigravity',
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        type: 'website',
        locale: 'ja_JP',
        url: siteUrl,
        siteName: siteName,
        title: 'Antigravity - 自由なSNS',
        description: siteDescription,
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Antigravity - 自由なSNS',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Antigravity - 自由なSNS',
        description: siteDescription,
        images: ['/og-image.png'],
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/apple-touch-icon.png',
    },
    manifest: '/manifest.json',
    verification: {
        google: 'gVGXakX8TBrTGoa7hWPIBx1GLJmxr2SZZ7xbu4T0U-Y',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "name": "Antigravity",
                            "alternateName": "Antigravity SNS",
                            "url": "https://www.antigravity-sns.online",
                            "description": siteDescription,
                            "author": {
                                "@type": "Person",
                                "name": "森田健太"
                            },
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": "https://www.antigravity-sns.online/?q={search_term_string}",
                                "query-input": "required name=search_term_string"
                            }
                        }),
                    }}
                />
            </head>
            <body>
                <AuthProvider>
                    <Navbar />
                    <main>{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
