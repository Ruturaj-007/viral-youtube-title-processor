    import { ApiRouteConfig} from "motia"

    // step 1 :
    // Accepting channel name and email to start the workflow
    // Client → /submit API → validate → create job → emit event → other steps run later

    export const config: ApiRouteConfig = {    // It's a Metadata
        name: "SubmitChannel",
        type: "api",
        path: "/submit",
        method: "POST",
        emits: ["yt.submit"],   // After this API runs, it may trigger the yt.submit workflow step (yt.submit event)
    };

    interface SubmitRequest {
        channel: string;
        email: string
    }

    export const handler = async(req:any, {emit, logger,           // This is the actual function that runs when /submit is hit.
    state}:any) => {
    try {
        logger.info('Received submition request', {body: req.
        body})
        const {channel, email} = req.body as SubmitRequest;        //  Pulls channel and email from request body
    if (!channel || !email) {
        return {
            status: 400,
            body: {
            error: "Missing required fields: channel and email"   
            },
        };
    }

    // validating the email whih must have a @ and domain no spaces should be involved
    const emailRegex  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            status: 400,
            body: {
            error: "Invalid email format",
            },
        };
    }

    // Job ID Keeping track of job 
    const jobId = `job_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2,9)}`;

    // STATE STORAGE You’re saving job info in shared state.
        await state.set(`job: ${jobId}`, {
            jobId,
            channel,
            email,    
            status: "queued",
            createdAt: new Date().toISOString()
        })
        logger.info('Job created', {jobId, channel, email})

        await emit({     // emit does'nt call a function directly it just sends message to the event system Only workflows listening to "yt.submit" will wake up.
           topic: "yt.submit",
           data: {
                jobId,
                channel,
                email
           }     
        }); 
        return {
            status: 202,  // Accepted but not completed
                body: {
                   success: true,
                   jobId,
                   message: "Your request has been queued. You will get an email soon with improved suggestions for your youtube videos"     
            },
        };
    }
    catch (error: any) {
        logger.error("Error in submission handler", 
            {error : error.message })
            return {
                status: 500,
                body: {
                    error: "Internal server error"
                },
            };
        }
    }