// Import từ các file vệ tinh
import { mockMessagesDB, state } from "/message/data.js";
import { customLoadPage, customGetLoader } from "/message/helpers.js";
import * as View from "/message/view.js";
import {callAPI} from "/lib/api.js";

const result = await callAPI("/room-chat");
const roomChat = result.data.listData;
customLoadPage(() => {
    // 1. Render danh sách user lần đầu
    View.renderUsers(roomChat, state.currentUserId, handleSwitchUser);
    
    // // 2. Chọn user mặc định (người đầu tiên)
    // handleSwitchUser(roomChat[0]);
    
    // 3. Cài đặt sự kiện gửi tin
    setupEvents();
});

// --- LOGIC CHUYỂN ĐỔI USER ---
function handleSwitchUser(user) {
    // Cập nhật trạng thái
    state.currentUserId = user.id;

    // Cập nhật giao diện:
    // 1. Vẽ lại list user để highlight người đang chọn
    View.renderUsers(roomChat, state.currentUserId, handleSwitchUser);
    
    // 2. Đổi tên trên header
    View.updateChatHeader(user);
    
    // 3. Load tin nhắn của người đó
    const msgs = mockMessagesDB[user.id] || [];
    View.renderMessages(msgs, user);
    
    View.scrollToBottom();
}

// --- LOGIC GỬI TIN NHẮN ---
function setupEvents() {
    const btnSend = document.getElementById("btn-send");
    const inputMsg = document.getElementById("msg-content");

    const handleSend = async () => {
        const content = inputMsg.value.trim();
        if (!content) return;

        await customGetLoader("btn-send", async () => {
            // Giả lập delay gửi tin
            await new Promise(r => setTimeout(r, 600));
            
            const newMsg = {
                type: 'sent',
                content: content,
                time: new Date().toISOString()
            };

            // Lưu vào DB
            if(!mockMessagesDB[state.currentUserId]) mockMessagesDB[state.currentUserId] = [];
            mockMessagesDB[state.currentUserId].push(newMsg);

            // Vẽ tin nhắn mới lên màn hình
            View.appendMessage(newMsg, null);
            
            inputMsg.value = "";
            View.scrollToBottom();
        });
    };

    btnSend.addEventListener("click", handleSend);
    inputMsg.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSend();
    });
}