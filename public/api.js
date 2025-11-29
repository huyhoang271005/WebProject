const API_BASE = "https://uncoagulative-tyrannisingly-eddie.ngrok-free.dev";
import { EventSourcePlus } from "https://cdn.jsdelivr.net/npm/event-source-plus/+esm";

let accessToken = null;
/**
 * endpoint là bắt buộc, isMultipart: true nếu gửi FormData
 */
export async function callAPI(endpoint, method = "GET", data = null, isMultipart = false) {
    return await callAPIWithRetry(endpoint, method, data, isMultipart, false);
}

async function callAPIWithRetry(endpoint, method, data, isMultipart, alreadyRefreshed) {
    const options = { method, headers: { "Accept": "*/*" } };
    options.headers["Device-name"] =  navigator.userAgent;
    options.headers["ngrok-skip-browser-warning"] = `26763`;
    if (!endpoint.startsWith("/auth") && accessToken) {
        options.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    else {
        options.credentials = "include";
    }
    if (data) {
        if (isMultipart) options.body = data;
        else {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(data);
        }
    }

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        const body = await res.json();
        if(body.success){
            if(body.data?.accessToken){
                accessToken = body.data.accessToken;
            }
        }
        // refresh token nếu 401
        if (res.status === 401 && !alreadyRefreshed) {
            const result = await refreshAccessToken();
            if(!result.success){
                return result;
            }
            const token = result.data;
            if (token?.accessToken) {
                accessToken = token.accessToken;
                return await callAPIWithRetry(endpoint, method, data, isMultipart, true);
            }
            return result;
        }
        return body;
    } catch (err) {
        console.error(err);
        return {
            success: false,
            message: "Lỗi kết nối đến server",
            data: null
        }
    }
}

async function refreshAccessToken() {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Device-type": "WEB"
        }
    });
    if(res.status === 401) {
        setTimeout(()=>{
            window.location.replace('/WebProject/auth/login');
        }, 5000);
        localStorage.setItem('rememberUser', 'false');
        return {
            success: false,
            message: 'Phiên đăng nhập đã hết hạn vui lòng đăng nhập lại, sẽ tự động thoát sau 5 giây',
            data: null
        }
    }
    return await res.json();
}

export async function connectSse(endpoint, callback) {
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 3;

    async function start() {
        // ✅ 1. Test connection trước với fetch
        await callAPI(`${endpoint}`);
        // ✅ 2. Tạo SSE connection
        const es = new EventSourcePlus(`${API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'ngrok-skip-browser-warning': '2710'
            }
        });

        es.listen({
            onOpen() {
                console.log("✅ SSE connected");
                reconnectAttempts = 0; // Reset counter khi connect thành công
            },

            onMessage(e) {
                try {
                    const data = JSON.parse(e.data);
                    callback(data);
                } catch {
                    console.error("❌ Invalid JSON:", e.data);
                }
            },

            async onResponseError({ response }) {
                // ✅ onResponseError có thông tin response
                console.log("📛 Response error, status:", response?.status);
                
                if (response?.status === 401) {
                    console.log("🔄 401 detected, refreshing token...");
                    
                    const result = await refreshAccessToken();
                    
                    if (!result.success) {
                        callback(result);
                        es.close();
                        return;
                    }
                    
                    accessToken = result.data.accessToken;
                    console.log("✅ Token refreshed, reconnecting SSE...");
                    
                    es.close();
                    setTimeout(start, 500);
                    return;
                }
            },

            onError(err) {
                console.warn("⚠️ SSE error:", err);
                
                // Retry logic cho network errors
                if (reconnectAttempts < MAX_RECONNECT) {
                    reconnectAttempts++;
                    console.log(`🔄 Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT})`);
                    
                    es.close();
                    setTimeout(start, 2000 * reconnectAttempts); // Exponential backoff
                } else {
                    console.error("❌ Max reconnect attempts reached");
                    es.close();
                    callback({
                        success: false,
                        message: "Không thể kết nối SSE",
                        data: null
                    });
                }
            }
        });

        return es;
    }

    return start();
}
