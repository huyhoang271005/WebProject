import { callAPI } from "../api-public/api.js";
import {showDialog} from "../dialog/dialog.js";

const token = new URLSearchParams(window.location.search).get("token");
const idPassword = document.getElementById("newPassword");
const idConfirmPassword = document.getElementById("confirmPassword");
const changeBtn = document.getElementById("changeBtn");
const status = document.getElementById("status");
changeBtn.addEventListener("click", async() => {
    const newPassword = idPassword.value.trim();
    const confirmPassword = idConfirmPassword.value.trim();
    if(newPassword != confirmPassword){
        status.textContent = "Mật khẩu không khớp";
        status.classList.add("error");
        return;
    }
    status.textContent = "";
    status.classList.remove("error");
    const data = {
        password: newPassword
    }
    const result = await callAPI(`/auth/verify-change-password?token=${token}`, 
        "POST", data, false);
    if(!result.success && result.data){
        status.classList.add("error");
        result.data.forEach(err => {
            status.textContent += err.error;
        });
    }
    showDialog(result.success ? 'success' : 'error', result.message);
});