// lib/tts.ts — Gemini TTS 共有モジュール

const GEMINI_API = 'https://generativelanguage.googleapis.com';

export async function generateTTS(text: string, voice = 'Aoede'): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY!;
  const res = await fetch(
    `${GEMINI_API}/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    }
  );
  const json = await res.json() as { candidates?: Array<{ content: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> } }> };
  const part = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error('TTS failed');
  const pcm = Buffer.from(part.data, 'base64');
  // PCM → WAV
  const sr = 24000, ch = 1, bd = 16;
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(ch, 22); wav.writeUInt32LE(sr, 24);
  wav.writeUInt32LE(sr * ch * bd / 8, 28); wav.writeUInt16LE(ch * bd / 8, 32);
  wav.writeUInt16LE(bd, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

export function getTTSDuration(wavBuffer: Buffer): number {
  const dataSize = wavBuffer.readUInt32LE(40);
  const byteRate = wavBuffer.readUInt32LE(28);
  return dataSize / byteRate;
}
