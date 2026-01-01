import { API_BASE } from "./api.js";

let es = null;
const topicHandlers = {};
let currentEndpoint = null;

export async function connectSse(endpoint) {
    if (es) return es;

    currentEndpoint = endpoint;

    const url = `${API_BASE}${endpoint}`;

    es = new EventSource(url, { withCredentials: true });

    es.onmessage = e => handleEvent("message", e);
    es.onerror  = e => handleError(e);
    subscribeTopic("connected", data => {console.log(data)})

    return es;
}

async function handleError(e) {
    console.warn("SSE error", e);

    // auto reconnect nhẹ sau 3s (tránh spam request)
    setTimeout(reconnectSse, 3000);
}

function handleEvent(eventName, e) {
    let data;
    try { data = JSON.parse(e.data) } catch { data = e.data }

    const handlers = topicHandlers[eventName];   
    if (handlers) {
        handlers.forEach(fn => fn(data));
    }
}

export async function reconnectSse() {
    es?.close();
    es = null;
    return await connectSse(currentEndpoint);
}

export function subscribeTopic(event, callback) {
    if (!topicHandlers[event]) topicHandlers[event] = [];
    topicHandlers[event].push(callback);
}

export function unsubscribeTopic(event, callback) {
    if (!topicHandlers[event]) return;
    topicHandlers[event] = topicHandlers[event].filter(cb => cb !== callback);
    if (!topicHandlers[event].length) delete topicHandlers[event];
}
