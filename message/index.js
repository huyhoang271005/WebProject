import { callAPI } from "/lib/api.js";
import { noImage, convertToVNTime } from "/lib/public.js";
import { connectStomp, subscribe, send } from "/lib/websocket.js";
import { loadNavbar } from "../navbar/navbar.js";
import {showDialog} from "/dialog/index.js";

/* ================= STATE ================= */
let currentUserId = null;
let rooms = [];
let senderMap = {}; // Cache toàn cục cho thông tin người dùng
let currentRoomId = null;
let hasMoreMessages = true;
let page = 0;
let size = 20;
const messages = [];
const CACHE_KEY_PREFIX = "chat_msg_";
let isOffline = !navigator.onLine; // Trạng thái mạng
const loadedMemberRooms = new Set(); // Cache các room đã load member

/* ================= DOM ELEMENTS ================= */
const chatContainerEl = document.getElementById("chatContainer");
const roomListEl = document.getElementById("roomList");
const chatAvatarEl = document.getElementById("chatAvatar");
const chatUsernameEl = document.getElementById("chatUsername");
const chatMessagesEl = document.getElementById("chatMessages");
const chatEmptyEl = document.getElementById("chatEmpty");
const chatHeaderEl = document.getElementById("chatHeader");
const chatInputEl = document.getElementById("chatInput");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");
const backBtnEl = document.getElementById("backBtn");

/* ================= UI CONTROLS ================= */
function showEmptyChat() {
    chatEmptyEl.classList.remove("hidden");
    chatHeaderEl.classList.add("hidden");
    chatMessagesEl.classList.add("hidden");
    chatInputEl.classList.add("hidden");
    chatContainerEl.classList.remove("mobile-active");
}

function showChatRoom() {
    chatEmptyEl.classList.add("hidden");
    chatHeaderEl.classList.remove("hidden");
    chatMessagesEl.classList.remove("hidden");
    chatInputEl.classList.remove("hidden");
    chatContainerEl.classList.add("mobile-active");
}

/* ================= CACHE & NETWORK ================= */
function getCacheKey(roomId) {
    return CACHE_KEY_PREFIX + roomId;
}

function saveCache(roomId, msgs) {
    if (isOffline) return; // Không lưu cache khi offline theo yêu cầu
    try {
        // Chỉ lưu tối đa 50 tin nhắn mới nhất để tiết kiệm bộ nhớ
        const toSave = msgs.slice(0, 50);
        localStorage.setItem(getCacheKey(roomId), JSON.stringify(toSave));
    } catch (e) {
        console.warn("Quota exceeded or error saving cache", e);
    }
}

function loadFromCache(roomId) {
    try {
        const data = localStorage.getItem(getCacheKey(roomId));
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading cache", e);
    }
    return null;
}

function handleNetworkChange() {
    isOffline = !navigator.onLine;
    if (isOffline) {
        showNotification("Mất kết nối mạng. Tin nhắn sẽ không được lưu.", "error");
        document.body.classList.add("offline-mode");
    } else {
        showNotification("Đã kết nối lại.", "success");
        document.body.classList.remove("offline-mode");
        // Khi có mạng lại, thử load lại tin nhắn mới nhất nếu đang ở trong phòng
        if (currentRoomId) {
            loadMessages(currentRoomId);
        }
    }
}

function showNotification(msg, type = 'info') {
    // Tận dụng notification có sẵn hoặc tạo mới đơn giản
    const noti = document.createElement("div");
    noti.className = `fixed-noti ${type}`;
    noti.innerText = msg;
    noti.style.position = "fixed";
    noti.style.top = "10px";
    noti.style.left = "50%";
    noti.style.transform = "translateX(-50%)";
    noti.style.padding = "10px 20px";
    noti.style.borderRadius = "20px";
    noti.style.background = type === 'error' ? '#EF4444' : '#10B981';
    noti.style.color = '#fff';
    noti.style.zIndex = "9999";
    noti.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
    noti.style.transition = "opacity 0.5s";
    document.body.appendChild(noti);
    setTimeout(() => {
        noti.style.opacity = "0";
        setTimeout(() => noti.remove(), 500);
    }, 3000);
}

