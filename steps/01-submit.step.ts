    import { ApiRouteConfig} from "motia"

    // step 1 :
    // Accepting channel name and email to start the workflow
    export const config: ApiRouteConfig = {
        name: "SubmitChannel",
        type: "api",
        path: "/submit",
        method: "POST",
        emits: ["yt.submit"],
    };

    interface SubmitRequest {
        channel: string;
        email: string
    }

    export const handler = async(req:any, {emit, logger,           // emit is the function to fire events
    state}:any) => {
    try {
        logger.info('Received submition request', {body: req.
        body})
        const {channel, email} = req.body as SubmitRequest;        //  extract data 
    if (!channel || !email) {
        return {
            status: 400,
            body: {
            error: "Missing required fields: channel and email"   
            },
        };
    }

    // validating the email whih must have a @ and domain
    const emailRegex  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            status: 400,
            body: {
            error: "Invalid email format",
            },
        };
    }

    // Keeping track of job 
    const jobId = `job_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2,9)}`;

    // Passing some details
        await state.set(`job: ${jobId}`, {
            jobId,
            channel,
            email,    
            status: "queued",
            createdAt: new Date().toISOString()
        })
        logger.info('Job created', {jobId, channel, email})

        await emit({
           topic: "yt.submit",
           data: {
                jobId,
                channel,
                email
           }     
        }); // helps you to broadcast any information 
        return {
            status: 202,
                body: {
                   success: true,
                   jobId,
                   message: "Your request has been queued. You will get an email soon with improved suggestions for your youtube videos"     
            },
        };
    }
    catch (error: any) {
        logger.error("Error in submission handler", {error:
            error.message
            })
            return {
                status: 500,
                body: {
                    error: "Internal server error"
                },
            };
        }
    }