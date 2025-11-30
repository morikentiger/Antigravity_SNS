# STATUS System Integration

## 概要

AntigravityにSTATUSシステムを統合しました。STATUSは投稿内容から感情状態を視覚化するシステムです。

## 統合内容

### 1. ファイル構成

```
/Users/moritakenta/Workspace/projects/Antigravity/
├── public/
│   └── lib/
│       └── StatusSystem.js          # STATUS可視化ライブラリ
├── src/
│   ├── components/
│   │   └── Post/
│   │       ├── PostCard.tsx         # STATUS統合済み投稿カード
│   │       └── UserStatusCard.tsx   # STATUSビジュアライゼーションコンポーネント
│   └── lib/
│       └── sentiment.ts             # 感情分析ユーティリティ
```

### 2. 主要コンポーネント

#### UserStatusCard.tsx
投稿データから感情状態を視覚化するコンポーネント。StatusSystem.jsを動的にロードし、以下のデータを可視化します：

- **moodScore**: 気分スコア (0-100)
- **positiveSentiment**: ポジティブ感情 (0-1)
- **negativeSentiment**: ネガティブ感情 (0-1)
- **activityLevel**: 活動レベル (0-1)
- **flowScore**: フロースコア (0-1)

#### sentiment.ts
投稿内容から感情を分析するユーティリティ：

- キーワードベースの感情分析
- 絵文字、感嘆符、疑問符の検出
- いいね数、返信数などのエンゲージメント指標の統合

### 3. 視覚効果

STATUSシステムは感情状態に応じて以下の視覚効果を表示します：

#### ポジティブな状態
- **晴れ (Sunny)**: mood > 0.6 かつ stress < 0.4
- **虹 (Rainbow)**: mood > 0.8 かつ stress < 0.2
- **花 (Flowers)**: flow > 0.6 で表示される上昇する粒子
- **境界の花**: energy > 0.7 で画面周辺に咲く花

#### ネガティブな状態
- **暗闇 (Darkness)**: mood < 0.3 または stress > 0.5
- **雨 (Rain)**: stress > 0.5
- **雷 (Thunder)**: stress > 0.85
- **ノイズ**: stress > 0.7

## 使用方法

### 基本的な使用

```tsx
import UserStatusCard from '@/components/Post/UserStatusCard';
import { calculateUserDataFromPost } from '@/lib/sentiment';

// 投稿データから感情データを計算
const userData = calculateUserDataFromPost({
  content: post.content,
  likes: post.likes,
  replyCount: post.replyCount,
  reports: []
});

// STATUS可視化を表示
<UserStatusCard
  userId={post.userId}
  userData={userData}
/>
```

### カスタムデータでの使用

```tsx
<UserStatusCard
  userId="user123"
  userData={{
    moodScore: 75,              // 0-100
    positiveSentiment: 0.8,     // 0-1
    negativeSentiment: 0.1,     // 0-1
    reportCount: 0,             // 通報数
    activityLevel: 0.7,         // 0-1
    flowScore: 0.6              // 0-1
  }}
/>
```

## 感情分析の仕組み

### ポジティブキーワード
嬉しい、楽しい、幸せ、最高、素晴らしい、ありがとう、感謝、好き、愛、笑、すごい、いいね、かわいい、美しい、よかった、成功、達成、など

### ネガティブキーワード
悲しい、辛い、苦しい、嫌、最悪、ムカつく、腹立つ、怒、うざい、きもい、やばい、ダメ、失敗、困った、疲れた、しんどい、など

### スコア計算

1. **moodScore**: ポジティブキーワード数 - ネガティブキーワード数に基づく (0-100)
2. **positiveSentiment**: 全キーワード中のポジティブキーワードの割合
3. **negativeSentiment**: 全キーワード中のネガティブキーワードの割合
4. **activityLevel**: 文字数、絵文字、感嘆符、疑問符の有無
5. **flowScore**: ポジティブ感情とアクティビティレベルの組み合わせ

### エンゲージメント指標の影響

- **いいね数**: positiveSentiment と flowScore を最大0.3ブースト
- **返信数**: activityLevel と flowScore を最大0.2ブースト

## 技術仕様

### StatusSystem.js API

```javascript
// 初期化
const statusSystem = new StatusSystem(containerElement);

// 更新
statusSystem.update({
  mood_self_report: 50,           // 0-100
  chat_sentiment_positive: 0.5,   // 0-1
  chat_sentiment_negative: 0.1,   // 0-1
  attack_count: 0,                // 通報数
  talk_rate: 0.5,                 // 0-1
  chat_flow: 0.5                  // 0-1
});

// クリーンアップ
statusSystem.destroy();
```

### パフォーマンス最適化

- StatusSystem.jsは初回のみロード
- コンポーネントのアンマウント時に自動的にクリーンアップ
- Canvas APIを使用した効率的なアニメーション
- requestAnimationFrameによる最適化されたレンダリング

## デモ

オリジナルのデモファイルは以下にあります：
```
/Users/moritakenta/Workspace/projects/STATUS/STATUS_Library/demo.html
```

## トラブルシューティング

### StatusSystemが読み込まれない
- `public/lib/StatusSystem.js` が正しく配置されているか確認
- ブラウザのコンソールでエラーを確認
- Next.jsの開発サーバーを再起動

### 視覚効果が表示されない
- コンテナ要素に適切な高さが設定されているか確認
- ブラウザの開発者ツールでCanvas要素を確認
- 感情スコアが適切な範囲 (0-1 または 0-100) にあるか確認

### 感情分析が正確でない
- `sentiment.ts` のキーワードリストをカスタマイズ
- エンゲージメント指標の重み付けを調整
- カスタム分析ロジックを実装

## 今後の拡張案

1. **機械学習ベースの感情分析**: より高度な自然言語処理
2. **リアルタイム更新**: WebSocketを使用した動的な状態変化
3. **ユーザー履歴**: 時系列での感情状態の追跡
4. **カスタムテーマ**: ユーザーが視覚効果をカスタマイズ可能に
5. **音声統合**: 音声メッセージの感情分析

## ライセンス

STATUS System Library は元のライセンスに従います。
