// app/api/job/route.ts — 就活・転職キャリアtips Shorts
// 【2026-05-08 プロデューサー判断による全面改良】
// ✅ データ検証済み戦略: 情報系タイトルが圧倒的に強い（1,594回 vs キャラ系1〜52回）
// ✅ キャラ名（ジョブわん）をタイトルから除外 → 映像内のみ
// ✅ 「逆説型」「数字+理由型」「問題→解決型」の3フォーマット統一
// ✅ 就活特化 → 登録者1,000人達成最速ルート
import { NextResponse } from 'next/server';
import { phaseA, phaseB } from '@/lib/pipeline';
import type { ShortItem, CtaConfig } from '@/lib/types';

const JOBWAN = `2.5D anime style VTuber character "Jobwan": young male Shiba Inu, warm tan fur, crisp white dress shirt with navy blue tie, black slacks, golden star pin on lapel, Shiba ears with inner white, brown eyes with determined spark. Professional yet approachable. 9:16 vertical YouTube Shorts format.`;

const CTA: CtaConfig = {
  block: [
    '━━━━━━━━━━━━━━━━━━━━',
    '✅ LINEにひと言→AIがガクチカ・ES自動生成',
    '🧀 Cheese 無料LINE登録（就活生向け）',
    'https://lin.ee/8VAVNEk?utm_source=youtube&utm_medium=shorts&utm_campaign=job_info',
    '',
    '#就活 #転職 #ガクチカ #ES #自己PR #面接対策 #Shorts #内定 #キャリア',
  ],
  tags: ['就活', '転職', 'ガクチカ', 'ES', '面接対策', '自己PR', 'Shorts', '内定', 'キャリア', 'AI'],
  ytCategoryId: '27',
};

