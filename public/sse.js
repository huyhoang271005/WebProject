import { API_BASE } from "./api.js";

let es = null;
let currentEndpoint = null;
const topicHandlers = {}; // {cart:[fn1,fn2], order:[fn1],...}

/*================ CONNECT =================*/
export async function connectSse(endpoint) {
    if (es) return es;

    currentEndpoint = endpoint;
    es = new EventSource(`${API_BASE}${endpoint}`, { withCredentials: true });

    // message mặc định nếu không có event:
    es.onmessage = e => dispatch("message", e);
    es.onerror   = handleError;

    console.log("🔗 SSE connected");
    return es;
}

/*================ DISPATCH EVENT =================*/
function dispatch(eventName, e) {
    let data;
    try { data = JSON.parse(e.data) } catch { data = e.data }

    const handlers = topicHandlers[eventName];
    if (handlers) handlers.forEach(h => h(data));
}

/*================ HANDLE ERROR =================*/
function handleError(e) {
    console.warn("❗ SSE Error - reconnect in 3s", e);
    setTimeout(reconnectSse, 3000);
}

/*================ RECONNECT =================*/
export async function reconnectSse() {
    es?.close();
    es = null;
    return await connectSse(currentEndpoint);
}

/*================ SUBSCRIBE DYNAMIC EVENT =================*/
export function subscribeTopic(eventName, callback) {
    if (!topicHandlers[eventName]) {
        topicHandlers[eventName] = [];

        es?.addEventListener(eventName, e => dispatch(eventName, e));
    }
    topicHandlers[eventName].push(callback);
}

/*================ UNSUBSCRIBE =================*/
export function unsubscribeTopic(eventName, callback) {
    if (!topicHandlers[eventName]) return;

    topicHandlers[eventName] = topicHandlers[eventName].filter(cb => cb !== callback);
    if (!topicHandlers[eventName].length) delete topicHandlers[eventName];
}
