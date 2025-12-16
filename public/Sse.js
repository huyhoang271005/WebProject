import { EventSourcePlus } from "https://cdn.jsdelivr.net/npm/event-source-plus/+esm";
import { API_BASE } from "./api.js";
import { accessToken, refreshAccessToken } from "./api.js";

let es = null;
const topicHandlers = {};

export async function connectSse(endpoint) {
    if (es) return es;

    if (!accessToken) {
        const result = await refreshAccessToken();
        if (!result.success) throw new Error("Auth failed");
    }

    es = new EventSourcePlus(`${API_BASE}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'ngrok-skip-browser-warning': '2710'
        }
    });

    es.listen({
        onError(e) {
            console.error("SSE error", e);
        }
    });

    return es;
}

export function subscribeTopic(topicName, callback) {
    if (!es) {
        console.warn("SSE not connected yet");
        return;
    }

    es.addEventListener(topicName, e => {
        try {
            callback(JSON.parse(e.data));
        } catch (err) {
            console.error(err);
        }
    });
}


export function unsubscribeTopic(topicName) {
    delete topicHandlers[topicName];
}
