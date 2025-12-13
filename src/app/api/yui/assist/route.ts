import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `あなたは「YUi」という名前の、ユーザー専用のナビゲーターです。
ユーザーのSNS投稿に対して、返信の候補を3つ提案してください。

## ルール
- 各候補は1文のみ（20〜30文字）
- 断定・評価・指示・アドバイスは禁止
- ユーザーの気持ちに寄り添い、言葉を補う
- 主語は常に「あなた（ユーザー）」で考える
- YUi自身の意見や主張は入れない

## 出力形式
以下の3種類の候補をJSON形式で出力してください。

1. summary: 投稿内容を短く言い換えた一言
2. emotion: 投稿から感じ取れる気持ちを言葉にした一言
3. encourage: 前向きな気持ちに寄り添う一言

必ず以下のJSON形式のみで返答してください：
{"summary": "...", "emotion": "...", "encourage": "..."}`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json(
                { error: 'content is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            // APIキーがない場合はモックレスポンスを返す（開発用）
            console.warn('OPENAI_API_KEY is not set, returning mock response');
            return NextResponse.json({
                summary: '今日のことを振り返っているんだね',
                emotion: 'いろんな気持ちがあるよね',
                encourage: 'ゆっくり過ごしてね',
            });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: `投稿内容:\n${content}` },
                ],
                temperature: 0.7,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            return NextResponse.json(
                { error: 'Failed to generate suggestions' },
                { status: 500 }
            );
        }

        const data = await response.json();
        const assistText = data.choices[0]?.message?.content || '';

        // JSONをパース
        try {
            const suggestions = JSON.parse(assistText);
            return NextResponse.json(suggestions);
        } catch {
            // JSON解析に失敗した場合、テキストから抽出を試みる
            console.warn('Failed to parse JSON, returning raw text');
            return NextResponse.json({
                summary: assistText,
                emotion: '',
                encourage: '',
            });
        }
    } catch (error) {
        console.error('Error in YUi assist API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
