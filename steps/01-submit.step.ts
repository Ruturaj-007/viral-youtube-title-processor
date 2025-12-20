import { ApiRouteConfig } from "motia";

// step 1:
// Accepting channel name and email to start the workflow
// Client → /submit API → validate → create job → emit event → other steps run later

export const config: ApiRouteConfig = {
  name: "SubmitChannel",
  type: "api",
  path: "/submit",
  method: "POST",
  emits: ["yt.submit"],
};

interface SubmitRequest {
  channel: string;
  email: string;
}

export const handler = async (req: any, { emit, logger, state }: any) => {
  // ✅ CORS PREFLIGHT HANDLER (handles OPTIONS requests)
  if (req.method === "OPTIONS") {
    return {
      status: 202,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: null,
    };
  }

  try {
    logger.info("Received submission request", { body: req.body });

    // const { channel, email } = req.body as SubmitRequest;
         const body =
  typeof req.body === "string"
    ? JSON.parse(req.body)
    : req.body;

const { channel, email } = body;


    if (!channel || !email) {
      return {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: {
          error: "Missing required fields: channel and email",
        },
      };
    }

    // Validating the email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: {
          error: "Invalid email format",
        },
      };
    }

    // Job ID - keeping track of job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // STATE STORAGE - saving job info
    await state.set(`job:${jobId}`, {
      jobId,
      channel,
      email,
      status: "queued",
      createdAt: new Date().toISOString(),
    });
    
    logger.info("Job created", { jobId, channel, email });

    // Emit event to trigger workflow
    await emit({
      topic: "yt.submit",
      data: {
        jobId,
        channel,
        email,
      },
    });

    return {
      status: 202, // Accepted but not completed
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: {
        success: true,
        jobId,
        message: "Your request has been queued. You will get an email soon with improved suggestions for your youtube videos",
      },
    };
  } catch (error: any) {
    logger.error("Error in submission handler", { error: error.message });
    return {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: {
        error: "Internal server error",
      },
    };
  }
};