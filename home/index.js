import { showDialog } from "../dialog/index.js";
import { callAPI, connectSse } from "../public/api.js";
import { getLoader } from "../public/public.js";
const btn = document.getElementById('test');
const message = document.getElementById('message');
const sendAll = document.getElementById('sendAll');
const listMessage = document.getElementById('listMessage');
function addHistory(message){
    const div = document.createElement('div');
    div.innerHTML= message;
    listMessage.appendChild(div);
}
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
sendAll.addEventListener('click', async()=>{
    const data = {
        success: true,
        message: message.value,
        data: null
    }
    const result = await callAPI('/push', 'POST', data);
    if(result.success){
        message.value = '';
    }
});
connectSse('/connect', data => {
    if(data.success){
        addHistory(data.message);
    }
});
