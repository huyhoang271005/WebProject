import { showDialog } from "../dialog/index.js";
import { callAPI, API_BASE } from "../public/api.js";
import { getLoader } from "../public/public.js";
const btn = document.getElementById('test');
btn.style.position = 'absolute';
btn.style.width = 'auto';
btn.addEventListener('mouseover', ()=>{
    btn.style.left = Math.random()*90+1 + 'vw';
    btn.style.top = Math.random()*90+1 + 'vh';
});
const logout = document.getElementById('logout');
logout.addEventListener('click', async()=>{
    const result = await callAPI('/logout');
    if(result.success){
        localStorage.setItem('rememberUser', 'false');
        window.location.replace("/WebProject");
    }
});
const eventSource = new EventSource(`${API_BASE}/auth/connect`);
eventSource.onmessage = async function(event){
    const data = await JSON.parse(event.data);
    await showDialog(data.success ? 'success' : 'error', data.message);
};