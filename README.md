# Antigravity SNS

![Antigravity](https://img.shields.io/badge/status-active-success.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Firebase](https://img.shields.io/badge/Firebase-10-orange)

**Antigravity**は、Gravityにインスパイアされた自由でユニークなSNSアプリケーションです。投稿、音声ルーム、DMの3つの主要機能を備えています。

## ✨ 主な機能

### 📝 投稿機能
- リアルタイムで投稿を作成・表示
- いいね機能
- レスポンシブなフィード
- 文字数制限（280文字）

### 🎤 音声ルーム
- リアルタイム音声通話（WebRTC）
- ルームの作成・参加・退出
- 参加者リストの表示
- ミュート/ミュート解除機能
- 音声インジケーター

### 💬 DM（ダイレクトメッセージ）
- 1対1のリアルタイムメッセージング
- 会話リスト
- 未読インジケーター
- エンターキーでメッセージ送信

## 🎨 デザイン

- **グラスモーフィズム**: モダンな半透明効果
- **鮮やかなグラデーション**: 紫〜ピンクのカラーパレット
- **ダークモード**: 目に優しいダークテーマ
- **スムーズなアニメーション**: マイクロインタラクションと遷移効果
- **レスポンシブデザイン**: モバイル・デスクトップ対応

## 🚀 セットアップ

### 前提条件

- Node.js 18以上
- Firebaseプロジェクト

### インストール手順

1. **リポジトリをクローン**

```bash
git clone <repository-url>
cd Antigravity
```

2. **依存関係をインストール**

```bash
npm install
```

3. **環境変数を設定**

`.env.example`をコピーして`.env.local`を作成し、Firebase設定を追加：

```bash
cp .env.example .env.local
```

`.env.local`を編集：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-database-url
```

4. **Firebaseプロジェクトを設定**

- [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
- **Authentication**を有効化し、Googleログインを設定
- **Realtime Database**を作成し、テストモードで開始

5. **開発サーバーを起動**

```bash
npm run dev
```

アプリは [http://localhost:3000](http://localhost:3000) で起動します。

## 📁 プロジェクト構成

```
Antigravity/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ
│   │   ├── rooms/              # 音声ルームページ
│   │   └── messages/           # DMページ
│   ├── components/
│   │   ├── AuthContext.tsx    # 認証コンテキスト
│   │   ├── Navbar.tsx          # ナビゲーションバー
│   │   ├── Post/               # 投稿コンポーネント
│   │   ├── VoiceRoom/          # 音声ルームコンポーネント
│   │   ├── Message/            # メッセージコンポーネント
│   │   └── common/             # 共通コンポーネント
│   └── lib/
│       ├── firebase.ts         # Firebase設定
│       └── webrtc.ts           # WebRTC設定
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🛠 使用技術

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: CSS Modules
- **バックエンド**: Firebase
  - Authentication (Google Sign-in)
  - Realtime Database
- **音声通話**: WebRTC + Simple Peer
- **フォント**: Google Fonts (Inter)

## 📝 使い方

1. **ログイン**: Googleアカウントでログイン
2. **投稿**: ホームページから投稿を作成
3. **音声ルーム**: ルームページで新しいルームを作成、または既存のルームに参加
4. **DM**: メッセージページで会話を開始

## 🎯 今後の開発予定

- [ ] 画像アップロード機能
- [ ] メンション機能
- [ ] 通知システム
- [ ] プロフィールページ
- [ ] 検索機能
- [ ] ハッシュタグ機能

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

**Antigravity** - 重力に逆らって、自由に楽しもう 🚀
