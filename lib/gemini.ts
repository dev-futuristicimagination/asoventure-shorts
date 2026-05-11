// lib/gemini.ts — 動的コンテンツ生成（Gemini 2.5 Flash）
// 【2026-05-10 プロデューサー改訂v2】
//  - health/finance からのCheese誘導を強化
//  - A/Bテスト用タイトル2案を同時生成
//  - カテゴリ別タイトル勝ちフォーマット強制

const GEMINI_API = 'https://generativelanguage.googleapis.com';

// カテゴリ別ゴール（サービス実態に基づく）
// 【2026-05-10 health/finance → Cheese誘導追加】
const CATEGORY_GOAL: Record<string, string> = {
  cheese:    '目的: Cheese LINE登録への直接誘導。「LINEにひと言送るだけでAIがガクチカを作ります」「無料LINE登録」という具体的な機能訴求でOK。ナレーション末尾: 「いいね👍とチャンネル登録で毎日tips！あなたのガクチカに困ったことある？コメントで教えて！」',
  job:       '目的: 就活生をCheese LINE登録へ橋渡し。就活tips（ES・面接・ガクチカ）を30秒で完結させ「詳しくはCheese無料登録で」と締める。ナレーション末尾: 「いいね👍とチャンネル登録で毎日就活tips！就活で一番困ってること、コメントで教えて！」',
  health:    '目的: 健康tips完結 + 就活・体調管理の橋渡し。「体調管理が就活・仕事のパフォーマンスに直結する」角度でCheese AIコーチへの橋渡しを末尾に入れる。ナレーション末尾: 「いいね👍とチャンネル登録で毎日tips！就活・仕事のパフォーマンスを上げたい人は cheese.asoventure.jp もチェック！コメントで教えて！」',
  finance:   '目的: お金tips完結 + 年収アップ・転職への橋渡し。「手取りを増やす最速ルートは転職・キャリアアップ」角度でCheese AIコーチへのCTAを末尾に入れる。ナレーション末尾: 「いいね👍とチャンネル登録で毎日tips！年収アップに転職も視野に入れてる人は cheese.asoventure.jp で相談！」',
  education: '目的: チャンネル登録獲得。「エデュさが教える30秒学習tips」として動画内で完結させる。「AIが〜」は使わない。英語・資格の具体的な方法を1つ完結で伝える。ナレーション末尾: 「いいね👍とチャンネル登録で毎日学習tips！今どんな勉強してる？コメントで教えて！」',
  life:      '目的: チャンネル登録獲得。「ライかえが教える30秒暮らしtips」として動画内で完結させる。「AIが〜」は使わない。節約・家事・料理の具体的なtipsを1つ完結で伝える。ナレーション末尾: 「いいね👍とチャンネル登録で毎日暮らしtips！あなたのとっておき節約術、コメントで教えて！」',
  music1963: '目的: music1963.comへの誘導。「レコたんが選ぶ昭和名曲○位は〜」という形で曲情報を伝え「フルランキングはmusic1963.com」で締める。「AIが〜」は使わない。ナレーション末尾: 「いいね👍とチャンネル登録でランキング更新通知！好きな昭和歌謡、コメントで教えて！」',
};

const CATEGORY_LABEL: Record<string, string> = {
  cheese: '就活AI', job: '就活・キャリア', health: '健康・メンタルウェルネス',
  finance: 'お金・投資', education: '学習・スキルアップ', life: 'ライフスタイル', music1963: '昭和歌謡・音楽',
};

// ─── カテゴリ別タイトル勝ちフォーマット ────────────────────────────────────
const TITLE_FORMAT_RULES: Record<string, string> = {
  cheese: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「ES自動生成！就活生が知らないAIの使い方5選」「ガクチカ0分で完成！LINE AIコーチが革命的すぎた」
✅ 型: 【数字+具体名詞】または【インパクトワード+具体的体験】
❌ NGワード: 「失敗する人の〜」「〜とは？」「〜について」「共通点」
必須要素: 数字(5選/3つ/○分)か具体的行動を含む`,

  job: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「就活生必見！面接で好印象を与えるコツ5選」「ガクチカが書けない人がやりがちなNG3つ」
✅ 型: 【就活生必見/内定者直伝】+【数字+具体場面】
❌ NGワード: 「プレッシャー」「辛い」「悩み」「共通点」
必須要素: ターゲット明示（就活生・大学生）+ 数字`,

  health: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「自律神経を整える生活習慣5選」「就活・仕事で疲れが取れない人必見！睡眠改善法3つ」
✅ 型: 【○○を改善する△選】または【仕事/就活に効く○○N選】
❌ NGワード: 「〜の共通点」「〜とは？」
必須要素: 数字(5選/3つ)+ 具体的な体の部位や状態、またはビジネス文脈`,

  finance: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「GW明けの家計リセット法5選！」「手取り月30万→40万にした転職術」
✅ 型: 【具体的な金額・数字】+【手取り/節約/増やす方法】
❌ NGワード: 「知っておくべき」「理由」「共通点」「とは？」
必須要素: 具体的な金額や数字を必ず含む`,

  education: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「TOEIC800点を3ヶ月で取る勉強法5選」「英単語を最速で覚えるコツ3つ」
✅ 型: 【目標スコア/期間】+【方法・コツN選】
必須要素: 具体的な資格名・スコア・期間`,

  life: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「一人暮らしで月1万節約できた方法3つ」「GW明け！家計リセット術5選」
✅ 型: 【具体的なシーン/時期】+【節約/改善/方法N選】
必須要素: 具体的な金額か時期`,

  music1963: `タイトルフォーマット（必ず以下の型を使う）:
✅ 良い例: 「さだまさし名曲ランキング！昭和の心に刻まれた歌3選」「昭和歌謡の神曲TOP5！あなたは何曲知ってる？」
✅ 型: 【アーティスト名/年代】+【ランキング・TOP・名曲N選】
必須要素: ランキング番号・アーティスト名・「昭和」キーワード`,
};

