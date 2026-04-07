import { callAPI } from "/lib/api.js";
import { noImage, timeAgo } from "/lib/public.js";
import { send } from "/lib/websocket.js";
import { showDialog } from "/dialog/index.js";
import { state, dom, statusMessage } from "./state.js";
import { saveCache } from "./cache.js";
import { showNotification } from "./ui.js";

// Global message functions

export async function loadMessages(roomId, isLazy = false) {
    try {
        if (state.hasMoreMessages === false) return;
        const prevScrollHeight = dom.chatMessagesEl.scrollHeight;
        const res = await callAPI(`/room-chat/${roomId}/messages?page=${state.page}&size=${state.size}`);
        const msgList = res.data?.listData || [];

        if (state.page === 0) {
            state.messages.length = 0;
            dom.chatMessagesEl.innerHTML = "";
            state.messages.push(...msgList.reverse());
            state.messages.forEach(m => appendMessage(m, false));
            if (!state.isOffline) saveCache(roomId, state.messages);
        } else {
            state.messages.unshift(...msgList.reverse());
            msgList.forEach(m => appendMessage(m, true));
        }

        dom.chatMessagesEl.scrollTop = dom.chatMessagesEl.scrollHeight;
        state.hasMoreMessages = res.data.hasMore;
        state.page++;
        if (isLazy) {
            const newScrollHeight = dom.chatMessagesEl.scrollHeight;
            dom.chatMessagesEl.scrollTop = newScrollHeight - prevScrollHeight;
        }
        else {
            dom.chatMessagesEl.scrollTop = dom.chatMessagesEl.scrollHeight;
        }
    } catch (e) { console.error(e); }
}

export function appendMessage(msg, isPrepend = false) {
    const isMe = String(msg.senderId) === String(state.currentUserId);
    const sender = state.senderMap[msg.senderId] || {};
    const msgId = msg.messageId;

    const div = document.createElement("div");
    div.id = `msg-el-${msgId}`;
    div.className = `chat-message ${isMe ? "me" : "other"}`;
    div.onclick = () => {
        const wasShown = div.classList.contains('show-time');
        document.querySelectorAll('.chat-message.show-time').forEach(el => {
            el.classList.remove('show-time');
        });
        if (!wasShown) {
            div.classList.add('show-time');
        }
    };
    div.innerHTML = `
        ${!isMe ? `
            <div class="sender-info" onclick="window.location.href='/user-detail?uid=${msg.senderId}'">
                <img src="${sender.imageUrl || noImage}">
                <span>${sender.fullName || "Người dùng"}</span>
            </div>
        ` : ""}
        <div class="message-wrapper">
            <div class="message-content">${msg.content}</div>
            <div class="message-options" onclick="toggleMessageOptions('${msgId}', event)" title="Tùy chọn">
                <i class="fa-solid fa-ellipsis-vertical"></i>
                <div class="message-options-menu" id="msgOptions-${msgId}">
                    <div class="msg-opt-item danger" onclick="deleteMessageForMe('${msgId}', event)">
                        <i class="fa-solid fa-trash-can"></i> Xóa phía bạn
                    </div>
                    ${isMe ? `
                    <div class="msg-opt-item danger" onclick="revokeMessage('${msgId}', event)">
                        <i class="fa-solid fa-rotate-left"></i> Thu hồi tin nhắn
                    </div>
                    ` : ""}
                </div>
            </div>
        </div>
        <div class="message-time">${timeAgo(msg.time)} 
            <span class = "message-status">${isMe ? !msg.status ? statusMessage["READ"] : statusMessage[msg.status] : ""}</span>
        </div>
    `;
    if (isPrepend) {
        dom.chatMessagesEl.prepend(div);
    } else {
        dom.chatMessagesEl.appendChild(div);
        dom.chatMessagesEl.scrollTop = dom.chatMessagesEl.scrollHeight;
    }
}

export function sendMessage() {
    const content = dom.messageInputEl.value.trim();
    if (!content || !state.currentRoomId) return;

    const tempId = "temp-" + Date.now() + Math.floor(Math.random() * 1000);
    const msg = {
        messageId: tempId,
        content: content,
        roomId: state.currentRoomId,
        senderId: state.currentUserId,
        time: new Date().toISOString(),
        status: "SENDING",
        isTemp: true
    };

    appendMessage(msg, false);
    state.messageQueue.push(msg);

    dom.messageInputEl.value = "";

    processMessageQueue();
}

export function processMessageQueue() {
    if (!state.messageQueue || state.messageQueue.length === 0) return;
    // Cần import isConnected từ websocket.js nhưng ở đầu file đã có import send, ta sẽ update ở tool call khác hoặc trong bước sửa import
    // Do đó tạm thời giả định isConnected đã có
    import("/lib/websocket.js").then(ws => {
        if (!ws.isConnected()) return;

        const now = Date.now();
        state.messageQueue.forEach(msg => {
            if (msg.lastSent && (now - msg.lastSent < 2000)) return;
            msg.lastSent = now;
            ws.send("/app/chat.send", { roomId: msg.roomId, content: msg.content, tempId: msg.messageId });
        });
    });
}

window.toggleMessageOptions = (msgId, e) => {
    e.stopPropagation();
    document.querySelectorAll(".message-options-menu.show").forEach(menu => {
        if (menu.id !== `msgOptions-${msgId}`) menu.classList.remove("show");
    });
    const menu = document.getElementById(`msgOptions-${msgId}`);
    if (menu) menu.classList.toggle("show");
};

window.deleteMessageForMe = async (msgId, e) => {
    e.stopPropagation();
    const menu = document.getElementById(`msgOptions-${msgId}`);
    if (menu) menu.classList.remove("show");

    await showDialog('question', "Bạn có chắc muốn xóa tin nhắn này ở phía bạn?", async () => {
        const res = await callAPI(`/room-chat/${state.currentRoomId}/messages/${msgId}`, "DELETE");
        if (res && res.success) {
            const msgEl = document.getElementById(`msg-el-${msgId}`);
            if (msgEl) msgEl.remove();
            showNotification("Đã xóa tin nhắn", "success");
        } else {
            showNotification(res?.message || "Lỗi khi xóa tin nhắn", "error");
        }
    });
};

window.revokeMessage = async (msgId, e) => {
    e.stopPropagation();
    const menu = document.getElementById(`msgOptions-${msgId}`);
    if (menu) menu.classList.remove("show");

    await showDialog('question', "Bạn có chắc muốn thu hồi tin nhắn này với mọi người?", async () => {
        send("/app/chat.revoke", { roomId: state.currentRoomId, messageId: msgId });
    });
};
