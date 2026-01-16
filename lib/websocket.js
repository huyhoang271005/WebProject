// stomp-client.js
import { Client } from "https://cdn.jsdelivr.net/npm/@stomp/stompjs/+esm";
import SockJS from "https://cdn.jsdelivr.net/npm/sockjs-client/+esm";

import {API_BASE, authState, refreshAccessToken} from "./api.js";

let client = null;
const subscriptions = new Map();

// =======================
// CONNECT
// =======================
export function connectStomp(endpoint, onConnected) {
    if (client && client.active) return;

    client = new Client({
        webSocketFactory: () => new SockJS(API_BASE + endpoint),
        beforeConnect: async () => {
            if(!authState.accessToken) {
                await refreshAccessToken();
            }
            const token = authState.accessToken;
            client.connectHeaders = {
                Authorization: `Bearer ${token}`
            };
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: () => {} // tắt log
    });

    client.onConnect = () => {
        console.log("✅ STOMP connected");

        // resubscribe toàn bộ topic
        subscriptions.forEach((cb, dest) => {
            subscribe(dest, cb);
        });

        onConnected && onConnected();
    };

    client.onStompError = frame => {
        console.error("❌ STOMP error", frame);
    };

    client.activate();
}

// =======================
// SUBSCRIBE
// =======================
export function subscribe(destination, callback) {
    if (!client || !client.connected) {
        subscriptions.set(destination, callback);
        return;
    }

    if (subscriptions.has(destination)) return;

    const sub = client.subscribe(destination, msg => {
        callback(JSON.parse(msg.body));
    });

    subscriptions.set(destination, { callback, sub });
}

// =======================
// UNSUBSCRIBE
// =======================
export function unsubscribe(destination) {
    const data = subscriptions.get(destination);
    if (!data) return;

    data.sub?.unsubscribe();
    subscriptions.delete(destination);
}

// =======================
// SEND
// =======================
export function send(destination, body = {}) {
    if (!client || !client.connected) return;

    client.publish({
        destination,
        body: JSON.stringify(body)
    });
}

// =======================
// DISCONNECT
// =======================
export function disconnectStomp() {
    if (client) {
        client.deactivate();
        subscriptions.clear();
        client = null;
    }
}
