// app/api/cheese/route.ts — マップ君（黒猫♂）就活・転職 AI Shorts
// 【5月実データ分析結果に基づく戦略】
// ✅ ターゲット拡張: 就活生だけでなく転職者・社会人（キャリア全般）
// ✅ コンテンツ型: 「〇〇より〇〇の理由」知識tips型（5月1位1,590回のDNA）
// ✅ エンゲージメント: 「使っているAIツールをコメントで教えて↓」
// ✅ CTA: AIキャリアコーチ + LINE無料相談の組み合わせ
// ❌ RPGカード型・機能訴求型は5月データで根拠なし → 後回し

import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const MAPKUN = `2.5D anime style VTuber character "Map-kun": young male black cat, jet-black fur with white chest patch, navy blue explorer jacket with golden compass badge, khaki cargo shorts, black cat ears with inner gold, compass accessory, Cheese-yellow color accent. Bright confident expression. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '💬 使っているAIツールをコメントで教えて↓',
    '',
    '🤖 AIキャリアコーチ（無料）',
    'https://cheese.asoventure.jp?utm_source=youtube&utm_medium=shorts&utm_campaign=mapkun_cheese',
    '🧀 無料LINEキャリア相談',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=mapkun_line',
    '',
    '#転職 #キャリア #就活 #AI #仕事術 #Shorts #スキルアップ #社会人',
  ],
  tags: ['転職', 'キャリア', '就活', 'AI', '仕事術', 'Shorts', 'スキルアップ', '社会人', '副業', '就職'],
  ytCategoryId: '27',
};

// ─── 動画プール（20本：知識tips型・転職者含むキャリア全般）────
const POOLS: ShortItem[] = [
  // === 5月1位DNA継承: 「〇〇より〇〇の理由」比較型 ===
  {
    topic: '資格より実績が転職で有利な理由',
    title: '資格取得より実績が転職を有利にする理由💡',
    narration: '転職で資格より実績の方が有利な理由を知ってる？面接官が見ているのは「何ができるか」。資格は補強材料、実績が主役です。AIキャリアコーチで整理してみよう！',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} holding two signs "資格" vs "実績", bold white text "転職で有利なのはどっち？" at top. Scene: Map-kun explains with animated scale tipping toward "実績". Resume with achievements glows brighter than certificate. Clean career coaching aesthetic. Upbeat BGM.`,
  },
  {
    topic: '学歴より何を示すかが大事',
    title: '学歴より大切なこと、転職面接で採用担当が本当に見ているもの',
    narration: '学歴が高くても落ちる。学歴が低くても受かる。面接官が本当に見ているのは「この人と働けるか」「問題を解決できるか」の2点だけです。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with diploma vs experience icon, bold text "面接官が本当に見るもの". Scene: two candidates comparison - one with many degrees, one with clear achievements. Interviewer chooses achiever. Revelation moment with bright light.`,
  },
  {
    topic: '年収アップの転職タイミング',
    title: '年収が上がる転職のタイミングと絶対NG時期⚠️',
    narration: '転職して年収が上がる人と下がる人の違いは何？1番の違いは「タイミング」。景気敏感業種では3〜4月と9〜10月が採用ピーク。このタイミングを外すだけで年収交渉力が変わります。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with calendar and salary chart going up, bold text "年収UPの転職タイミング！". Scene: Map-kun shows calendar with good/bad periods highlighted in green/red. Salary graph animated. Smart timing concept visualization.`,
  },
  {
    topic: '転職回数が多い人の面接対策',
    title: '転職回数多い人でも内定を取る答え方の型📋',
    narration: '転職回数が多くて不安な人へ。回数より「なぜ変わったか」の説明が重要。一貫したキャリアテーマを作れば、転職回数は武器になります。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with multiple company logos forming upward arrow, bold text "転職多い人の面接対策！". Scene: Map-kun reframes job-hopping as career exploration narrative. Each company becomes stepping stone animation. Confident final pose.`,
  },
  {
    topic: '30代の転職で失敗しない方法',
    title: '30代転職で失敗する人の共通点と回避策🎯',
    narration: '30代の転職で失敗する人の9割は「前の会社と同じ環境」を求める。新しい環境に適応する覚悟と、自分のマーケットバリューを正確に把握することが成功の鍵。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} at career crossroads with age "30" marker, bold text "30代転職の落とし穴！". Scene: Map-kun navigates decision tree, shows wrong vs right path choices. Market value meter displaying. Strategic career map visualization.`,
  },
  // === 就活生向け知識tips型 ===
  {
    topic: 'ガクチカに使える経験の選び方',
    title: 'ガクチカに選ぶべき経験と選ぶべきでない経験の違い',
    narration: 'ガクチカで落ちる人は「すごい体験」を探しがち。でも採用担当が見ているのは「どう考えたか」「何を学んだか」。普通の経験でも語り方次第で最強になります。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with "凡人経験" glowing like a gem, bold text "ガクチカの選び方！". Scene: ordinary part-time job experience transformed into compelling story through AI coaching. Story structure: situation→action→result appearing as building blocks.`,
  },
  {
    topic: 'ES通過率を上げる一行目の書き方',
    title: 'ESの一行目で9割が決まる。採用担当が読む秒数は？',
    narration: 'ESの一行目で採用担当の興味を引けるかどうかが勝負。平均して最初の3秒で流し読みするかじっくり読むかが決まります。結論から書く、それだけで通過率が変わる。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with stopwatch and ES paper, bold text "一行目で9割決まる！". Scene: recruiter speed-reading ES papers, camera slows down on compelling first line. Before/after ES comparison with the good one getting attention.`,
  },
  {
    topic: 'AI就活ツールの使い方',
    title: '就活でAIを使う学生と使わない学生の差がやばすぎた',
    narration: '2026年、AIを使う就活生と使わない就活生の差は歴然。ES作成・面接練習・業界研究まで全部AIで効率化。あなたはどちら側に立つ？',
    videoPrompt: `Opening thumbnail frame: split screen ${MAPKUN} efficient AI side vs struggling traditional side, bold text "AI就活生 vs 旧来型". Scene: time-lapse comparison - AI user finishes ES in 10 min, traditional user still working hours later. Dramatic gap. Strong motivation.`,
  },
  {
    topic: '面接で差がつく質問への答え方',
    title: '「あなたの弱みは？」面接官が求める本当の答え方',
    narration: '「弱みは何ですか？」これで落ちる人が多い。正解は「弱み→改善努力→成長」の3点セット。正直に弱みを言いながら成長意欲も見せる。これが採用担当の求める答えです。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} confident with "弱み→強み変換" formula, bold text "弱みの正しい答え方！". Scene: weakness question appear as obstacle, Map-kun uses transformation formula to turn it into strength showcase. Interviewer nods approvingly.`,
  },
  {
    topic: '内定後に大切な準備',
    title: '内定後に絶対やるべき3つのこと【就活生必見】',
    narration: '内定おめでとう。でも内定後が本当のスタート。①入社前スキル準備②業界知識のインプット③人脈形成。この3つを今から始めた人が新卒1年目で差をつけます。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with "内定" badge and checklist, bold text "内定後にやるべき3つ！". Scene: countdown to job start with 3 tasks lighting up one by one. Map-kun checks each preparation item. Confident readiness visualization.`,
  },
  // === キャリア全般・社会人向け ===
  {
    topic: '副業で稼げる人と稼げない人の違い',
    title: '副業で月5万稼げる人と稼げない人の決定的な違い',
    narration: '副業で稼げる人と稼げない人、違いは何？「スキルがあるか」じゃない。「継続できるか」と「マーケットに合っているか」の2点だけ。Cheeseで自分に合う副業を探してみて。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with ¥50,000 monthly target, bold text "副業で稼げる人の差！". Scene: two people with same skill set - one succeeds by finding right market, one fails by ignoring demand. Market fit visualization as target and arrow.`,
  },
  {
    topic: '給与交渉の正しい方法',
    title: '給与交渉で失敗しない言い方【実際に使えるフレーズ】',
    narration: '給与交渉、言い方を間違えると印象が悪くなる。正解は「市場価値ベースで話す」こと。「他社からオファーが来ている」より「業界平均に基づくと」の方が通りやすい。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with salary chart and speech bubble, bold text "給与交渉の正しい言い方！". Scene: right vs wrong phrasing comparison. Correct phrase shown with positive manager reaction. Salary number increasing animation.`,
  },
  {
    topic: 'AIでキャリアプランを作る',
    title: 'AIに5年後のキャリアプランを作ってもらった結果',
    narration: 'Cheeseに「5年後どうなりたいか」を話したら、具体的なキャリアプランと必要なスキルを整理してくれた。自分では気づかなかった道が見えてきた。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} looking at glowing 5-year roadmap, bold text "AIがキャリアプラン作成！". Scene: 5-year journey roadmap appearing with milestones, skills, and goals lighting up progressively. Time travel visualization. Inspiring future aesthetic.`,
  },
  {
    topic: '仕事で評価される人の習慣',
    title: '職場で評価される人と評価されない人の習慣の違い',
    narration: '仕事の成果は同じなのに評価が違う。差はコミュニケーションの質。報連相の速さ、感謝を言葉にすること、ネガティブなことを解決策セットで言うこと。これだけです。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with "評価UP" badge and communication icons, bold text "評価される人の習慣！". Scene: same task done differently - one with proactive communication glows with recognition, one stays silent in shadow. Clear habit comparison.`,
  },
  {
    topic: 'キャリアの棚卸し方法',
    title: '転職前に必ずやるべきキャリアの棚卸し方法📝',
    narration: 'キャリアの棚卸し、やってますか？過去の経験・スキル・実績を整理するだけで、自分の市場価値が見えてきます。Cheeseに話しかけるだけで一緒に整理できます。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with career inventory checklist glowing, bold text "キャリア棚卸し方法！". Scene: Map-kun helps organize past experiences into clear categories. Skills inventory filling up like a RPG character sheet. Structured clarity visualization.`,
  },
  {
    topic: '業界選びの正しい基準',
    title: '業界選びで後悔しないための3つの基準【転職・就活共通】',
    narration: '業界選びで大事な3つ。①成長性②自分の強みが活きるか③働く人が好きになれるか。年収だけで選ぶと5年後に後悔する可能性が高い。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with 3-criteria evaluation matrix, bold text "業界選びの3基準！". Scene: industries displayed as items in a shop, Map-kun applies 3-factor evaluation lens. Perfect match glows gold. Decision framework visualization.`,
  },
  {
    topic: 'リスキリングの始め方',
    title: 'リスキリング、何から始めるのが正解？AI時代の正解',
    narration: 'AI時代のリスキリング、何から始めるべき？答えは「AIに代替されにくいスキル」から。論理的思考・コミュニケーション・専門知識の組み合わせが最強。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with "AI時代" futuristic display and skill tree, bold text "リスキリングの正解！". Scene: skill tree visualization where AI-proof skills glow brightest. Map-kun navigates future-proof career path. Tech meets human aesthetic.`,
  },
  {
    topic: '1on1面談の活用法',
    title: '1on1面談を有効活用できてる人は何が違うのか',
    narration: '1on1面談、なんとなく終わってませんか？成長する人は1on1を「評価される場」ではなく「課題を解決する場」として使います。事前にアジェンダを作ることが最重要。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with manager in meeting with agenda prepared, bold text "1on1を活かす方法！". Scene: comparison of prepared vs unprepared 1on1. Agenda-driven meeting flows smoothly with growth indicators. Meeting effectiveness visualization.`,
  },
  {
    topic: '転職活動と現職の両立',
    title: '転職活動中に現職でバレないための注意点【実体験】',
    narration: '転職活動中に現職でバレて気まずくなる人が多い。LinkedIn設定・面接日程・履歴書の扱い方など、気をつけるべき3つのポイントをまとめました。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} stealth mode with ninja elements and laptop, bold text "転職活動バレない方法！". Scene: Map-kun demonstrates careful parallel job search - private LinkedIn, strategic scheduling, discreet references. Spy-style humor with serious tips.`,
  },
  {
    topic: 'ポータブルスキルの磨き方',
    title: 'どの業界でも通用するポータブルスキル3選【転職強者になる】',
    narration: 'どの業界に転職しても武器になるポータブルスキルを3つ。①問題解決力②プロジェクト管理③データ分析の基礎。これは今の職場で今すぐ磨けます。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with universal skill badges floating, bold text "どこでも通用するスキル3選！". Scene: skills shown as universal keys unlocking multiple industry doors. Transfer of skills visualization with each key fitting different locks.`,
  },
  {
    topic: 'AIキャリアコーチ活用',
    title: 'Cheeseのキャリアコーチに相談してみた正直な感想',
    narration: '正直に言います。CheeseのAIキャリアコーチに相談したら、自分のキャリアの整理ができました。無料で使えるし、LINEで気軽に話せる。一度試してみる価値はあります。',
    videoPrompt: `Opening thumbnail frame: ${MAPKUN} with honest review expression and "★★★★★" rating, bold text "正直な感想を話します". Scene: Map-kun gives candid review of Cheese AI coach. Genuine testimonial feel. Chat interface showing real conversation snippets.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('cheese', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('cheese', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
