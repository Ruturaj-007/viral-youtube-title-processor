import { EventConfig } from "motia";
import "dotenv/config";

// 05-send-email.step.ts

export const config: EventConfig = {
  name: "SendEmail",
  type: "event",
  subscribes: ["yt.titles.ready"],
  emits: ["yt.email.sent"],
};

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  let jobId: string | undefined;
  let email: string | undefined;

  try {
    const data = eventData || {};
    jobId = data.jobId;
    email = data.email;
    const channelName = data.channelName;
    const improvedTitles = data.improvedTitles;

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

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Email send failed");
    }

    const result = await response.json();

    await emit({
      topic: "yt.email.sent",
      data: { jobId, email, emailId: result.id },
    });
  } catch (err: any) {
    logger.error("SendEmail Error", { message: err.message });

    if (!jobId) return;

    const jobData = await state.get(`job:${jobId}`);
    await state.set(`job:${jobId}`, {
      ...jobData,
      status: "failed",
      error: err.message,
    });
  }
};

function generateEmailText(channelName: string, titles: any[]): string {
  let text = `🎬 YouTube Title Doctor Report\n`;
  text += `Channel: ${channelName}\n`;
  text += `${"=".repeat(60)}\n\n`;

  titles.forEach((item, idx) => {
    text += `📹 Video ${idx + 1}\n`;
    text += `Original: ${item.original}\n\n`;

    text += `🔥 VIRAL TITLE:\n${item.variants.viral}\n`;
    text += `Why: ${item.reasons.viral}\n`;
    text += `Score: ${item.viralScore}/100\n\n`;

    text += `🔍 SEO TITLE:\n${item.variants.seo}\n`;
    text += `Why: ${item.reasons.seo}\n\n`;

    text += `🏷 PROFESSIONAL TITLE:\n${item.variants.professional}\n`;
    text += `Why: ${item.reasons.professional}\n\n`;

    text += `🖼 THUMBNAIL TEXT IDEAS:\n`;
    item.thumbnailTexts.forEach((t: string) => {
      text += `• ${t}\n`;
    });

    text += `🔗 Video: ${item.url}\n`;
    text += `${"-".repeat(60)}\n\n`;
  });

  text += `🚀 Built with Motia.dev\n`;

  return text;
}
