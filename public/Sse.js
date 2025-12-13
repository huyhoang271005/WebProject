import { EventSourcePlus } from "https://cdn.jsdelivr.net/npm/event-source-plus/+esm";
import { API_BASE } from "./api.js";

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
        async onEvent(e) {
            try {
                const topic = e.event;
                const data = JSON.parse(e.data);

                const handler = topicHandlers[topic];
                if (handler) {
                    await handler(data);
                }
            } catch (err) {
                console.error(err);
            }
        },

        async onMessage(e) {
            return e.data;
        },

        async onError(e) {
            throw new Error(e);
        }
    });

    return es;
}

export function subscribeTopic(topicName, callback) {
    topicHandlers[topicName] = callback;
}

export function unsubscribeTopic(topicName) {
    delete topicHandlers[topicName];
}
