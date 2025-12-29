export const API_BASE = "https://myproject.huyhoang271.id.vn";

export const authState = {
    accessToken: null
}
/**
 * endpoint là bắt buộc, isMultipart: true nếu gửi FormData
 */
export async function callAPI(endpoint, method = "GET", data = null, isMultipart = false) {
    return await callAPIWithRetry(endpoint, method, data, isMultipart, false);
}

async function callAPIWithRetry(endpoint, method, data, isMultipart, alreadyRefreshed) {
    try {
        const options = { method, headers: { "Accept": "*/*" } };
        options.headers["ngrok-skip-browser-warning"] = `26763`;
        if (!endpoint.startsWith("/auth")) {
            if(!authState.accessToken){
                const result = await refreshAccessToken();
                if(!result.success){
                    return result;
                }
            }
            options.headers["Authorization"] = `Bearer ${authState.accessToken}`;
        }
        options.credentials = "include";
        if (data) {
            if (isMultipart) options.body = data;
            else {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(data);
            }
        }
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        const body = await res.json();
        // refresh token nếu 401
        if (res.status === 401 && !alreadyRefreshed) {
            const result = await refreshAccessToken();
            if(!result.success){
                return result;
            }
            return await callAPIWithRetry(endpoint, method, data, isMultipart, true);
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

export async function refreshAccessToken() {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning":"271005",
        }
    });
    const body = await res.json();
    const token = body.data;
    if (body.success &&token?.accessToken) {
        authState.accessToken = token.accessToken;
    }
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
    return body;
}
