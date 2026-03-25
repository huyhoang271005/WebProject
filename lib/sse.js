import { API_BASE } from "./api.js";

let es = null;
let currentEndpoint = null;
const topicHandlers = {};
/**Connect SSE with endpoint */
export async function connectSse(endpoint) {
    if (es) return es;

    currentEndpoint = endpoint;
    es = new EventSource(`${API_BASE}${endpoint}`, { withCredentials: true });

    // message mặc định nếu không có event:
    es.onmessage = e => dispatch("message", e);
    es.onerror = handleError;

    return es;
}


function dispatch(eventName, e) {
    let data;
    try { data = JSON.parse(e.data) } catch { data = e.data }

    const handlers = topicHandlers[eventName];
    if (handlers) handlers.forEach(h => h(data));
}

/*when error */
function handleError(e) {
    setTimeout(reconnectSse, 1000);
}

/*Reconnect*/
export async function reconnectSse() {
    es?.close();
    es = null;
    return await connectSse(currentEndpoint);
}

/*Subcribe event*/
export function subscribeTopic(eventName, callback) {
    if (!topicHandlers[eventName]) {
        topicHandlers[eventName] = [];

        if (eventName !== "message") {
            es?.addEventListener(eventName, e => dispatch(eventName, e));
        }
    }
    topicHandlers[eventName].push(callback);
}

/*Unsubcribe event */
export function unsubscribeTopic(eventName, callback) {
    if (!topicHandlers[eventName]) return;

    topicHandlers[eventName] = topicHandlers[eventName].filter(cb => cb !== callback);
    if (!topicHandlers[eventName].length) delete topicHandlers[eventName];
}
