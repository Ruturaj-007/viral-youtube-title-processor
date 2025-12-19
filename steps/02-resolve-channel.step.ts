 import { EventConfig} from "motia"

    // step 2 :
    // Converts youtube handle/name to channel ID using youtube data api
    // yt.submit event → resolve YouTube channel (handle/name → channelId) → emit yt.channel.resolved OR yt.channel.error

    export const config = {
        name: "ResolveChannel",
        type: "event",
        subscribes: ["yt.submit"],
        emits: ["yt.channel.resolved", "yt.channel.error"],
    };

    // Business logic
    export const handler = async(eventData:any, {emit, logger,      // eventData → data sent by previous step
    state}:any) => {

            let jobId: string | undefined
            let email: string | undefined

            try {
                const data = eventData || {}
                jobId = data.jobId;
                email = data.email;
                const channel = data.channel;

                logger.info('Resolving youtube channel', {jobId,
                channel});

                const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
                if (!YOUTUBE_API_KEY) {
                    throw new Error("Youtube api key not configured")
                }
                const jobData = await state.get(`job:${jobId}`)
                await state.set(`job:${jobId}`, {
                    ...jobData,
                    status: 'resolving channel'
                });

                let channelId: string | null = null
                let channelName : string = ""

                if (channel.startsWith("@")) {
                    const handle = channel.substring(1);

                    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${handle}&key=${YOUTUBE_API_KEY}`;

                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.items && data.items.length > 0) {
                        channelId = data.items[0].id;
                        channelName = data.items[0].snippet.title;
                    }
                }

                else {      // when its a normal name
                    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=$
                    {encodeURIComponent(
                        channel
                    )}&key=${YOUTUBE_API_KEY}`;
                    const searchResponse = await fetch(searchUrl)
                    const searchData = await searchResponse.json()

                    if (searchData.items && searchData.items.length > 0){  // Grab channel id and name from it 
                        channelId  = searchData.items[0].id.channelId;   // FIXED 
                        channelName = searchData.items[0].snippet.title 
                    } 
                }

                if(!channelId) { // Unable to find or channel Id not available
                    logger.error("Channel not found", { channel });
                    await state.set(`job: ${jobId}`, {
                    ...jobData,
                    status: 'failed',
                    error: "Channel not found"
                });
                await emit({
                topic: "yt.channel.error",
                data: {
                    jobId,
                    email,
                }
              });
              return;
              }

              await emit({
                topic: "yt.channel.resolved",   // Channel is valid. Next step can start
                data: {
                    jobId,
                    channelId,
                    channelName,
                    email,
                }
              });
              return
            }
            catch (error : any) {
                logger.error("Error in resolving channel", {error:
                error.message})
                if (!jobId || !email) {
                    logger.error("Cannot send error notification - missing jobId or message")
                    return 
                }

                const jobData = await state.get(`job: ${jobId}`)

                await state.set(`job: ${jobId}`, {
                    ...jobData, 
                    status: 'failed',
                    error: error.message
                })

                await emit({
                    topic: "yt.channel.error",
                    data: {
                        jobId,
                        email,
                        error: "Failed to resolve channel. Please try again",
                    },
                });
            }
    }