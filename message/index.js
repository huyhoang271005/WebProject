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
        showNotification("Mất kết nối mạng.", "error");
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
                const msgId = msg.messageId || msg.id;
                
                // Xử lý các status revoke/delete từ websocket
                if (msg.status === "REVOKE") {
                    const msgEl = document.getElementById(`msg-el-${msgId}`);
                    if (msgEl) {
                        msgEl.innerHTML = `<div class="message-content" style="font-style: italic; color: #888;">Tin nhắn đã bị thu hồi</div>`;
                    }
                    return;
                }

                if (msg.status === "READ") {
                    if (msg.senderId !== state.currentUserId && msg.senderId) {
                        const allMessageElements = document.querySelectorAll(`.chat-message`);
                        allMessageElements.forEach(message => {
                            const senderInfo = message.querySelector(`.sender-info`);
                            if(!senderInfo) {
                                const status = message.querySelector(`.message-time .message-status`);
                                if (status) status.textContent = statusMessage[msg.status];
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

                    if (msg.content) {
                        r.lastMessage = msg.content;
                    }
                    if (msg.time) {
                        r.lastMessageTime = msg.time;
                    }
                    
                    if (String(msg.roomId) === String(state.currentRoomId)) {
                        r.messageSentCount = 0;
                        // Chỉ gửi thông báo READ nếu đó là tin nhắn của người khác gửi đến
                        if (!isMe && msg.content) {
                            send("/app/chat.read", { roomId: msg.roomId });
                        }
                    } else if (!isMe) {
                        r.messageSentCount += 1;
                    }

                    if (r.roomChatStatus !== "DELETED" && r.roomChatStatus !== "MUTE") {
                        r.roomChatStatus = "NORMAL";
                    }

                    // Đẩy room chat lên đầu danh sách
                    const roomIndex = state.rooms.indexOf(r);
                    if (roomIndex > 0) {
                        state.rooms.splice(roomIndex, 1);
                        state.rooms.unshift(r);
                    }

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

    let searchType = null;

    document.getElementById("btnOrderLink").onclick = () => {
        searchType = 'order';
        document.getElementById('linkSearchTitle').innerHTML = '<i class="fa-solid fa-box"></i> Tìm Đơn hàng';
        document.getElementById('linkSearchInput').placeholder = 'Nhập mã đơn hàng...';
        document.getElementById('linkSearchInput').value = '';
        document.getElementById('linkSearchResult').innerHTML = '';
        document.getElementById('linkSearchModal').style.display = 'flex';
    };

    document.getElementById("btnProductLink").onclick = () => {
        searchType = 'product';
        document.getElementById('linkSearchTitle').innerHTML = '<i class="fa-solid fa-tag"></i> Tìm Sản phẩm';
        document.getElementById('linkSearchInput').placeholder = 'Nhập tên sản phẩm...';
        document.getElementById('linkSearchInput').value = '';
        document.getElementById('linkSearchResult').innerHTML = '';
        document.getElementById('linkSearchModal').style.display = 'flex';
    };

    document.getElementById("linkSearchBtn").onclick = async () => {
        const val = document.getElementById('linkSearchInput').value.trim();
        if (!val) return;
        const resContainer = document.getElementById('linkSearchResult');
        resContainer.innerHTML = '<p>Đang tìm kiếm...</p>';
        
        try {
            if (searchType === 'order') {
                const res = await callAPI(`/admin/orders?orderId=${encodeURIComponent(val)}`);
                const list = res.data?.listData || [];
                if (list.length === 0) {
                    resContainer.innerHTML = `<p>${res.message}</p>`;
                    return;
                }
                resContainer.innerHTML = list.map(o => {
                    const firstImage = o.orderItemDTOList?.[0]?.imageUrl || '';
                    const idStr = o.orderId;
                    return `
                        <div style="display:flex; border: 1px solid #ddd; padding: 10px; border-radius: 8px; cursor:pointer;" onclick="selectLinkItem('order', '${idStr}', '${firstImage}')">
                            <img src="${firstImage}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; border-radius: 4px;">
                            <div>
                                <div style="font-weight: bold;">Đơn hàng #${idStr.substring(0,8)}</div>
                                <div style="font-size: 12px; color: #888;">Người nhận: ${o.contactName || ''}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                const res = await callAPI(`/products?productName=${encodeURIComponent(val)}`);
                const list = res.data?.listData || [];
                if (list.length === 0) {
                    resContainer.innerHTML = '<p>Không tìm thấy kết quả.</p>';
                    return;
                }
                resContainer.innerHTML = list.map(p => {
                    const firstImage = p.imageUrl || '';
                    const idStr = p.productId || '';
                    return `
                        <div style="display:flex; border: 1px solid #ddd; padding: 10px; border-radius: 8px; cursor:pointer;" onclick="selectLinkItem('product', '${idStr}', '${firstImage}', decodeURIComponent('${encodeURIComponent(p.productName)}'))">
                            <img src="${firstImage}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; border-radius: 4px;">
                            <div>
                                <div style="font-weight: bold;">${p.productName}</div>
                                <div style="font-size: 12px; color: #888;">(Bấm để gửi)</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            resContainer.innerHTML = '<p>Lỗi khi tìm kiếm.</p>';
        }
    };

    window.selectLinkItem = (type, id, imgUrl, name = '') => {
        const content = `${id} ${imgUrl} ${name}`.trim();
        sendMessage(content, type.toUpperCase());
        document.getElementById('linkSearchModal').style.display = 'none';
    }
});