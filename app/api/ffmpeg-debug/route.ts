// app/api/ffmpeg-debug/route.ts
// 一時的なデバッグ用エンドポイント（ffmpegのバージョン・フィルター確認）
import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static') as string;

export async function GET(req: Request) {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, string> = {};
  
  // 1. ffmpeg バージョン
  try {
    const { stderr } = await execFileAsync(ffmpegPath, ['-version'], { maxBuffer: 1024 * 1024 });
    results.version = stderr.split('\n')[0];
  } catch (e) {
    results.version_err = String(e);
  }

  // 2. drawtext フィルターが存在するか
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-filters'], { maxBuffer: 2 * 1024 * 1024 });
    const hasdrawtext = stdout.includes('drawtext');
    const hasdrawbox = stdout.includes('drawbox');
    const hasamix = stdout.includes('amix');
    const hascolor = stdout.includes(' color ');
    results.filters = JSON.stringify({ hasdrawtext, hasdrawbox, hasamix, hascolor });
  } catch (e) {
    results.filters_err = String(e);
  }

  // 3. 超シンプルなFFmpegテスト（drawtextなし）
  try {
    const { stderr: err3 } = await execFileAsync(ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=blue:size=100x100:rate=30:duration=1',
      '-frames:v', '1', '-f', 'image2', '-'
    ], { maxBuffer: 10 * 1024 * 1024 });
    results.color_test = 'OK: ' + err3.split('\n').find(l => l.includes('frame')) || 'OK';
  } catch (e: unknown) {
    results.color_test_err = String(e instanceof Error ? e.message : e).slice(0, 200);
  }

  // 4. drawtextテスト（フォントあり）
  try {
    const fontPath = require('path').join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
    const { stderr: err4 } = await execFileAsync(ffmpegPath, [
      '-y', '-f', 'lavfi', '-i', 'color=c=black:size=100x100:rate=30:duration=1',
      '-vf', `drawtext=fontfile='${fontPath}':text='test':fontcolor=white:fontsize=20`,
      '-frames:v', '1', '-f', 'image2', '-'
    ], { maxBuffer: 10 * 1024 * 1024 });
    results.drawtext_test = 'OK: ' + err4.split('\n').find(l => l.includes('frame')) || 'OK';
  } catch (e: unknown) {
    const err = e as { message?: string; stderr?: string };
    results.drawtext_test_err = ((err.message || '') + '\nSTDERR:' + (err.stderr || '')).slice(0, 500);
  }

  results.ffmpegPath = ffmpegPath;
  results.platform = process.platform;
  results.cwd = process.cwd();

  return NextResponse.json(results);
}