// ─── 【2026-05-10追加】A/Bテスト用: タイトルを2パターン同時生成 ─────────────
// パターンA: 数字+選型（例: 「5つのコツ」）
// パターンB: 体験談型（例: 「やってみたら革命的だった」）
export async function generateDynamicContent(
  topic: string,
  baseNarration: string,
  category: string
): Promise<{ narration: string; youtubeDescription: string; title?: string; titleB?: string }> {
  const key = process.env.GEMINI_API_KEY!;
  const label = CATEGORY_LABEL[category] || category;
  const goal = CATEGORY_GOAL[category] || '目的: チャンネル登録獲得。30秒完結tipsとして動画内で完結させる。ナレーション末尾: 「いいね👍とチャンネル登録で毎日tips！コメントで感想を教えて！」';
  const titleRules = TITLE_FORMAT_RULES[category] || '';
  // 【2026-05-11 修正】年号を動的取得（「2025年版」誤記を防ぐ）
  const currentYear = new Date().getFullYear(); // 2026, 2027...
  // 実測データ: 視聴者の46%が30〜40代男性（転職・副業検討層）
  const targetAudience = category === 'cheese'
    ? '22〜26歳・就活生・大学生・大学院生'
    : '25〜44歳・転職検討中の社会人・副業に興味がある会社員';

  const prompt = `あなたはYouTube Shortsのコンテンツプロデューサーです。
カテゴリ: ${label}
トピック: ${topic}
ベースナレーション: ${baseNarration}
ターゲット: ${targetAudience}
現在年: ${currentYear}年（「〜年版」「〜年最新」のように年号を使う場合は必ず${currentYear}年と書くこと。2025年と書いてはいけない）

【重要】${goal}

【エンゲージメント設計（全動画必須）】
- いいね誘導: 「いいね👍を押してね」か「いいねお願いします」を含める
- チャンネル登録誘導: 「チャンネル登録で毎日tips！」を含める
- コメント誘導: 視聴者が答えやすい質問（Yes/No or 一言で答えられるもの）を最後に入れる

【タイトル生成ルール（A/Bテスト用: 2パターン必須）】
${titleRules || '数字+具体的な行動・場面を組み合わせたタイトルを生成。'}
- titleA: 数字+選型（「〜5選」「〜3つのコツ」など）
- titleB: 体験談・インパクト型（「〜してみたら革命的だった」「〜を知らないまま損していた」など）
- 年号が必要な場合は必ず「${currentYear}年」を使う（「2025年」は絶対禁止）
- 両方に末尾「 #Shorts」を付ける

以下をJSON形式で返してください:
{
  "titleA": "数字+選型タイトル（40文字以内）末尾に #Shorts",
  "titleB": "体験談・インパクト型タイトル（40文字以内）末尾に #Shorts",
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
    const parsed = JSON.parse(text) as { narration: string; youtubeDescription: string; titleA?: string; titleB?: string };
    if (parsed.narration && parsed.youtubeDescription) {
      return {
        narration: parsed.narration,
        youtubeDescription: parsed.youtubeDescription,
        title: parsed.titleA,   // A案をメインタイトルに
        titleB: parsed.titleB,  // B案はA/Bテスト用に保持
      };
    }
  } catch (e) {
    console.warn(`[shorts] 動的生成失敗 → ベース使用: ${e}`);
  }
  return { narration: baseNarration, youtubeDescription: baseNarration };
}

// ─── X投稿文生成（記事→X投稿）────────────────────────────────────────────
const X_CTA: Record<string, string> = {
  cheese:    '🧀 LINEでガクチカAI生成（無料）→ https://lin.ee/8VAVNEk',
  job:       '🧀 ガクチカAI生成→ https://lin.ee/8VAVNEk',
  // 【2026-05-10】health/finance → Cheese誘導を追加
  health:    '💪 体調管理×キャリアUP → https://cheese.asoventure.jp?utm_source=x&utm_medium=health',
  finance:   '💰 年収UP・転職相談 → https://cheese.asoventure.jp?utm_source=x&utm_medium=finance',
  education: '📺 毎日学習tips→ https://www.youtube.com/@asoventure_project',
  life:      '📺 毎日暮らしtips→ https://www.youtube.com/@asoventure_project',
  music1963: '🎵 フルランキング→ https://music1963.com',
};

const X_HASHTAGS: Record<string, string> = {
  cheese: '#就活 #ガクチカ #ES #AI #就活生',
  job:    '#就活 #面接対策 #キャリア #社会人',
  health: '#健康 #ライフスタイル #ダイエット #メンタル #就活',
  finance:'#NISA #節約 #投資 #お金 #副業 #転職',
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
