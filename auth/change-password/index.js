import { callAPI } from "../../public/api.js";
import {showDialog} from "../../dialog/index.js";
import { getEye, getLoader } from "../../public/public.js";
const token = new URLSearchParams(window.location.search).get("token");
const idPassword = document.getElementById("newPassword");
const idConfirmPassword = document.getElementById("confirmPassword");
const changeBtn = document.getElementById("changeBtn");
const status = document.getElementById("status");
await getEye();
changeBtn.addEventListener("click", async() => {
    status.style.display = 'none';
    const newPassword = idPassword.value.trim();
    const confirmPassword = idConfirmPassword.value.trim();
    if(newPassword != confirmPassword){
        status.style.display = 'block';
        status.textContent = "Mật khẩu không khớp";
        return;
    }
    status.textContent = "";
    const data = {
        password: newPassword
    }
    let result = null;
    await getLoader('changeBtn', async()=> {
        result = await callAPI(`/auth/verify-change-password?token=${token}`, 
            "POST", data);
    })
    if(!result.success && result.data){
        status.style.display = 'block';
        status.classList.add("error");
        result.data.forEach(err => {
            status.textContent += err.error;
        });
    }
    await showDialog(result.success ? 'success' : 'error', result.message);
});