import { EventConfig } from "motia";
import "dotenv/config";

export const config: EventConfig = {
  name: "SendEmail",
  type: "event",
  subscribes: ["yt.titles.ready"],  
  emits: ["yt.email.sent"],
};

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
    const improvedTitles: ImprovedTitle[] = data.improvedTitles;

    logger.info("Sending email", { 
      jobId, 
      email,
      titleCount: improvedTitles.length
    });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    if (!RESEND_API_KEY) throw new Error("Resend API key not configured");

    const jobData = await state.get(`job:${jobId}`);
    await state.set(`job:${jobId}`, { ...jobData, status: "sending email" });

    const emailText = generateEmailText(channelName, improvedTitles);

    const response = await fetch('https://api.resend.com/emails', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',  
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: `🎬 New Viral Title Ideas for ${channelName}`,
        text: emailText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("Resend API error", { status: response.status, error: errorData });
      throw new Error(`Resend API error: ${errorData.message || errorData.error?.message || 'Unknown error'}`);
    }

    const emailResult = await response.json();
    logger.info("Email sent successfully", { jobId, emailId: emailResult.id });

    await state.set(`job:${jobId}`, {
      ...jobData,
      status: "completed",
      emailSent: true,
      emailId: emailResult.id,
      completedAt: new Date().toISOString()
    });

    await emit({
      topic: "yt.email.sent",
      data: {
        jobId,
        email,
        emailId: emailResult.id
      }
    });

  } catch (error: any) {
    logger.error("Error sending email", { 
      message: error.message,
      jobId,
      email
    });

    if (jobId) {
      const jobData = await state.get(`job:${jobId}`);
      await state.set(`job:${jobId}`, {
        ...jobData,
        status: "failed",
        error: `Email sending failed: ${error.message}`
      });
    }
  }
};

function generateEmailText(
  channelName: string,
  titles: ImprovedTitle[]
): string {
  let text = `🎬 YouTube Title Doctor - Improved Titles for ${channelName}\n`;
  text += `${"=".repeat(60)}\n\n`;

  titles.forEach((title, index) => {
    text += `📹 Video ${index + 1}:\n`;
    text += `${"─".repeat(40)}\n`;
    text += `📝 Original: ${title.original}\n`;
    text += `✨ Improved: ${title.improved}\n`;
    text += `💡 Why: ${title.rationale}\n`;
    text += `🔗 Watch: ${title.url}\n\n`;
  });

  text += `${"=".repeat(60)}\n`;
  text += `⚡ Powered by YouTube Title Doctor\n`;
  text += `🚀 Built with Motia.dev\n`;

  return text;
}