/* ================= LOGIC ================= */
function renderRooms() {
    roomListEl.innerHTML = "";
    rooms.forEach(room => {
        const div = document.createElement("div");
        div.className = `room-item ${String(room.roomChatId) === String(currentRoomId) ? 'active' : ''}`;
        div.innerHTML = `
            <div class="room-avatar"><img src="${room.imageUrl || noImage}"></div>
            <div class="room-info">
                <div class="room-name">${room.roomChatName}</div>
                <div class="room-last-message" style = "${room.messageSentCount > 0 ? 'color: black; font-weight: bolder' : 'color: #65676b; font-weight: normal'}">
                    ${room.lastMessage || "Bắt đầu cuộc trò chuyện"}</div>
            </div>
            <div class="room-side">
                <div class="room-time">${room.lastMessageTime ? convertToVNTime(room.lastMessageTime) : ""}</div>
                <div class="room-options" title="Tùy chọn" onclick="toggleRoomOptions('${room.roomChatId}', event)">
                    <i class="fa-solid fa-ellipsis"></i>
                    <div class="room-options-menu" id="roomOptions-${room.roomChatId}">
                        <div class="rom-item" onclick="markRoomRead('${room.roomChatId}', event)">
                            <i class="fa-solid fa-check-double"></i> Đánh dấu đã đọc
                        </div>
                        <div class="rom-item danger" onclick="deleteRoomChat('${room.roomChatId}', event)">
                            <i class="fa-solid fa-trash-can"></i> Xóa đoạn chat
                        </div>
                    </div>
                </div>
            </div>
        `;
        div.onclick = () => openRoom(room.roomChatId);
        roomListEl.appendChild(div);
    });
}

window.toggleRoomOptions = (roomId, e) => {
    e.stopPropagation();
    // Đóng tất cả menu khác
    document.querySelectorAll(".room-options-menu.show").forEach(menu => {
        if (menu.id !== `roomOptions-${roomId}`) menu.classList.remove("show");
    });
    const menu = document.getElementById(`roomOptions-${roomId}`);
    if (menu) menu.classList.toggle("show");
};

window.markRoomRead = (roomId, e) => {
    e.stopPropagation();
    const menu = document.getElementById(`roomOptions-${roomId}`);
    if (menu) menu.classList.remove("show");

    // Gửi tín hiệu đánh dấu đã đọc
    send("/app/chat.read", { roomId: roomId });
    const r = rooms.find(item => String(item.roomChatId) === String(roomId));
    if (r) {
        r.messageSentCount = 0;
        renderRooms();
    }
    showNotification("Đã đánh dấu đọc", "success");
};

window.deleteRoomChat = async (roomId, e) => {
    e.stopPropagation();
    const menu = document.getElementById(`roomOptions-${roomId}`);
    if (menu) menu.classList.remove("show");

    await showDialog('question', "Bạn có chắc muốn xoá cuộc trò chuyện này?", async() => {
        const res = await callAPI(`/room-chat/${roomId}`, "DELETE");
        if (res && res.success) {
            rooms = rooms.filter(r => String(r.roomChatId) !== String(roomId));
            if (String(currentRoomId) === String(roomId)) {
                showEmptyChat();
                currentRoomId = null;
                history.pushState(null, "", window.location.pathname);
            }
            renderRooms();
            showNotification("Đã xóa đoạn chat", "success");
        } else {
            showNotification(res?.message || "Lỗi khi xóa đoạn chat", "error");
        }
    });
};

document.addEventListener("click", () => {
    document.querySelectorAll(".room-options-menu.show").forEach(menu => menu.classList.remove("show"));
});

