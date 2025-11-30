/**
 * Sentiment analysis utilities for STATUS integration
 */

// Simple sentiment analysis based on keywords
const POSITIVE_KEYWORDS = [
    '嬉しい', '楽しい', '幸せ', '最高', '素晴らしい', 'ありがとう', '感謝',
    '好き', '愛', '笑', 'w', 'ｗ', '😊', '😄', '😃', '🎉', '✨', '💖', '❤️',
    'すごい', 'いいね', 'かわいい', '美しい', 'よかった', '成功', '達成'
];

const NEGATIVE_KEYWORDS = [
    '悲しい', '辛い', '苦しい', '嫌', '最悪', 'ムカつく', '腹立つ',
    '怒', 'うざい', 'きもい', '死', '😢', '😭', '😡', '😠', '💢',
    'やばい', 'ダメ', '失敗', '困った', '疲れた', 'しんどい'
];

export interface SentimentAnalysis {
    moodScore: number;
    positiveSentiment: number;
    negativeSentiment: number;
    activityLevel: number;
    flowScore: number;
}

/**
 * Analyze sentiment from post content
 */
export function analyzePostSentiment(content: string): SentimentAnalysis {
    const lowerContent = content.toLowerCase();

    // Count positive and negative keywords
    let positiveCount = 0;
    let negativeCount = 0;

    POSITIVE_KEYWORDS.forEach(keyword => {
        const matches = content.match(new RegExp(keyword, 'g'));
        if (matches) positiveCount += matches.length;
    });

    NEGATIVE_KEYWORDS.forEach(keyword => {
        const matches = content.match(new RegExp(keyword, 'g'));
        if (matches) negativeCount += matches.length;
    });

    // Calculate sentiment scores (0-1 range)
    const totalKeywords = positiveCount + negativeCount;
    const positiveSentiment = totalKeywords > 0
        ? Math.min(positiveCount / Math.max(totalKeywords, 5), 1.0)
        : 0.5;

    const negativeSentiment = totalKeywords > 0
        ? Math.min(negativeCount / Math.max(totalKeywords, 5), 1.0)
        : 0.1;

    // Calculate mood score (0-100)
    const moodScore = Math.max(0, Math.min(100,
        50 + (positiveCount * 10) - (negativeCount * 10)
    ));

    // Calculate activity level based on content length and engagement markers
    const wordCount = content.length;
    const hasEmoji = /[\uD800-\uDFFF]/.test(content) || /[\u2600-\u27BF]/.test(content);
    const hasExclamation = /[!！]/.test(content);
    const hasQuestion = /[?？]/.test(content);

    let activityLevel = Math.min(wordCount / 200, 1.0);
    if (hasEmoji) activityLevel = Math.min(activityLevel + 0.2, 1.0);
    if (hasExclamation) activityLevel = Math.min(activityLevel + 0.1, 1.0);
    if (hasQuestion) activityLevel = Math.min(activityLevel + 0.1, 1.0);

    // Calculate flow score (engagement quality)
    const flowScore = Math.min(
        (positiveSentiment * 0.6) + (activityLevel * 0.4),
        1.0
    );

    return {
        moodScore,
        positiveSentiment,
        negativeSentiment,
        activityLevel,
        flowScore
    };
}

/**
 * Calculate user data from post for STATUS visualization
 */
export function calculateUserDataFromPost(post: {
    content: string;
    likes?: number;
    replyCount?: number;
    reports?: any[];
}) {
    const sentiment = analyzePostSentiment(post.content);

    // Factor in engagement metrics
    const engagementBoost = Math.min((post.likes || 0) / 10, 0.3);
    const replyBoost = Math.min((post.replyCount || 0) / 5, 0.2);

    return {
        moodScore: sentiment.moodScore,
        positiveSentiment: Math.min(sentiment.positiveSentiment + engagementBoost, 1.0),
        negativeSentiment: sentiment.negativeSentiment,
        reportCount: post.reports?.length || 0,
        activityLevel: Math.min(sentiment.activityLevel + replyBoost, 1.0),
        flowScore: Math.min(sentiment.flowScore + engagementBoost + replyBoost, 1.0)
    };
}
