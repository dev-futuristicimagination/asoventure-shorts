// lib/gemini.ts — 動的コンテンツ生成（Gemini 2.5 Flash）

const GEMINI_API = 'https://generativelanguage.googleapis.com';

// カテゴリ別ゴール（サービス実態に基づく）
const CATEGORY_GOAL: Record<string, string> = {
  cheese:    '目的: Cheese LINE登録への直接誘導。「AIが自動でガクチカを作ります」「LINEで無料体験」という具体的な機能訴求でOK。最後は「Cheese LINE登録で無料体験」で締める。',
  job:       '目的: 就活生をCheese LINE登録へ橋渡し。就活tips（ES・面接・ガクチカ）を30秒で完結させ、最後は「詳しくはCheese無料登録で」と締める。「AIが〜してくれます」はCheeseの機能として使ってよい。',
  health:    '目的: チャンネル登録獲得。「パンダ子が教える30秒健康tips」として動画内で完結させる。「AIが〜」は使わない。最後は「チャンネル登録で毎日tips」で締める。',
  finance:   '目的: チャンネル登録獲得。「キツネ子が教える30秒お金tips」として動画内で完結させる。「AIが〜」は使わない。NISAや節約の具体的な数字・方法を1つ完結で伝える。最後は「チャンネル登録で毎日tips」で締める。',
  education: '目的: チャンネル登録獲得。「エデュさが教える30秒学習tips」として動画内で完結させる。「AIが〜」は使わない。英語・資格の具体的な方法を1つ完結で伝える。最後は「チャンネル登録で毎日tips」で締める。',
  life:      '目的: チャンネル登録獲得。「ライかえが教える30秒暮らしtips」として動画内で完結させる。「AIが〜」は使わない。節約・家事・料理の具体的なtipsを1つ完結で伝える。最後は「チャンネル登録で毎日tips」で締める。',
  music1963: '目的: music1963.comへの誘導。「レコたんが選ぶ昭和名曲○位は〜」という形で曲情報を伝え、最後は「フルランキングはmusic1963.com」で締める。「AIが〜」は使わない。',
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
  const goal = CATEGORY_GOAL[category] || '目的: チャンネル登録獲得。30秒完結tipsとして動画内で完結させる。';

  const prompt = `あなたはYouTube Shortsのコンテンツプロデューサーです。
カテゴリ: ${label}
トピック: ${topic}
ベースナレーション: ${baseNarration}
ターゲット: 20代・就活生・社会人1〜3年目

【重要】${goal}

以下をJSON形式で返してください:
{
  "narration": "上記ゴールに沿って、共感・具体性・フックを強化した30秒以内の自然な日本語ナレーション。80文字以内。",
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

export async function notifyDiscord(msg: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `🎬 **Shorts Bot**\n${msg}`.slice(0, 2000) }),
  }).catch(() => {});
}