// 【フォーマット戦略】
// A: 逆説型 「〇〇より〇〇が採用に効く理由」→ 1位DNA（1,594回）
// B: 数字+問題型 「〇〇で落ちる人の共通点N選」→ 441回確認済み
// C: How to型 「〇〇が通る書き方」→ 安定的
const POOLS: ShortItem[] = [
  // === A: 逆説型（最強フォーマット）===
  {
    topic: '自己PRより志望理由が採用を決める理由',
    title: '自己PRより志望理由が採用を左右する理由【面接攻略】',
    narration: '面接官が本当に重視するのは「なぜうちの会社？」という志望理由です。自己PRがどれだけ完璧でも、志望理由がぼんやりしていると落とされます。会社研究に7割の時間を使うのが正解。ガクチカはLINEでAIに作ってもらおう！',
    videoPrompt: `Opening scene: ${JOBWAN} holding two documents, one glowing "志望理由" and one dimmer "自己PR". Scene: Jobwan draws a balance scale tipping heavily toward 志望理由 side. Company research books stack up with satisfying animation. Interview room setting with professional lighting.`,
  },
  {
    topic: 'スキルより問題解決姿勢が転職で有利な理由',
    title: 'スキルより問題解決姿勢が転職面接で有利な本当の理由',
    narration: 'スキルが高くても転職で落ちる人がいます。面接官が見ているのはスキルそのものより「この人は問題が起きたときどう動くか」という姿勢です。過去の失敗から学んだ話を準備しておこう。',
    videoPrompt: `Opening scene: ${JOBWAN} at crossroads with "スキル" sign vs "問題解決" glowing sign. Scene: Jobwan demonstrates problem-solving mindset by turning obstacle into stepping stone. Interviewer giving approval nod. Clean professional visualization.`,
  },
  {
    topic: '学歴より行動量が就活結果を決める理由',
    title: '学歴より行動量が就活の結果を決める3つの理由',
    narration: '学歴が高くても行動量が少ない学生は落ちます。OB訪問・インターン・ES提出の量が、最終的な内定数を決める最大の変数です。まず今日1社にエントリーしてみよう。',
    videoPrompt: `Opening scene: ${JOBWAN} with "学歴" certificate vs "行動量" meter filling up. Scene: Action counter rapidly increasing with each OB visit, internship, ES submission. Success rate graph rising. Motivational pacing.`,
  },
  {
    topic: '面接練習より業界研究が選考を突破する理由',
    title: '面接練習より業界研究が選考突破に効く理由【就活の真実】',
    narration: '面接で詰まる原因の9割は業界知識不足です。「なぜこの業界？」に深く答えられる人は、たどたどしい話し方でも通ります。業界研究に毎日30分投資しよう。',
    videoPrompt: `Opening scene: ${JOBWAN} with industry report book glowing vs speech practice microphone. Scene: Jobwan deep in industry research, then crushing the "why this industry" question with confidence. Knowledge visualization.`,
  },
  // === B: 数字+問題型 ===
  {
    topic: 'ESで落ちる人の共通点',
    title: 'ESで落ちる人がやっている書き方ミス3選',
    narration: 'ESで落ちる人には共通のミスがあります。①具体的な数字がない②「感じました」で終わる③誰でも言えることを書く。この3つを直すだけで通過率が変わります。LINEでAIにES添削してもらおう！',
    videoPrompt: `Opening scene: ${JOBWAN} holding ES paper with three red X marks glowing. Scene: Jobwan corrects each mistake one by one - adding numbers, strong conclusion, specific achievement. Before/after ES comparison with satisfying transformation animation.`,
  },
  {
    topic: '面接で即落とされる発言ワースト3',
    title: '面接官が即落とすと決めるNG発言ワースト3',
    narration: '面接で即アウトになる発言があります。①「御社が第一志望です」を全社で言う②「特にありません」と逆質問をしない③「御社のことはよく知りません」。これだけは絶対に避けよう。',
    videoPrompt: `Opening scene: ${JOBWAN} as interviewer crossing out candidate answers with disappointed expression. Scene: Three NG phrases appearing with dramatic red X animations. Jobwan demonstrates the correct alternatives with satisfying green checkmarks.`,
  },
  {
    topic: 'インターンで選考に有利になる行動5つ',
    title: 'インターン中にやると選考で有利になる行動5つ',
    narration: 'インターンを選考に活かすには5つの行動が重要です。①社員に深い質問をする②メモを取り議事録を自主的に送る③フィードバックを必ず求める④接触した社員全員の名前を覚える⑤最終日に手書きのお礼を渡す。',
    videoPrompt: `Opening scene: ${JOBWAN} at internship desk with 5 task checklist. Scene: Jobwan efficiently executes each of the 5 actions in quick succession - asking questions, taking notes, requesting feedback. Career advancement meter filling up with each action.`,
  },
  {
    topic: '自己分析で就活生が見落としがちな視点3つ',
    title: '自己分析で見落としがちな視点3つ【内定者が教える】',
    narration: '自己分析で見落としやすい視点が3つあります。①他者評価（自分が気づいていない強みを人に聞く）②失敗体験（成功体験より学びが大きい）③日常の「好き」（なぜ好きかを言語化する）。LINEでAIに一緒に整理してもらおう。',
    videoPrompt: `Opening scene: ${JOBWAN} with self-analysis mirror showing hidden traits. Scene: Three perspectives unlocking hidden gems - peer feedback revealing strength, failure lesson glowing, daily passion mapped. Treasure-finding aesthetic.`,
  },
  // === C: How to型 ===
  {
    topic: 'ガクチカが30秒で完成する書き方',
    title: 'ガクチカが30秒で書ける魔法のフォーマット',
    narration: 'ガクチカは「状況→行動→結果→学び」の4ステップで書けば完成します。バイトでも部活でもこの型に当てはめるだけ。数字を1つ入れるだけで説得力が3倍上がります。LINEでAIに一緒に作ってもらおう。',
    videoPrompt: `Opening scene: ${JOBWAN} with blank page transforming into complete ガクチカ in 4 steps. Scene: Formula appearing as magic blocks - Situation→Action→Result→Learning. Numbers appearing with dramatic emphasis. Efficient writing visualization.`,
  },
  {
    topic: '年収を上げる転職のタイミングと準備',
    title: '転職して年収が上がる人と下がる人の決定的な差',
    narration: '転職で年収が上がる人は「スキルの市場価値」を把握してから動きます。年収が下がる人は「今の会社への不満」だけで動く。転職サイトで同職種の平均年収を調べるだけで交渉力が変わります。',
    videoPrompt: `Opening scene: ${JOBWAN} with two salary arrows - one going up confidently, one going down. Scene: Clear decision tree showing market-value-based vs emotion-based job change. Salary negotiation power visualization with strong upward arrow.`,
  },
];

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  try {
    if (phase === 'a' || phase === 'A') return NextResponse.json(await phaseA('job', POOLS));
    if (phase === 'b' || phase === 'B') return NextResponse.json(await phaseB('job', CTA));
    return NextResponse.json({ error: 'phase=a or phase=b required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
