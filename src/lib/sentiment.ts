/**
 * Sentiment analysis utilities for STATUS integration
 *
 * Algorithm:
 * - Energy: Positive words increase, negative words decrease
 * - Flow: Content length and engagement markers
 * - Mood: Balance of positive vs negative sentiment
 */

// Positive keywords (ポジティブワード) - より多くの単語を追加
const POSITIVE_KEYWORDS = [
    // 感情
    '嬉しい', '楽しい', '幸せ', '喜び', '感動', '感謝', 'ありがとう',
    '好き', '愛', '大好き', '素敵', '素晴らしい', '最高', '最強',
    'ワクワク', 'ドキドキ', '癒し', '癒される', '平和', '穏やか',
    // 笑い
    '笑', 'w', 'ｗ', 'www', 'ｗｗｗ', 'lol', '草', '爆笑', '面白',
    // 評価
    'すごい', 'やばい', 'いいね', 'かわいい', '美しい', 'かっこいい',
    'よかった', 'ナイス', 'グッド', 'good', 'nice', 'great', 'awesome',
    '綺麗', 'きれい', '可愛い', 'かっこいい', '神', 'エモい',
    // 成功
    '成功', '達成', '完成', 'できた', 'やった', '勝利', '合格',
    '頑張', 'がんば', 'ファイト', '応援', 'おめでとう',
    // 自然・美
    '虹', '太陽', '晴れ', '花', '春', '桜', '青空', '光', '輝',
    // 絵文字
    '😊', '😄', '😃', '😁', '🎉', '✨', '💖', '❤️', '🥰', '😍',
    '👍', '🙌', '💪', '🎊', '🌟', '⭐', '💯', '🌈', '☀️', '🌸', '🌺'
];

// Negative keywords (ネガティブワード) - より多くの単語を追加
const NEGATIVE_KEYWORDS = [
    // 感情
    '悲しい', '辛い', '苦しい', '寂しい', '虚しい', '憂鬱',
    '嫌', '嫌い', '最悪', '最低', 'ムカつく', '腹立つ', '怒',
    '泣', '涙', '落ち込', '凹', 'へこ', 'ショック',
    // 状態
    'うざい', 'きもい', 'だるい', '疲れた', 'しんどい', 'つらい',
    'ダメ', '無理', '失敗', '困った', '不安', '心配', '怖い',
    '眠い', '病', '痛', '具合悪', '調子悪',
    // 強い否定
    '死', '消えろ', 'クソ', 'ゴミ', '地獄', '絶望', '終わ',
    // 天気関連
    '雨', '曇', '嵐', '雷', '暗', '寒',
    // 絵文字
    '😢', '😭', '😡', '😠', '💢', '😰', '😱', '😞', '😔', '💔', '☁️', '🌧️', '⛈️'
];

export interface SentimentAnalysis {
    energy: number;        // 0-1: エネルギーレベル
    flow: number;          // 0-1: フロー（文章の長さと勢い）
    mood: number;          // 0-100: 気分スコア
    positiveSentiment: number;  // 0-1: ポジティブ度
    negativeSentiment: number;  // 0-1: ネガティブ度
}

/**
 * Analyze sentiment from post content
 *
 * Algorithm:
 * 1. Count positive and negative keywords
 * 2. Energy = (positive - negative) normalized to 0-1
 * 3. Flow = content length (longer = higher flow)
 * 4. Mood = 50 + (positive * 10) - (negative * 10)
 */
export function analyzePostSentiment(content: string): SentimentAnalysis {
    // Count keywords
    let positiveCount = 0;
    let negativeCount = 0;

    POSITIVE_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) positiveCount += matches.length;
    });

    NEGATIVE_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) negativeCount += matches.length;
    });

    // Calculate Energy (ポジティブワードで上がり、ネガティブワードで下がる)
    // 一つの単語でも大きく影響するように倍率を大幅UP
    const energyRaw = 0.5 + (positiveCount * 0.3) - (negativeCount * 0.35);
    const energy = Math.max(0, Math.min(1, energyRaw));

    // Calculate Flow (長ければフローが上がる)
    // 100文字で0.5, 200文字で1.0 (より早く上がる)
    const contentLength = content.length;
    let flow = Math.min(contentLength / 200, 1.0);

    // 絵文字や記号でフロー増加 (倍率UP)
    const hasEmoji = /[\uD800-\uDFFF]|[\u2600-\u27BF]/.test(content);
    const exclamationCount = (content.match(/[!！]/g) || []).length;
    const questionCount = (content.match(/[?？]/g) || []).length;

    if (hasEmoji) flow = Math.min(flow + 0.2, 1.0);
    flow = Math.min(flow + (exclamationCount * 0.1), 1.0);
    flow = Math.min(flow + (questionCount * 0.05), 1.0);

    // Calculate Mood (0-100) - 一つの単語でも大きく変化するように倍率を大幅UP
    const moodScore = Math.max(0, Math.min(100,
        50 + (positiveCount * 25) - (negativeCount * 25)
    ));

    // Calculate sentiment ratios - より敏感に
    const totalKeywords = positiveCount + negativeCount;

    // 単語が1つでもあれば、その影響を強く反映
    let positiveSentiment = 0.5; // デフォルト中立
    let negativeSentiment = 0.0; // デフォルト中立

    if (totalKeywords > 0) {
        positiveSentiment = positiveCount / Math.max(totalKeywords, 1);
        negativeSentiment = negativeCount / Math.max(totalKeywords, 1);
    } else if (positiveCount > 0) {
        positiveSentiment = 0.8; // ポジティブワードのみ
    } else if (negativeCount > 0) {
        negativeSentiment = 0.8; // ネガティブワードのみ
    }

    return {
        energy,
        flow,
        mood: moodScore,
        positiveSentiment,
        negativeSentiment
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
        moodScore: sentiment.mood,
        energy: Math.min(sentiment.energy + engagementBoost, 1.0),
        positiveSentiment: sentiment.positiveSentiment,
        negativeSentiment: sentiment.negativeSentiment,
        reportCount: post.reports?.length || 0,
        activityLevel: sentiment.flow,
        flowScore: Math.min(sentiment.flow + replyBoost, 1.0)
    };
}
