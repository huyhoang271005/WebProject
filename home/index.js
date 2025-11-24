import { callAPI } from "../public/api.js";
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
    const result = await callAPI('/logout-all');
    if(result.success){
        localStorage.setItem('rememberUser', 'false');
        window.location.replace("/WebProject");
    }
});