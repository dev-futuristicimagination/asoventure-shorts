import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg: string = require("ffmpeg-static") as string;
import { execFile } from "child_process";
import { promisify } from "util";
const exec = promisify(execFile);

export async function GET() {
  try {
    const r = await exec(ffmpeg, ["-filters"], { timeout: 10000 }).catch((e: unknown) => ({
      stderr: (e as { stderr?: string }).stderr || ""
    }));
    const stderr = r.stderr || "";
    const hasDrawtext = stderr.includes("drawtext");
    const drawFilters = stderr.split("\n").filter((l: string) => l.match(/draw|text/i)).slice(0,15);
    return NextResponse.json({ hasDrawtext, drawFilters });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
