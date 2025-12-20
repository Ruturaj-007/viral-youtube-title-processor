import { ApiRouteConfig } from "motia";

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
  // ✅ CORS PREFLIGHT HANDLER
  if (req.method === "OPTIONS") {
    return {
      status: 204,
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

    // Parse body
    const body = typeof req.body === "string" 
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

    // Validate email
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

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ FIXED: Use jobId directly as key (no "job:" prefix)
    await state.set(jobId, {
      jobId,
      channel,
      email,
      status: "queued",
      createdAt: new Date().toISOString(),
    });
    
    logger.info("Job created", { jobId, channel, email });

    // Emit event
    await emit({
      topic: "yt.submit",
      data: {
        jobId,
        channel,
        email,
      },
    });

    return {
      status: 202,
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
    logger.error("Error in submission handler", { 
      error: error.message,
      stack: error.stack 
    });
    return {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: {
        error: "Internal server error",
        details: error.message
      },
    };
  }
};