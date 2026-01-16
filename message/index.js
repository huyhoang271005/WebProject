import { callAPI } from "/lib/api.js";
import { noImage, convertToVNTime } from "/lib/public.js";
import { connectStomp, subscribe, send } from "/lib/websocket.js";

/* ================= STATE ================= */
let currentUserId = null;
let rooms = [];
let senderMap = {}; // Cache toàn cục cho thông tin người dùng
let currentRoomId = null;

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
                <div class="room-last-message">${room.lastMessage || "Bắt đầu cuộc trò chuyện"}</div>
            </div>
            <div class="room-time">${room.lastMessageTime ? convertToVNTime(room.lastMessageTime) : ""}</div>
        `;
        div.onclick = () => openRoom(room.roomChatId);
        roomListEl.appendChild(div);
    });
}

async function openRoom(roomId) {
    currentRoomId = roomId;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('roomId', roomId);
    history.pushState(null, "", newUrl);

    const room = rooms.find(r => String(r.roomChatId) === String(roomId));
    if (!room) return;

    showChatRoom();
    renderRooms();
    chatAvatarEl.src = room.imageUrl || noImage;
    chatUsernameEl.textContent = room.roomChatName;
    chatMessagesEl.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">Đang tải...</div>`;

    await loadMembers(roomId); // Lấy currentUserId và danh sách người trong phòng
    await loadMessages(roomId);
}

async function loadMembers(roomId) {
    try {
        const res = await callAPI(`/room-chat/${roomId}/members`);
        if (res.data) {
            res.data.forEach(u => {
                senderMap[u.userId] = u; // Cập nhật cache người dùng
                if (u.isMe) currentUserId = u.userId;
                console.log(u);
            });
        }
        console.log(currentUserId);
    } catch (e) { console.error(e); }
}

async function loadMessages(roomId) {
    try {
        const res = await callAPI(`/room-chat/${roomId}/messages`);
        const msgList = res.data?.listData;
        chatMessagesEl.innerHTML = msgList.length === 0 ? `<div style="text-align:center;color:#999;margin-top:20px;">Chưa có tin nhắn</div>` : "";
        msgList.forEach(m => appendMessage(m));
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    } catch (e) { console.error(e); }
}

function appendMessage(msg) {
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
    chatMessagesEl.appendChild(div);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function sendMessage() {
    const content = messageInputEl.value.trim();
    if (!content || !currentRoomId) return;
    send("/app/chat.send", { roomId: currentRoomId, content });
    messageInputEl.value = "";
}

/* ================= INIT ================= */
(async function init() {
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

                        renderRooms(); // Vẽ lại danh sách
                    }

                    // Hiển thị tin nhắn nếu đang mở phòng đó
                    if (String(msg.roomId) === String(currentRoomId)) {
                        if (!senderMap[msg.senderId]) {
                            loadMembers(msg.roomId).then(() => appendMessage(msg));
                        } else { appendMessage(msg); }
                    }
                });
            });
        });

        sendBtnEl.onclick = sendMessage;
        messageInputEl.onkeydown = e => { if (e.key === "Enter") sendMessage(); };
        backBtnEl.onclick = () => { showEmptyChat(); currentRoomId = null; history.pushState(null, "", window.location.pathname); };

        const urlRoomId = new URLSearchParams(window.location.search).get("roomId");
        if (urlRoomId) openRoom(urlRoomId); else showEmptyChat();
    } catch (e) { console.error(e); }
})();