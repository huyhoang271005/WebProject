//hiển thị html
import { formatTime } from "./helpers.js";

// Render danh sách User
export function renderUsers(users, currentUserId, onUserClick) {
    const list = document.getElementById("user-list");
    if(!list) return;
    list.innerHTML = "";
    
    users.forEach(u => {
        const div = document.createElement('div');
        div.className = `user-item ${u.roomChatId === currentUserId ? 'active' : ''}`;
        div.setAttribute('data-id', u.roomChatId);
        
        div.innerHTML = `
            <div class="avatar" style="background: green">${u.imageUrl}</div>
            <div class="u-info">
                <div class="name">${u.roomChatName}</div>
                <div class="last-message">${u.lastMessage}</div>
            </div>
            <div class="time-stamp">${u.createdAt}</div>
        `;
        
        // Gắn sự kiện click, gọi callback function truyền từ index.js sang
        div.addEventListener('click', () => onUserClick(u));
        
        list.appendChild(div);
    });
}

// Update Header (Tên người chat)
export function updateChatHeader(user) {
    const header = document.querySelector('.chat-target');
    if(!header) return;
    
    header.innerHTML = `
        <div class="avatar-small" style="background: green">${user.imageUrl}</div>
        <div class="target-info">
            <h3>${user.chatRoomName}</h3>
            <span class="status-online">●</span>
        </div>
    `;
}

// Render toàn bộ tin nhắn
export function renderMessages(msgs, targetUser) {
    const list = document.getElementById("message-list");
    if(!list) return;
    list.innerHTML = "";
    msgs.forEach(msg => appendMessage(msg, targetUser));
}

// Thêm 1 tin nhắn mới
export function appendMessage(msg, targetUser) {
    const list = document.getElementById("message-list");
    const timeDisplay = formatTime(msg.time);

    // Logic hiển thị avatar cho tin nhắn nhận (Received)
    let avatarHTML = '';
    if (msg.type === 'received' && targetUser) {
        avatarHTML = `<div class="msg-avatar" style="background: ${targetUser.color}">${targetUser.avatar}</div>`;
    }

    const html = `
        <div class="msg-row ${msg.type}">
            ${avatarHTML}
            <div class="bubble">
                ${msg.content}
                <span class="time">${timeDisplay}</span>
            </div>
        </div>
    `;
    list.insertAdjacentHTML("beforeend", html);
}

export function scrollToBottom() {
    const container = document.getElementById("message-list");
    if(container) container.scrollTop = container.scrollHeight;
}