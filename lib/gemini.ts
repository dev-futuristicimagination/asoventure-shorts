// lib/gemini.ts — 動的コンテンツ生成（Gemini 2.5 Flash）

const GEMINI_API = 'https://generativelanguage.googleapis.com';

// カテゴリ別ゴール（サービス実態に基づく）
// 【2026-05-07 エンゲージメント誘導追加】全動画: いいね+チャンネル登録+コメント誘導を漏れなく組み込む
const CATEGORY_GOAL: Record<string, string> = {
  cheese:    '目的: Cheese LINE登録への直接誘導。「LINEにひと言送るだけでAIがガクチカを作ります」「無料LINE登録」という具体的な機能訴求でOK。ナレーション末尾: 「いいね👍とチャンネル登録で毎日tips！あなたのガクチカに困ったことある？コメントで教えて！」',
  job:       '目的: 就活生をCheese LINE登録へ橋渡し。就活tips（ES・面接・ガクチカ）を30秒で完結させ「詳しくはCheese無料登録で」と締める。ナレーション末尾: 「いいね👍とチャンネル登録で毎日就活tips！就活で一番困ってること、コメントで教えて！」',
  health:    '目的: チャンネル登録獲得。「パンダ子が教える30秒健康tips」として動画内で完結させる。「AIが〜」は使わない。ナレーション末尾: 「いいね👍とチャンネル登録で毎日健康tips！あなたは毎日何時間寝てる？コメントで教えて！」',
  finance:   '目的: チャンネル登録獲得。「キツネ子が教える30秒お金tips」として動画内で完結させる。「AIが〜」は使わない。具体的な数字・方法を1つ完結で伝える。ナレーション末尾: 「いいね👍とチャンネル登録で毎日お金tips！NISAやってる？コメントで教えて！」',
  education: '目的: チャンネル登録獲得。「エデュさが教える30秒学習tips」として動画内で完結させる。「AIが〜」は使わない。英語・資格の具体的な方法を1つ完結で伝える。ナレーション末尾: 「いいね👍とチャンネル登録で毎日学習tips！今どんな勉強してる？コメントで教えて！」',
  life:      '目的: チャンネル登録獲得。「ライかえが教える30秒暮らしtips」として動画内で完結させる。「AIが〜」は使わない。節約・家事・料理の具体的なtipsを1つ完結で伝える。ナレーション末尾: 「いいね👍とチャンネル登録で毎日暮らしtips！あなたのとっておき節約術、コメントで教えて！」',
  music1963: '目的: music1963.comへの誘導。「レコたんが選ぶ昭和名曲○位は〜」という形で曲情報を伝え「フルランキングはmusic1963.com」で締める。「AIが〜」は使わない。ナレーション末尾: 「いいね👍とチャンネル登録でランキング更新通知！好きな昭和歌謡、コメントで教えて！」',
};

const CATEGORY_LABEL: Record<string, string> = {
  cheese: '就活AI', job: '就活・キャリア', health: '健康・メンタルウェルネス',
  finance: 'お金・投資', education: '学習・スキルアップ', life: 'ライフスタイル', music1963: '昭和歌謡・音楽',
};

