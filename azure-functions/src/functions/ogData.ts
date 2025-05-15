import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as cheerio from "cheerio";

const ogCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function ogData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const url = request.query.get('url');
    if (!url) {
        return {
            status: 400,
            jsonBody: { error: 'URL parameter is required' }
        };
    }
    try {
        new URL(url);
    } catch {
        return {
            status: 400,
            jsonBody: { error: 'Invalid URL format' }
        };
    }
    const cacheKey = url.toLowerCase();
    const cachedData = ogCache.get(cacheKey);
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
        context.log(`Cache hit for ${url}`);
        return { jsonBody: cachedData.data };
    }
    context.log(`Cache miss for ${url}, fetching...`);
    let response;
    try {
        response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DiscoveryNext/1.0; +https://discoverynext.org)'
            },
            redirect: 'follow'
        });
    } catch (e) {
        return {
            status: 500,
            jsonBody: { error: 'Failed to fetch URL' }
        };
    }
    if (!response.ok) {
        return {
            status: response.status,
            jsonBody: { error: `Failed to fetch URL: ${response.statusText}` }
        };
    }
    const finalUrl = response.url || url;
    const html = await response.text();
    const $ = cheerio.load(html);
    const ogData = {
        title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
        description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
        image: $('meta[property="og:image"]').attr('content') || '',
        url: $('meta[property="og:url"]').attr('content') || finalUrl,
        siteName: $('meta[property="og:site_name"]').attr('content') || '',
        type: $('meta[property="og:type"]').attr('content') || '',
        favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico',
        originalUrl: url,
        finalUrl: finalUrl
    };
    if (!ogData.image) {
        const firstImage = $('img').first().attr('src');
        if (firstImage) {
            try {
                ogData.image = new URL(firstImage, finalUrl).toString();
            } catch {
                ogData.image = firstImage;
            }
        }
    } else if (ogData.image && !ogData.image.startsWith('http')) {
        try {
            ogData.image = new URL(ogData.image, finalUrl).toString();
        } catch {}
    }
    if (ogData.favicon && !ogData.favicon.startsWith('http')) {
        try {
            ogData.favicon = new URL(ogData.favicon, finalUrl).toString();
        } catch {}
    }
    ogCache.set(cacheKey, { data: ogData, timestamp: now });
    return { jsonBody: ogData };
}

app.http('ogData', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: ogData
});
