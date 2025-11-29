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
    const es = new EventSourcePlus(`${API_BASE}${endpoint}`, {
        headers: {
            'ngrok-skip-browser-warning': '2710',
            'X-Accel-Buffering': 'no'
        },
    });
    es.listen({
        onMessage: e => {
            try{
                const obj = JSON.parse(e.data)
                callback(obj);
            }
            catch {
                console.error('This is not Json');
            }
        },
        onError: e=> console.error('Connect error', e)
    });
}