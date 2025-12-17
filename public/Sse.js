import { EventSourcePlus } from "https://cdn.jsdelivr.net/npm/event-source-plus/+esm";
import { API_BASE, authState, refreshAccessToken } from "./api.js";

let es = null;
const topicHandlers = {};

export async function connectSse(endpoint) {
    if (es) return es;

    if (!authState.accessToken) {
        const result = await refreshAccessToken();
        if (!result.success) throw new Error(result.message);
    }

    es = new EventSourcePlus(`${API_BASE}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
            'ngrok-skip-browser-warning': '2710'
        }
    });

    es.listen({
        async onMessage(e) {
            try {
                const topic = e.event;
                const data = JSON.parse(e.data);

                const handlers = topicHandlers[topic];
                if (handlers) {
                    for(const h of handlers){
                        await h(data);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        },

        async onError(e) {
            es?.close();
            es = null;
            authState.accessToken = null;
        }
    });

    return es;
}

export function subscribeTopic(topic, callback) {
    if(!topicHandlers[topic]){
        topicHandlers[topic] = [];
    }
    topicHandlers[topic].push(callback);
}

export function unsubscribeTopic(topic, callback) {
    if (!topicHandlers[topic]) return;

    topicHandlers[topic] = topicHandlers[topic].filter(cb => cb !== callback);

    if (topicHandlers[topic].length === 0) {
        delete topicHandlers[topic];
    }
}
