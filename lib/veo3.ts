// lib/veo3.ts — Veo3 API 共有モジュール

const GEMINI_API = 'https://generativelanguage.googleapis.com';

export async function requestVeo3(prompt: string, imageBase64?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const instance: Record<string, unknown> = { prompt };
  if (imageBase64) {
    instance.image = { bytesBase64Encoded: imageBase64 };
  }
  const res = await fetch(
    `${GEMINI_API}/v1beta/models/veo-3.0-generate-001:predictLongRunning?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [instance],
        parameters: { sampleCount: 1, durationSeconds: 15, aspectRatio: '9:16' },
      }),
    }
  );
  const json = await res.json() as { name?: string; error?: { message: string } };
  if (!json.name) throw new Error('Veo3 request failed: ' + JSON.stringify(json).slice(0, 200));
  return json.name;
}

export async function pollAndDownloadVeo3(operationName: string): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY!;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const res = await fetch(`${GEMINI_API}/v1beta/${operationName}?key=${key}`);
    const json = await res.json() as {
      done?: boolean;
      error?: { message: string };
      response?: { generateVideoResponse?: { generatedSamples?: Array<{ video: { uri: string } }>; raiMediaFilteredReasons?: string[] } };
    };
    if (!json.done) continue;
    if (json.error) throw new Error('Veo3 error: ' + json.error.message);
    const samples = json.response?.generateVideoResponse?.generatedSamples;
    if (!samples?.[0]?.video?.uri) {
      const reason = json.response?.generateVideoResponse?.raiMediaFilteredReasons?.[0] || 'filtered';
      throw new Error('Veo3 filtered: ' + reason.slice(0, 200));
    }
    const fileId = samples[0].video.uri.match(/files\/([^:?/]+)/)?.[1];
    if (!fileId) throw new Error('fileId not found');
    const dlRes = await fetch(`${GEMINI_API}/v1beta/files/${fileId}?key=${key}`);
    const meta = await dlRes.json() as { videoMetadata?: unknown; uri?: string; error?: { message: string } };
    if (meta.error) throw new Error('File metadata error: ' + meta.error.message);
    const videoRes = await fetch(`${GEMINI_API}/download/v1beta/files/${fileId}?key=${key}`);
    if (!videoRes.ok) throw new Error(`Video download failed: ${videoRes.status}`);
    return Buffer.from(await videoRes.arrayBuffer());
  }
  throw new Error('Veo3 polling timeout');
}
