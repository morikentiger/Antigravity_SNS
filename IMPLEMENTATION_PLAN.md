# Antigravity – YUi One-Line Assist
## Implementation Plan (MVP)

---

## 1. Scope（この実装でやること）

本実装では、Antigravityの投稿に対して
**YUi（ユーザー専用AIナビ）が「一言補足」を提案し、
ユーザーが選択した1文を返信として投稿できる機能**を実装する。

### MVPのゴール
- 投稿に対してYUiが3つの候補文を提示できる
- ユーザーが1つ選んで返信として投稿できる
- 返信は「YUiによる投稿」として明示される
- **マスターであるユーザー本人が、YUi投稿をいつでも削除できる**

---

## 2. Architecture Overview

### Components
- Frontend (Post Detail UI)
- Backend API (YUi Assist API)
- LLM API (text generation)
- Database (posts / replies)

YUiは独立したユーザーではなく、
**ユーザーに紐づく「発話補助機能」**として扱う。

---

## 3. Data Model

### Post
- id
- user_id
- content
- created_at

### Reply
- id
- post_id
- content
- author_type: "user" | "YUi"
- master_user_id（YUi投稿の場合のみ）
- created_at
- deleted_at (nullable)

### Policy
- `author_type === "YUi"` の投稿は
  `master_user_id === current_user_id` の場合のみ削除可能

---

## 4. YUi Assist API

### Endpoint
`POST /api/yui/assist`

### Input
```json
{
  "post_id": "string",
  "content": "string"
}
```

### Prompt Logic

固定プロンプトを使用し、以下3種の候補を生成する。

1. 要約（内容を短く整理）
2. 感情（気持ちの言語化）
3. 応援（前向きな一言）

制約：

* 各候補は1文のみ
* 20〜30文字程度
* 断定・評価・指示は禁止

### Output

```json
{
  "summary": "string",
  "emotion": "string",
  "encourage": "string"
}
```

---

## 5. Frontend Flow

### 5.1 UI Entry

* 投稿詳細画面にボタンを表示
  **「YUiに一言補足してもらう」**

### 5.2 Candidate Selection

* ボタン押下 → API呼び出し
* 3候補をモーダル or インラインで表示
* 各候補に「これで返信」ボタン

### 5.3 Reply Creation

* ユーザーが1つ選択
* 選択された文のみをReplyとして保存
* 表示名：
  **YUi（◯◯のナビ）**

---

## 6. Delete Flow（重要）

### 対象

* `author_type === "YUi"` の返信投稿

### UI

* マスターユーザー本人にのみ
  「削除」ボタンを表示
* 削除は即時反映（ソフトデリート）

### Backend

* DELETE /api/replies/{id}
* 権限チェック：

  * current_user_id === reply.master_user_id

### Delete Policy

* YUi投稿は**気軽に消せることを最優先**
* 復元機能はMVPでは実装しない

---

## 7. Things NOT Included (Out of Scope)

* 自動返信
* 音声対応
* 編集機能
* 人格成長・学習
* 複数回のYUi返信
* 他人の投稿へのYUi介入

---

## 8. Implementation Order

1. データモデル拡張（Reply / author_type）
2. YUi Assist API 実装
3. 投稿詳細UIにボタン追加
4. 候補表示UI実装
5. YUi返信投稿処理
6. 削除フロー実装
7. 最低限のE2Eテスト

---

## 9. Definition of Done

* 投稿 → YUi候補 → 選択 → 返信 が成立する
* YUi投稿が明確に区別されて表示される
* マスターがYUi投稿を**ワンタップで削除できる**
* YUiが主導権を持たない設計が守られている

---

## 10. Notes

YUiは「賢さ」を見せる存在ではない。
**ユーザーが声を出すための補助輪**である。

この前提を破る実装は、すべて却下する。