async function openRoom(roomId) {
    currentRoomId = roomId;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('roomId', roomId);
    history.pushState(null, "", newUrl);

    const room = rooms.find(r => String(r.roomChatId) === String(roomId));
    if (!room) return;

    room.messageSentCount = 0;

    hasMoreMessages = true;
    page = 0;
    messages.length = 0;

    showChatRoom();
    renderRooms();
    chatAvatarEl.src = room.imageUrl || noImage;
    chatUsernameEl.textContent = room.roomChatName;
    chatMessagesEl.innerHTML = ``;

    await loadMembers(roomId); // Lấy currentUserId và danh sách người trong phòng

    // 1. Load từ cache trước để hiển thị ngay
    const cachedType = loadFromCache(roomId);
    if (cachedType && cachedType.length > 0) {
        messages.push(...cachedType);
        cachedType.forEach(m => appendMessage(m, false)); // Render cache
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // 2. Gọi API lấy tin mới nhất (nếu có mạng)
    if (!isOffline) {
        await loadMessages(roomId);
    }

    send("/app/chat.read", { roomId: currentRoomId });
}

async function loadMembers(roomId) {
    if (loadedMemberRooms.has(String(roomId))) return; // Đã load rồi thì thôi
    try {
        const res = await callAPI(`/room-chat/${roomId}/members`);
        if (res.data) {
            res.data.forEach(u => {
                senderMap[u.userId] = u; // Cập nhật cache người dùng
                if (u.isMe) currentUserId = u.userId;
            });
            loadedMemberRooms.add(String(roomId)); // Đánh dấu đã load
        }
    } catch (e) { console.error(e); }
}

async function loadMessages(roomId, isLazy = false) {
    try {
        if (hasMoreMessages === false) return;
        const prevScrollHeight = chatMessagesEl.scrollHeight;
        const res = await callAPI(`/room-chat/${roomId}/messages?page=${page}&&size=${size}`);
        const msgList = res.data?.listData || [];

        // Nếu load trang đầu tiên (mới nhất), cập nhật lại cache
        if (page === 0) {
            // Xóa tin nhắn cũ trên màn hình (do cache render rồi) để render tin chính thức từ server (tránh duplicate nếu cache lệch)
            // Hoặc đơn giản là: xóa messages hiện tại, thay bằng msgList
            messages.length = 0;
            chatMessagesEl.innerHTML = "";
            messages.push(...msgList.reverse()); // Đảo ngược để push vào mảng theo thứ tự thời gian tăng dần
            messages.forEach(m => appendMessage(m, false));
            if (!isOffline) saveCache(roomId, messages); // Lưu cache mới
        } else {
            messages.unshift(...msgList.reverse()); // Load trang cũ hơn
            msgList.forEach(m => appendMessage(m, true)); // Prepend vào DOM
        }

        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        hasMoreMessages = res.data.hasMore;
        page++;
        if (isLazy) {
            const newScrollHeight = chatMessagesEl.scrollHeight;
            chatMessagesEl.scrollTop = newScrollHeight - prevScrollHeight;
        }
        else {
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }
    } catch (e) { console.error(e); }
}

function appendMessage(msg, isPrepend = false) {
    const isMe = String(msg.senderId) === String(currentUserId);
    const sender = senderMap[msg.senderId] || {};

    const div = document.createElement("div");
    div.className = `chat-message ${isMe ? "me" : "other"}`;
    div.innerHTML = `
        ${!isMe ? `
            <div class="sender-info">
                <img src="${sender.imageUrl || noImage}">
                <span>${sender.username || "Người dùng"}</span>
            </div>
        ` : ""}
        <div class="message-content">${msg.content}</div>
        <div class="message-time">${convertToVNTime(msg.time)}</div>
    `;
    if (isPrepend) {
        chatMessagesEl.prepend(div);
    } else {
        chatMessagesEl.appendChild(div);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

}

function sendMessage() {
    const content = messageInputEl.value.trim();
    if (!content || !currentRoomId) return;
    send("/app/chat.send", { roomId: currentRoomId, content });
    messageInputEl.value = "";
}

/* ================= INIT ================= */
async function init() {
    try {
        const res = await callAPI("/room-chat");
        rooms = res.data.listData || [];
        renderRooms();

        connectStomp("/ws", () => {
            rooms.forEach(room => {
                subscribe(`/topic/room/${room.roomChatId}`, msg => {
                    // Cập nhật room list
                    const r = rooms.find(item => String(item.roomChatId) === String(msg.roomId));
                    if (r) {
                        // Tìm tên người gửi từ cache senderMap
                        const sender = senderMap[msg.senderId];
                        const senderName = sender ? (sender.isMe ? "Bạn" : sender.username) : "";

                        // Lưu cả tên và nội dung vào room để render
                        r.lastMessage = senderName ? `${senderName}: ${msg.content}` : msg.content;
                        r.lastMessageTime = msg.time;
                        r.messageSentCount += 1;

                        renderRooms(); // Vẽ lại danh sách
                    }

                    // Hiển thị tin nhắn nếu đang mở phòng đó
                    if (String(msg.roomId) === String(currentRoomId)) {
                        if (!senderMap[msg.senderId]) {
                            loadMembers(msg.roomId).then(() => appendMessage(msg));
                        } else { appendMessage(msg); }

                        // Cập nhật messages array và lưu cache
                        messages.push(msg);
                        if (!isOffline) saveCache(currentRoomId, messages);
                    }
                });
            });
        });

        sendBtnEl.onclick = sendMessage;
        messageInputEl.onkeydown = e => { if (e.key === "Enter") sendMessage(); };
        backBtnEl.onclick = () => { showEmptyChat(); currentRoomId = null; history.pushState(null, "", window.location.pathname); };

        const urlRoomId = new URLSearchParams(window.location.search).get("roomId");
        if (urlRoomId) openRoom(urlRoomId); else showEmptyChat();
        chatMessagesEl.addEventListener("scroll", async () => {
            if (chatMessagesEl.scrollTop === 0 && hasMoreMessages && !isOffline) {
                await loadMessages(currentRoomId, true);
            }
        });

        window.addEventListener('online', handleNetworkChange);
        window.addEventListener('offline', handleNetworkChange);
    } catch (e) { console.error(e); }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await init();
})