import { EventConfig } from "motia";
import "dotenv/config";

export const config: EventConfig = {
  name: "GenerateTitles",
  type: "event",
  subscribes: ["yt.videos.fetched"],
  emits: ["yt.titles.ready", "yt.videos.error"],
  input: {
    jobId: "string",
    email: "string",
    channelName: "string",
    videos: "array"
  }
};

interface Video {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail: string;
}

interface ImprovedTitle {
  original: string;
  improved: string;
  rationale: string;
  url: string;
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

    const prompt = `You are a YouTube SEO and viral content expert. Below are ${videos.length} video titles from the channel "${channelName}".

For each title, provide:
1. An improved version that is more engaging, SEO-friendly, and likely to get more clicks
2. A brief rationale (1-2 sentences) explaining why the improved title is better

Guidelines:
- Keep the core topic and authenticity
- Use action verbs, numbers, and specific value propositions
- Make it curiosity-inducing without being clickbait
- Optimize for searchability and clarity
- Add emotional hooks and power words where appropriate

Video Titles:
${videoTitles}

Respond in JSON format:
{
  "titles": [
    {
      "original": "...",
      "improved": "...",
      "rationale": "..."
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      logger.error("Gemini API Response Error", { status: response.status, error: err });
      throw new Error(`Gemini API error: ${err.error?.message || JSON.stringify(err)}`);
    }

    const aiResponse = await response.json();
    
    logger.info("Gemini API Response received", { 
      hasResponse: !!aiResponse,
      hasCandidates: !!aiResponse.candidates 
    });

    let responseText = aiResponse.candidates[0].content.parts[0].text;
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    logger.info("Parsing AI response", { textLength: responseText.length });
    
    const parsed = JSON.parse(responseText);

    const improvedTitles: ImprovedTitle[] = parsed.titles.map(
      (t: any, i: number) => ({
        original: videos[i].title,
        improved: t.improved,
        rationale: t.rationale,
        url: videos[i].url,
      })
    );

    logger.info("GenerateTitles: Titles generated successfully", {
      jobId,
      titleCount: improvedTitles.length,
    });

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
    logger.error("GenerateTitles Error", { message: err.message, stack: err.stack });

    if (!jobId || !email) {
      logger.error("Cannot send error notification - missing jobId or email");
      return;
    }

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