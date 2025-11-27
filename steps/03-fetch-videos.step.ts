import { EventConfig} from "motia"

export const config = {
    name: "fetchVideos",
    type: "event",
    subscribes: ["yt.channel.resolved"],
    emits: ["yt.videos.fetched", "yt.videos.error"],
};

interface Video {
    videoId: string;
    title: string;
    url: string;
    publishedAt: string;
    thumbnail: string
}

export const handler = async(eventData:any, {emit, logger, state}:any) => {
  let jobId: string | undefined;
  let email: string | undefined;      
    
   try {
        const data = eventData || {}
        jobId = data.jobId;
        email = data.email;
        const channelId = data.channelId;
        const channelName = data.channelName;
        
        logger.info('Fetching youtube videos', {jobId, channelId});

        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
        if (!YOUTUBE_API_KEY) {
            throw new Error("Youtube api key not configured")
        }

        const jobData = await state.get(`job:${jobId}`)
        await state.set(`job:${jobId}`, {
            ...jobData,
            status: 'fetching videos'
        });

        // FIXED: Use the Activities endpoint for more reliable results
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=10&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(searchUrl);
        const youtubeData = await response.json();

        if(!youtubeData.items || youtubeData.items.length === 0) {
            logger.warn('No videos found for channel', {jobId, channelId})
            await state.set(`job:${jobId}`, {
                ...jobData,
                status: "failed",
                error: "No videos found"
            })
            await emit({
                topic: "yt.videos.error",
                data: {
                    jobId,
                    email,
                    error: "No videos found for this channel",
                },
            });
            return;
        }

        // FIXED: Filter to only include videos from this channel
        const videos: Video[] = youtubeData.items
            .filter((item: any) => item.snippet.channelId === channelId) // Only videos from THIS channel
            .slice(0, 5) // Take only 5 videos
            .map((item:any) => ({
                videoId : item.id.videoId,
                title: item.snippet.title,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails.default.url
            }));

        if (videos.length === 0) {
            logger.warn('No valid videos after filtering', {jobId, channelId})
            await state.set(`job:${jobId}`, {
                ...jobData,
                status: "failed",
                error: "No videos found"
            })
            await emit({
                topic: "yt.videos.error",
                data: {
                    jobId,
                    email,
                    error: "No recent videos found for this channel",
                },
            });
            return;
        }

        logger.info('Videos fetched successfully', {
            jobId,
            videoCount: videos.length
        })

        await state.set(`job:${jobId}`, {
            ...jobData,
            status: "videos fetched",
            videos                        
        });

        await emit({
            topic: "yt.videos.fetched",
            data: {
                jobId,
                channelName,
                videos,
                email,
            },
        });

   } catch (error : any) {
        logger.error("Error fetching videos", {error: error.message});

        if (!jobId || !email) {
            logger.error("Cannot send error notification - missing jobId or email")
            return 
        }

        const jobData = await state.get(`job:${jobId}`)

        await state.set(`job:${jobId}`, {
            ...jobData, 
            status: "failed",
            error: error.message
        })

        await emit({
            topic: "yt.videos.error",
            data: {
                jobId,
                email,
                error: "Failed to fetch videos. Please try again later",
            },
        });
    }
}