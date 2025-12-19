import { EventConfig } from "motia";
import "dotenv/config";

// 05-send-email.step.ts
// This step takes the AI-generated titles formats them nicely sends them to the user by email and marks the job as completed.
// (yt.submit → yt.channel.resolved → yt.videos.fetched → yt.titles.ready → SendEmail → yt.email.sent)

export const config: EventConfig = {
  name: "SendEmail",
  type: "event",
  subscribes: ["yt.titles.ready"], // This step runs automatically when this happens
  emits: ["yt.email.sent"],
};

export const handler = async (eventData: any, { emit, logger }: any) => {
  try {
    const { jobId, email, channelName, improvedTitles } = eventData;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL =
      process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!RESEND_API_KEY) throw new Error("Resend API key not configured");

    const emailText = generateEmailText(channelName, improvedTitles);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: `🎬 Viral Title Ideas for ${channelName}`,
        text: emailText,
      }),
    });

    //  If Resend fails, stop the workflow here
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Email send failed");
    }

    const result = await response.json();

     // Notify the system that email was sent successfully
    await emit({
      topic: "yt.email.sent",
      data: { jobId, email, emailId: result.id },
    });
  } catch (err: any) {
    logger.error("SendEmail Error", { message: err.message });
  }
};

function generateEmailText(channelName: string, titles: any[]): string {
  const bestStyleCount: Record<string, number> = {};

  titles.forEach((t) => {
    const type = t.recommendation.type;
    bestStyleCount[type] = (bestStyleCount[type] || 0) + 1;
  });

  const bestOverall = Object.entries(bestStyleCount).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  let text = `🎬 YouTube Title Doctor Report\n`;
  text += `Channel: ${channelName}\n`;
  text += `${"=".repeat(60)}\n\n`;

  text += `📊 SUMMARY\n`;
  text += `• Videos analyzed: ${titles.length}\n`;
  text += `• Best performing style: ${bestOverall}\n`;
  text += `• Recommended strategy: Use VIRAL for reach, SEO for long-term growth\n\n`;
  text += `${"-".repeat(60)}\n\n`;

  titles.forEach((item, idx) => {
    text += `📹 Video ${idx + 1}\n`;
    text += `Original: ${item.original}\n\n`;

    text += `🔥 VIRAL TITLE:\n${item.variants.viral}\n`;
    text += `Why: ${item.reasons.viral}\n`;
    text += `Score: ${item.scores.viral}/100\n\n`;

    text += `🔍 SEO TITLE:\n${item.variants.seo}\n`;
    text += `Why: ${item.reasons.seo}\n`;
    text += `Score: ${item.scores.seo}/100\n\n`;

    text += `🏷 PROFESSIONAL TITLE:\n${item.variants.professional}\n`;
    text += `Why: ${item.reasons.professional}\n`;
    text += `Score: ${item.scores.professional}/100\n\n`;

    text += `🏆 RECOMMENDED TITLE\n`;
    text += `Type: ${item.recommendation.type}\n`;
    text += `Reason: ${item.recommendation.reason}\n\n`;

    text += `🖼 THUMBNAIL TEXT IDEAS:\n`;
    item.thumbnailTexts.forEach((t: string) => {
      text += `• ${t}\n`;
    });

    text += `🔗 Video: ${item.url}\n`;
    text += `${"-".repeat(60)}\n\n`;
  });

  text += `🚀 Built with Motia.dev by Ruturaj Pawar\n`;

  return text;
}
