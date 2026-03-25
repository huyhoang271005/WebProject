import { callAPI } from "/lib/api.js";
import {connectStomp, send, subscribe} from "/lib/websocket.js";
import { loadNavbar } from "../navbar/navbar.js";
import {state, dom, statusMessage} from "./state.js";
import { saveCache } from "./cache.js";
import { showNotification, showEmptyChat } from "./ui.js";
import {renderRooms, openRoom, loadMembers} from "./room.js";
import { loadMessages, appendMessage, sendMessage, processMessageQueue } from "./message.js";

function handleNetworkChange() {
    state.isOffline = !navigator.onLine;
    if (state.isOffline) {
        showNotification("Mất kết nối mạng. Tin nhắn sẽ không được lưu.", "error");
        document.body.classList.add("offline-mode");
    } else {
        showNotification("Đã kết nối lại.", "success");
        document.body.classList.remove("offline-mode");
        if (state.currentRoomId) {
            loadMessages(state.currentRoomId);
        }
    }
}

document.addEventListener("click", () => {
    document.querySelectorAll(".room-options-menu.show").forEach(menu => menu.classList.remove("show"));
    document.querySelectorAll(".message-options-menu.show").forEach(menu => menu.classList.remove("show"));
});

async function init() {
    try {
        const res = await callAPI("/room-chat");
        state.rooms = res.data.listData || [];
        renderRooms();

        state.rooms.forEach(room => {
            subscribe(`/topic/room/${room.roomChatId}`, msg => {
                const msgId = msg.messageId;
                
                // Xử lý các action revoke/delete từ websocket
                if (msg.action === "REVOKE") {
                    const msgEl = document.getElementById(`msg-el-${msgId}`);
                    if (msgEl) {
                        msgEl.innerHTML = `<div class="message-content" style="font-style: italic; color: #888;">Tin nhắn đã bị thu hồi</div>`;
                    }
                    return;
                }

                if (msg.action === "READ") {
                    if (msg.senderId !== state.currentUserId && msg.senderId) {
                        const allMessageElements = document.querySelectorAll(`.chat-message`);
                        allMessageElements.forEach(message => {
                            const senderInfo = message.querySelector(`.sender-info`);
                            if(!senderInfo) {
                                const status = message.querySelector(`.message-time .message-status`);
                                if (status) status.textContent = statusMessage[msg.action];
                            }
                        });
                    }
                    return;
                }

                // Xử lý luồng tin nhắn bình thường
                const r = state.rooms.find(item => String(item.roomChatId) === String(msg.roomId));
                if (r) {
                    const sender = state.senderMap[msg.senderId];
                    const senderName = sender ? (sender.isMe ? "Bạn" : sender.fullName) : "";
                    const isMe = sender ? sender.isMe : (String(msg.senderId) === String(state.currentUserId));

                    r.lastMessage = msg.content;
                    r.lastMessageTime = msg.time;
                    
                    if (String(msg.roomId) === String(state.currentRoomId)) {
                        r.messageSentCount = 0;
                        send("/app/chat.read", { roomId: msg.roomId });
                    } else if (!isMe) {
                        r.messageSentCount += 1;
                    }

                    r.roomChatStatus = "NORMAL";

                    renderRooms();
                }

                const queueIdx = state.messageQueue.findIndex(q => String(q.roomId) === String(msg.roomId) && q.content === msg.content && String(q.senderId) === String(msg.senderId));
                let tempMsg = null;
                if (queueIdx !== -1) {
                    tempMsg = state.messageQueue[queueIdx];
                    state.messageQueue.splice(queueIdx, 1);
                }

                if (String(msg.roomId) === String(state.currentRoomId)) {
                    if (tempMsg) {
                        const tempDiv = document.getElementById(`msg-el-${tempMsg.messageId}`);
                        if (tempDiv) {
                            tempDiv.id = `msg-el-${msg.messageId}`;
                            tempDiv.innerHTML = tempDiv.innerHTML.replaceAll(tempMsg.messageId, msg.messageId);
                            
                            const statusSpan = tempDiv.querySelector('.message-status');
                            if (statusSpan) statusSpan.textContent = statusMessage[msg.status] || statusMessage["SENT"];

                            state.messages.push(msg);
                            if (!state.isOffline) saveCache(state.currentRoomId, state.messages);
                            return; 
                        }
                    }

                    if (!state.senderMap[msg.senderId]) {
                        loadMembers(msg.roomId).then(() => appendMessage(msg));
                    } else { 
                        appendMessage(msg); 
                    }

                    state.messages.push(msg);
                    if (!state.isOffline) saveCache(state.currentRoomId, state.messages);
                }
            });
        });

        connectStomp("/ws", () => {
            processMessageQueue();
        });

        const urlRoomId = new URLSearchParams(window.location.search).get("roomId");

        dom.sendBtnEl.onclick = () => {
            sendMessage();
        }
        dom.messageInputEl.onkeydown = e => {
            if (e.key === "Enter") {
                sendMessage();
            }
        };
        dom.backBtnEl.onclick = () => { showEmptyChat(); state.currentRoomId = null; history.pushState(null, "", window.location.pathname); };

        if (urlRoomId) await openRoom(urlRoomId); else showEmptyChat();
        
        dom.chatMessagesEl.addEventListener("scroll", async () => {
            if (dom.chatMessagesEl.scrollTop === 0 && state.hasMoreMessages && !state.isOffline) {
                await loadMessages(state.currentRoomId, true);
            }
        });

        window.addEventListener('online', handleNetworkChange);
        window.addEventListener('offline', handleNetworkChange);
    } catch (e) { 
        console.error(e); 
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    await init();
});