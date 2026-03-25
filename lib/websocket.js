import { Client } from "https://cdn.jsdelivr.net/npm/@stomp/stompjs/+esm";
import SockJS from "https://cdn.jsdelivr.net/npm/sockjs-client/+esm";
import { API_BASE, authState, refreshAccessToken } from "./api.js";

let client = null;
// Chỉ lưu callback để phục vụ việc resubscribe khi reconnect
const desiredSubscriptions = new Map();
// Lưu đối tượng subscription thực tế để có thể hủy (unsubscribe)
const activeSubscriptions = new Map();

export function isConnected() {
    return client && client.connected;
}

export function connectStomp(endpoint, onConnected) {
    if (client && client.active) return;

    client = new Client({
        webSocketFactory: () => new SockJS(API_BASE + endpoint),

        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        beforeConnect: async () => {
            // Đảm bảo luôn có token mới nhất trước mỗi lần thử kết nối (kể cả reconnect)
            if(!authState.accessToken){
                await refreshAccessToken();
            }
            const token = authState.accessToken;
            client.connectHeaders = {
                Authorization: `Bearer ${token}`
            };
        },

        onConnect: (frame) => {
            console.log("✅ STOMP connected");

            activeSubscriptions.forEach(sub => sub.unsubscribe());
            // Xóa các subscription cũ (nếu có) trước khi tạo mới để tránh trùng lặp
            activeSubscriptions.clear();

            // Thực hiện đăng ký lại toàn bộ các topic người dùng đã nhấn subscribe trước đó
            desiredSubscriptions.forEach((callback, destination) => {
                internalSubscribe(destination, callback);
            });

            if (onConnected) onConnected(frame);
        },

        onDisconnect: () => {
            console.log("ℹ️ STOMP disconnected");
        },

        onStompError: async (frame) => {
            const msgStr = String(frame.headers['message']);

            const stringError = 'AUTH_REQUIRED:REFRESH_TOKEN';
            if (msgStr.includes(stringError)) {
                await refreshAccessToken();
            }
            else {
                console.error(msgStr);
            }
        },

        onWebSocketClose: async (evt) => {
            if (evt.code !== 1000 && evt.code !== 1001) {
                console.warn("WebSocket closed unexpectedly (code " + evt.code + "). Refreshing token just in case...");
                await refreshAccessToken();
            }
        }
    });

    client.activate();
}

// Hàm bổ trợ nội bộ để thực thi việc subscribe thực tế
function internalSubscribe(destination, callback) {
    if (!client || !client.connected) return;

    const sub = client.subscribe(destination, (msg) => {
        try {
            callback(JSON.parse(msg.body));
        } catch (e) {
            callback(msg.body); // Phòng trường hợp body không phải JSON
        }
    });
    activeSubscriptions.set(destination, sub);
}

export function subscribe(destination, callback) {
    // Lưu vào danh sách "mong muốn" để nếu rớt mạng thì sau này tự sub lại
    desiredSubscriptions.set(destination, callback);

    // Nếu đang có kết nối thì thực hiện sub luôn
    if (client && client.connected) {
        internalSubscribe(destination, callback);
    }
}

export function unsubscribe(destination) {
    // Xóa trong danh sách mong muốn
    desiredSubscriptions.delete(destination);

    // Hủy subscription thực tế
    const sub = activeSubscriptions.get(destination);
    if (sub) {
        sub.unsubscribe();
        activeSubscriptions.delete(destination);
    }
}

export function send(destination, body = {}) {
    if (!client || !client.connected) {
        console.warn("⚠️ STOMP not connected. Message not sent.");
        return;
    }

    client.publish({
        destination,
        body: JSON.stringify(body),
        headers: {
            Authorization: `Bearer ${authState.accessToken}`,
        }
    });
}

export function disconnectStomp() {
    if (client) {
        client.deactivate();
        activeSubscriptions.clear();
        desiredSubscriptions.clear();
        client = null;
    }
}