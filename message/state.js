export const state = {
    currentUserId: null,
    rooms: [],
    senderMap: {},
    currentRoomId: null,
    hasMoreMessages: true,
    page: 0,
    size: 20,
    messages: [],
    messageQueue: [],
    isOffline: !navigator.onLine,
    loadedMemberRooms: new Set()
};

export const statusMessage = {
    SENDING: "Đang gửi...",
    SENT: "Đã gửi",
    READ: "Đã xem"
}

export const dom = {
    chatContainerEl: document.getElementById("chatContainer"),
    roomListEl: document.getElementById("roomList"),
    chatAvatarEl: document.getElementById("chatAvatar"),
    chatUsernameEl: document.getElementById("chatUsername"),
    chatRoleName: document.getElementById("chatRoleName"),
    chatMessagesEl: document.getElementById("chatMessages"),
    chatEmptyEl: document.getElementById("chatEmpty"),
    chatHeaderEl: document.getElementById("chatHeader"),
    chatInputEl: document.getElementById("chatInput"),
    messageInputEl: document.getElementById("messageInput"),
    sendBtnEl: document.getElementById("sendBtn"),
    backBtnEl: document.getElementById("backBtn"),
};
