import { state } from "./state.js";

const CACHE_KEY_PREFIX = "chat_msg_";

export function getCacheKey(roomId) {
    return CACHE_KEY_PREFIX + roomId;
}

export function saveCache(roomId, msgs) {
    if (state.isOffline) return;
    try {
        const toSave = msgs.slice(0, 50);
        localStorage.setItem(getCacheKey(roomId), JSON.stringify(toSave));
    } catch (e) {
        console.warn("Quota exceeded or error saving cache", e);
    }
}

export function loadFromCache(roomId) {
    try {
        const data = localStorage.getItem(getCacheKey(roomId));
        if (data) return JSON.parse(data);
    } catch (e) {
        console.error("Error loading cache", e);
    }
    return null;
}
