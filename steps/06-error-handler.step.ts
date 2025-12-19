import { EventConfig } from "motia";
import "dotenv/config";

export const config: EventConfig = {
  name: "ErrorHandler",
  type: "event",
  subscribes: ["yt.channel.error", "yt.videos.error"],
  emits: ["yt.error.notified"],  
};

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  let jobId: string | undefined;
  let email: string | undefined;

  try {
    const data = eventData || {};  
    jobId = data.jobId;
    email = data.email;
    const error = data.error || "Unknown error occurred";

    logger.info("Handling error notification", { 
      jobId, 
      email,
      error
    });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    if (!RESEND_API_KEY) {
      logger.warn("Resend API key not configured, skipping error notification");
      return;
    }

    const emailText = `Hello,

We encountered an issue while processing your YouTube title improvement request.

Error Details:
${error}

Please try again later or contact support if the issue persists.

Best regards,
Viral YouTube Title Processor

---
Built with Motia.dev`;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',  
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: `❌ Request Failed - YouTube Title Processor`,
        text: emailText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("Failed to send error notification email", { error: errorData });
      return;
    }

    const emailResult = await response.json();
    logger.info("Error notification sent successfully", { jobId, emailId: emailResult.id });

    await emit({
      topic: "yt.error.notified",
      data: {
        jobId,
        email,
        emailId: emailResult.id,
      }
    });

  } catch (err: any) {
    logger.error("Failed to send error notification", { 
      message: err.message,
      jobId,
      email
    });
  }   
};