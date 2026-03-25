import { callAPI } from "/lib/api.js";
import { noImage, timeAgo } from "/lib/public.js";
import { send } from "/lib/websocket.js";
import { showDialog } from "/dialog/index.js";
import { state, dom } from "./state.js";
import { showEmptyChat, showChatRoom, showNotification } from "./ui.js";
import { loadFromCache } from "./cache.js";
import { loadMessages, appendMessage } from "./message.js";

export function renderRooms() {
    dom.roomListEl.innerHTML = "";
    state.rooms.forEach(room => {
        const div = document.createElement("div");
        div.className = `room-item ${String(room.roomChatId) === String(state.currentRoomId) ? 'active' : ''} ${room.roomChatId}`;
        div.style.display = room.roomChatStatus === "DELETED" ? "none" : "auto";
        div.innerHTML = `
            <div class="room-avatar"><img src="${room.imageUrl || noImage}"></div>
            <div class="room-info">
                <div class="room-name">
                    ${room.roomChatName}
                    ${room.roleName !== "USER" && room.roleName? `<span style="font-size: 0.65rem; color: #6b7280; border: 1px solid #d1d5db; padding: 1px 5px; border-radius: 8px; margin-left: 4px;">${room.roleName}</span>` : ""}
                </div>
                <div class="room-last-message" style="${room.messageSentCount > 0 ? 'color: black; font-weight: bolder' : 'color: #65676b; font-weight: normal'}">
                    ${room.lastMessage || "Bắt đầu cuộc trò chuyện"}</div>
            </div>
            <div class="room-side">
                <div class="room-time-wrapper">
                    <div class="room-time">${room.lastMessageTime ? timeAgo(room.lastMessageTime) : ""}</div>
                    ${room.messageSentCount > 0 ? `<div class="room-unread">${room.messageSentCount > 5 ? '5+' : room.messageSentCount}</div>` : ""}
                </div>
                <div class="room-options" title="Tùy chọn" onclick="toggleRoomOptions('${room.roomChatId}', event)">
                    <i class="fa-solid fa-ellipsis"></i>
                    <div class="room-options-menu" id="roomOptions-${room.roomChatId}">
                        <div class="rom-item" onclick="markRoomRead('${room.roomChatId}', event)">
                            <i class="fa-solid fa-check-double"></i> Đánh dấu đã đọc
                        </div>
                        <div class="rom-item danger" onclick="deleteRoomChat('${room.roomChatId}', event)">
                            <i class="fa-solid fa-trash-can"></i> Xoá cuộc trò chuyện
                        </div>
                    </div>
                </div>
            </div>
        `;
        div.onclick = () => openRoom(room.roomChatId);
        dom.roomListEl.appendChild(div);
    });
}

window.toggleRoomOptions = (roomId, e) => {
    e.stopPropagation();
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

    send("/app/chat.read", { roomId: roomId });
    const r = state.rooms.find(item => String(item.roomChatId) === String(roomId));
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
            if (String(state.currentRoomId) === String(roomId)) {
                showEmptyChat();
                state.currentRoomId = null;
                history.pushState(null, "", window.location.pathname);
            }
            let room = state.rooms.find(item => String(item.roomChatId) === String(roomId));
            room.roomChatStatus = "DELETED";
            renderRooms();
            showNotification("Đã xóa đoạn chat", "success");
        } else {
            showNotification(res?.message, "error");
        }
    });
};

export async function openRoom(roomId) {
    state.currentRoomId = roomId;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('roomId', roomId);
    history.pushState(null, "", newUrl);

    const room = state.rooms.find(r => String(r.roomChatId) === String(roomId));
    if (!room) return;

    room.messageSentCount = 0;

    state.hasMoreMessages = true;
    state.page = 0;
    state.messages.length = 0;

    showChatRoom();
    renderRooms();
    dom.chatAvatarEl.src = room.imageUrl || noImage;
    dom.chatUsernameEl.textContent = room.roomChatName;
    dom.chatRoleName.textContent = room.roleName;
    dom.chatMessagesEl.innerHTML = ``;

    await loadMembers(roomId);

    const cachedType = loadFromCache(roomId);
    if (cachedType && cachedType.length > 0) {
        state.messages.push(...cachedType);
        cachedType.forEach(m => appendMessage(m, false)); 
        dom.chatMessagesEl.scrollTop = dom.chatMessagesEl.scrollHeight;
    }

    if (!state.isOffline) {
        await loadMessages(roomId);
    }

    send("/app/chat.read", { roomId: state.currentRoomId });
}

export async function loadMembers(roomId) {
    if (state.loadedMemberRooms.has(String(roomId))) return;
    try {
        const res = await callAPI(`/room-chat/${roomId}/members`);
        if (res.data) {
            res.data.forEach(u => {
                state.senderMap[u.userId] = u;
                if (u.isMe) state.currentUserId = u.userId;
            });
            state.loadedMemberRooms.add(String(roomId));
        }
    } catch (e) { console.error(e); }
}
