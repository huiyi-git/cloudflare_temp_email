interface Env {
    BACKEND_API: string;
    ALLOWED_ORIGINS: string[];
    RATE_LIMIT_PER_MINUTE: number;
}

// 简单的内存速率限制（生产环境建议使用 KV 或 Durable Objects）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: Request): string {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    return ip;
}

function checkRateLimit(key: string, limit: number): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + 60000 });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count++;
    return true;
}

function corsHeaders(origin: string | null, allowedOrigins: string[]): HeadersInit {
    const headers: HeadersInit = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };

    if (origin && allowedOrigins.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return headers;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');
        const allowedOrigins = Array.isArray(env.ALLOWED_ORIGINS)
            ? env.ALLOWED_ORIGINS
            : [env.ALLOWED_ORIGINS];

        // 处理 CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders(origin, allowedOrigins)
            });
        }

        // 速率限制检查
        const rateLimitKey = getRateLimitKey(request);
        if (!checkRateLimit(rateLimitKey, env.RATE_LIMIT_PER_MINUTE)) {
            return new Response('Too Many Requests', {
                status: 429,
                headers: corsHeaders(origin, allowedOrigins)
            });
        }

        // 构建后端请求
        const backendUrl = new URL(url.pathname + url.search, env.BACKEND_API);

        const backendRequest = new Request(backendUrl.toString(), {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });

        try {
            const response = await fetch(backendRequest);

            // 复制响应并添加 CORS 头
            const newResponse = new Response(response.body, response);
            const headers = new Headers(newResponse.headers);

            Object.entries(corsHeaders(origin, allowedOrigins)).forEach(([key, value]) => {
                headers.set(key, value);
            });

            return new Response(newResponse.body, {
                status: newResponse.status,
                statusText: newResponse.statusText,
                headers
            });
        } catch (error) {
            return new Response('Backend Error', {
                status: 502,
                headers: corsHeaders(origin, allowedOrigins)
            });
        }
    }
};
