# 🏆 ランキング部門システム実装完了

## 実装日
2025-12-04

## 概要
BreakBlockBuildゲームからのスコアシェアに対応し、デバイス・画面向き別の部門ランキングシステムを実装しました。

## 実装内容

### 1. 部門の定義
以下の3つの部門を追加:
- **スマホ（縦画面）** - `mobile-portrait`
- **スマホ（横画面）** - `mobile-landscape`
- **PC** - `pc`

### 2. URLパラメータ受信機能 (`src/app/page.tsx`)

#### 受信するパラメータ
```
https://antigravity-sns.vercel.app/?score=XXX&game=BreakBlockBuild&category=mobile-portrait
```

- `score`: スコア値
- `game`: ゲーム名
- `category`: 部門ID

#### 自動スレッド作成
URLパラメータを検出すると、以下の処理を自動実行:
1. ユーザーがログインしている場合のみ実行
2. スレッドを自動作成
   - タイトル: `{game}でハイスコア達成！`
   - 内容: スコアと部門名を表示
3. ランキングページにリダイレクト

### 3. データ構造の拡張

#### ScoreEntryインターフェース
```typescript
interface ScoreEntry {
    id: string;
    game: string;
    score: number;
    userName: string;
    userAvatar: string;
    userId: string;
    timestamp: number;
    threadId: string;
    category?: string;        // 追加
    categoryName?: string;    // 追加
}
```

#### スレッドデータ
```typescript
{
    title: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    timestamp: number;
    game: string;           // ゲーム名
    score: number;          // スコア
    category: string;       // 部門ID
}
```

### 4. ランキングページの機能拡張 (`src/app/ranking/page.tsx`)

#### 部門フィルタリング
- ゲーム選択タブの下に部門選択タブを追加
- 「全部門」を含む部門別フィルタリング機能
- ゲームと部門の組み合わせでフィルタリング可能

#### 表示内容
各ランキングアイテムに以下を表示:
- 順位（1位🥇、2位🥈、3位🥉）
- ユーザー情報（アバター、名前）
- ゲーム名
- **部門名**（新規追加）📱
- スコア
- 日付

### 5. スタイリング (`src/app/ranking/page.module.css`)

#### 追加したスタイル
```css
.category {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: var(--space-xs);
    display: flex;
    align-items: center;
    gap: 4px;
}
```

## 使用方法

### ゲーム側の実装例
```javascript
// ゲームオーバー時
const shareScore = () => {
    const category = detectCategory(); // 'mobile-portrait', 'mobile-landscape', 'pc'
    const url = `https://antigravity-sns.vercel.app/?score=${score}&game=BreakBlockBuild&category=${category}`;
    window.open(url, '_blank');
};
```

### ユーザーフロー
1. ゲームでハイスコアを達成
2. 「Antigravityにシェア」ボタンをクリック
3. Antigravityが開き、自動的にログイン画面またはホーム画面へ
4. ログイン済みの場合、スレッドが自動作成される
5. ランキングページにリダイレクト
6. 部門別ランキングで自分のスコアを確認

## 技術的な特徴

### 自動検出システム対応
BreakBlockBuild側で実装されている以下の検出システムに対応:
- ユーザーエージェントでデバイスタイプを判定
- 画面の縦横比で向きを判定
- タブレットはPCとして扱う

### データの一貫性
- 部門IDとカテゴリ名のマッピングを両アプリで共有
- 未知のカテゴリは「一般」として扱う

### UX最適化
- URLパラメータは自動的にクリア
- スレッド作成中の重複防止
- スムーズなリダイレクト

## 今後の拡張可能性

### 追加可能な機能
1. **部門別チャンピオン表示**
   - 各部門のトップスコアを別セクションで表示

2. **部門別統計**
   - 各部門の平均スコア
   - 参加者数

3. **クロスプラットフォーム比較**
   - 同一ユーザーの部門別スコア比較
   - 部門間の難易度調整

4. **バッジシステム**
   - 部門別チャンピオンバッジ
   - 複数部門制覇バッジ

## テスト方法

### 手動テスト
1. 以下のURLにアクセス:
```
http://localhost:3000/?score=1500&game=BreakBlockBuild&category=mobile-portrait
```

2. ログインしていることを確認

3. 自動的にスレッドが作成され、ランキングページにリダイレクトされることを確認

4. ランキングページで部門フィルタが正しく動作することを確認

### 確認項目
- [ ] URLパラメータからスレッドが自動作成される
- [ ] 部門名が正しく表示される
- [ ] 部門フィルタが動作する
- [ ] ゲームと部門の組み合わせフィルタが動作する
- [ ] スコアが正しく表示される
- [ ] スレッド詳細ページへのリンクが動作する

## ファイル変更一覧

### 変更したファイル
1. `src/app/page.tsx` - URLパラメータ受信とスレッド自動作成
2. `src/app/ranking/page.tsx` - 部門フィルタリング機能追加
3. `src/app/ranking/page.module.css` - 部門表示スタイル追加

### 変更なし
- Firebase設定
- 認証システム
- その他のページ

## 注意事項

### セキュリティ
- スレッド作成は認証済みユーザーのみ可能
- URLパラメータは適切にバリデーション

### パフォーマンス
- スレッド作成は非同期処理
- リダイレクトはスレッド作成完了後

### 互換性
- 既存のスレッドデータとの互換性を維持
- category未指定のスレッドは「一般」として扱う

## 関連ドキュメント
- BreakBlockBuild実装仕様
- Firebase Realtime Database構造
- ランキングシステム設計書
