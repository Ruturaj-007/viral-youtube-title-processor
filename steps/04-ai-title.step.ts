import { EventConfig } from "motia";
import "dotenv/config";

// 04-ai-title.step.ts

export const config: EventConfig = {
  name: "GenerateTitles",
  type: "event",
  subscribes: ["yt.videos.fetched"],
  emits: ["yt.titles.ready", "yt.videos.error"],
  input: {
    jobId: "string",
    email: "string",
    channelName: "string",
    videos: "array",
  },
};

function calculateViralScore(title: string): number {
  let score = 50;

  if (/\d/.test(title)) score += 10;
  if (title.length < 60) score += 10;
  if (/[!?]/.test(title)) score += 10;
  if (/(secret|mistake|truth|hack|power|insane|crazy)/i.test(title)) {
    score += 10;
  }

  return Math.min(score, 100);
}

interface Video {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
}

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  let jobId: string | undefined;
  let email: string | undefined;

  try {
    const data = eventData || {};
    jobId = data.jobId;
    email = data.email;

    const channelName = data.channelName;
    const videos: Video[] = data.videos;

    logger.info("GenerateTitles: Starting title generation", {
      jobId,
      videoCount: videos.length,
    });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured");

    const jobData = await state.get(`job:${jobId}`);
    await state.set(`job:${jobId}`, { ...jobData, status: "generating titles" });

    const videoTitles = videos
      .map((v: Video, idx: number) => `${idx + 1}. "${v.title}"`)
      .join("\n");

    const prompt = `
You are a YouTube growth expert.

For EACH video title below, generate:

1. VIRAL title (emotional, curiosity-driven)
2. SEO title (keyword-rich, searchable)
3. PROFESSIONAL title (brand-safe, clean)

Also:
- Give ONE LINE reason for each title
- Suggest 3 thumbnail texts (MAX 4 words each)
- Do NOT repeat original title

Titles:
${videoTitles}

Return STRICT JSON ONLY in this exact format:

{
  "results": [
    {
      "viral": "",
      "viralReason": "",
      "seo": "",
      "seoReason": "",
      "professional": "",
      "professionalReason": "",
      "thumbnailTexts": ["", "", ""]
    }
  ]
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Gemini API error");
    }

    const aiResponse = await response.json();
    let responseText =
      aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    responseText = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(responseText);

    const improvedTitles = parsed.results.map((r: any, i: number) => ({
      original: videos[i].title,
      variants: {
        viral: r.viral,
        seo: r.seo,
        professional: r.professional,
      },
      reasons: {
        viral: r.viralReason,
        seo: r.seoReason,
        professional: r.professionalReason,
      },
      thumbnailTexts: r.thumbnailTexts,
      viralScore: calculateViralScore(r.viral),
      url: videos[i].url,
    }));

    await state.set(`job:${jobId}`, {
      ...jobData,
      status: "titles ready",
      improvedTitles,
    });

    await emit({
      topic: "yt.titles.ready",
      data: { jobId, channelName, improvedTitles, email },
    });
  } catch (err: any) {
    logger.error("GenerateTitles Error", { message: err.message });

    if (!jobId || !email) return;

    const jobData = await state.get(`job:${jobId}`);
    await state.set(`job:${jobId}`, {
      ...jobData,
      status: "failed",
      error: err.message,
    });

    await emit({
      topic: "yt.videos.error",
      data: { jobId, email, error: err.message },
    });
  }
};
