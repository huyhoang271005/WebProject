import { dom } from "./state.js";

export function showEmptyChat() {
    dom.chatEmptyEl.classList.remove("hidden");
    dom.chatHeaderEl.classList.add("hidden");
    dom.chatMessagesEl.classList.add("hidden");
    dom.chatInputEl.classList.add("hidden");
    dom.chatContainerEl.classList.remove("mobile-active");
}

export function showChatRoom() {
    dom.chatEmptyEl.classList.add("hidden");
    dom.chatHeaderEl.classList.remove("hidden");
    dom.chatMessagesEl.classList.remove("hidden");
    dom.chatInputEl.classList.remove("hidden");
    dom.chatContainerEl.classList.add("mobile-active");
}

export function showNotification(msg, type = 'info') {
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
