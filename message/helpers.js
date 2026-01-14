import { convertToVNTime } from "../lib/public.js";

export function formatTime(isoString) {
    try {
        const fullTime = convertToVNTime(isoString);
        return fullTime.split(" ")[1] || fullTime.split(" ")[0]; 
    } catch (e) {
        return "Now";
    }
}

export function customLoadPage(callback) {
    window.addEventListener('DOMContentLoaded', async () => {
        const loadPageDiv = document.getElementById('loadPage');
        if (loadPageDiv) loadPageDiv.style.display = 'none';
        
        const infoDiv = document.getElementById('info');
        if (infoDiv) infoDiv.style.display = 'block';
        
        if (callback) await callback();
    });
}

export async function customGetLoader(btnId, callback) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const oldContent = btn.innerHTML;
    
    // Icon loading
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btn.disabled = true;

    try {
        if (callback) await callback();
    } finally {
        btn.innerHTML = oldContent;
        btn.disabled = false;
        const input = document.getElementById("msg-content");
        if(input) input.focus(); // Focus lại input sau khi gửi xong
    }
}