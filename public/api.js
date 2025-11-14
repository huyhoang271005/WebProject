const API_BASE = "https://uncoagulative-tyrannisingly-eddie.ngrok-free.dev";

let accessToken = localStorage.getItem("accessToken");
let refreshToken = localStorage.getItem("refreshToken");
/**
 * callAPI có thể tự refresh token
 * isMultipart: true nếu gửi FormData
 */
export async function callAPI(endpoint, method = "GET", data = null, isMultipart = false) {
    return await callAPIWithRetry(endpoint, method, data, isMultipart, false);
}

async function callAPIWithRetry(endpoint, method, data, isMultipart, alreadyRefreshed) {
    const options = { method, headers: { "Accept": "*/*" } };
    options.headers["Device-type"] = "WEB";
    options.headers["Device-name"] =  navigator.userAgent;
    if(localStorage.getItem("deviceId")){
        options.headers["Device-id"] = localStorage.getItem("deviceId");
    }
    options.headers["ngrok-skip-browser-warning"] = `26763`;
    if (!endpoint.startsWith("/auth") && accessToken) {
        options.headers["Authorization"] = `Bearer ${accessToken}`;
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
        if(body.data?.deviceId){
            localStorage.setItem("deviceId", body.data.deviceId);
        }
        // refresh token nếu 401
        if (res.status === 401 && !alreadyRefreshed && refreshToken) {
            const result = await refreshAccessToken();
            if (result?.accessToken && result?.refreshToken) {
                accessToken = result.accessToken;
                refreshToken = result.refreshToken;
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);
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
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*"
        },
        body: JSON.stringify({ refreshToken })
    });
    const body = await res.json();
    return body.data;
}