export async function generateDynamicContent(
  topic: string,
  baseNarration: string,
  category: string
): Promise<{ narration: string; youtubeDescription: string }> {
  const key = process.env.GEMINI_API_KEY!;
  const label = CATEGORY_LABEL[category] || category;
  const goal = CATEGORY_GOAL[category] || '目的: チャンネル登録獲得。30秒完結tipsとして動画内で完結させる。ナレーション末尾: 「いいね👍とチャンネル登録で毎日tips！コメントで感想を教えて！」';

  const prompt = `あなたはYouTube Shortsのコンテンツプロデューサーです。
カテゴリ: ${label}
トピック: ${topic}
ベースナレーション: ${baseNarration}
ターゲット: 20代・就活生・社会人1〜3年目

【重要】${goal}

【エンゲージメント設計（全動画必須）】
- いいね誘導: 「いいね👍を押してね」か「いいねお願いします」を含める
- チャンネル登録誘導: 「チャンネル登録で毎日tips！」を含める
- コメント誘導: 視聴者が答えやすい質問（Yes/No or 一言で答えられるもの）を最後に入れる

以下をJSON形式で返してください:
{
  "narration": "上記ゴールに沿って、共感・具体性・フックを強化した30秒以内の自然な日本語ナレーション。エンゲージメント誘導（いいね・チャンネル登録・コメント）を末尾に含める。100文字以内。",
  "youtubeDescription": "YouTube説明欄用テキスト3〜4文。トピックの背景・具体的なtips・視聴者へのメッセージ。上記ゴールのCTAを最後に含める。200文字以内。"
}
JSONのみ返してください。`;

  try {
    const res = await fetch(
      `${GEMINI_API}/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
        }),
      }
    );
    const json = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(text) as { narration: string; youtubeDescription: string };
    if (parsed.narration && parsed.youtubeDescription) return parsed;
  } catch (e) {
    console.warn(`[shorts] 動的生成失敗 → ベース使用: ${e}`);
  }
  return { narration: baseNarration, youtubeDescription: baseNarration };
}

// ─── X投稿文生成（記事→X投稿）────────────────────────────────────────────
// 【2026-05-07 Article Pipeline用】記事からX（Twitter）用投稿文を自動生成
const X_CTA: Record<string, string> = {
  cheese:    '🧀 LINEでガクチカAI生成（無料）→ https://lin.ee/8VAVNEk',
  job:       '🧀 ガクチカAI生成→ https://lin.ee/8VAVNEk',
  health:    '📺 毎日健康tips→ https://www.youtube.com/@asoventure_project',
  finance:   '📺 毎日お金tips→ https://www.youtube.com/@asoventure_project',
  education: '📺 毎日学習tips→ https://www.youtube.com/@asoventure_project',
  life:      '📺 毎日暮らしtips→ https://www.youtube.com/@asoventure_project',
  music1963: '🎵 フルランキング→ https://music1963.com',
};

const X_HASHTAGS: Record<string, string> = {
  cheese: '#就活 #ガクチカ #ES #AI #就活生',
  job:    '#就活 #面接対策 #キャリア #社会人',
  health: '#健康 #ライフスタイル #ダイエット #メンタル',
  finance:'#NISA #節約 #投資 #お金 #副業',
  education: '#勉強 #英語 #資格 #TOEIC',
  life:   '#暮らし #節約 #料理 #一人暮らし',
  music1963: '#昭和歌謡 #懐かしの名曲 #音楽',
};

export async function generateXPost(
  article: { title: string; url: string; excerpt: string },
  category: string
): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const cta = X_CTA[category] || '';
  const hashtags = X_HASHTAGS[category] || `#${category}`;

  const prompt = `以下の記事をX（Twitter）用の投稿文に変換してください。

記事タイトル: ${article.title}
記事の抜粋: ${article.excerpt.slice(0, 200)}

条件:
- 冒頭は絵文字+タイトル（疑問形OK）で始める
- 本文は箇条書き3点（① ② ③）で記事の核心を伝える
- 記事に書いていないことは書かない
- フォロー誘導「フォローで毎日tips👇」を含める
- RT誘導「参考になったらRT/いいね🙏」を含める
- 全体120文字以内（URL・ハッシュタグ除く）
- JSONで返す: {"post": "投稿本文（URL・ハッシュタグなし）"}`;

  try {
    const res = await fetch(
      `${GEMINI_API}/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      }
    );
    const json = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(text) as { post: string };
    if (parsed.post) {
      return [parsed.post, '', `📖 詳しく→ ${article.url}`, '', cta, '', hashtags].join('\n').slice(0, 280);
    }
  } catch (e) {
    console.warn(`[xpost] 生成失敗: ${e}`);
  }
  // フォールバック
  return [`📖 ${article.title}`, '', `詳しく→ ${article.url}`, '', cta, '', hashtags].join('\n').slice(0, 280);
}

export async function notifyDiscord(msg: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `🎬 **Shorts Bot**\n${msg}`.slice(0, 2000) }),
  }).catch(() => {});
}
