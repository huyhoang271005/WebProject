import {callAPI} from "../public/api.js";
import {showDialog} from "../dialog/dialog.js";
import { showLoader } from "../public/public.js";

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const statusDiv = document.getElementById('status');
const forgotPassword = document.getElementById('forgotPassword');
const rememberUser = document.getElementById('rememberUser');

loginBtn.addEventListener('click', async () => {
    showLoader(true);
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // reset trạng thái
    statusDiv.style.display = 'none';
    statusDiv.textContent = '';
    statusDiv.classList.remove('error');

    if (!username || !password) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        statusDiv.classList.add('error');
        showLoader(false);
        return;
    }
    const data = {
        email: username,
        password: password
    }
    loginBtn.classList.add('loading');
    const result = await callAPI(`/auth/login`, 'POST', data, false);
    loginBtn.classList.remove('loading');
    showLoader(false);
    loginBtn.disabled = false;
    let status = result.success ? 'success' : 'error';
    if(!result.success){
        if(Array.isArray(result.data) && result.data){
            statusDiv.style.display = 'block';
            statusDiv.classList.add("error");
            result.data.forEach(err => {
                statusDiv.textContent += err.error + '\n';
            });
        }
        else if (!result.data){
            status = 'error';
        }
        else {
            status = 'question';
        }
        showDialog(status, result.message, async () => await verify(result.data, username), 
        status == 'error' || status == 'success' || !result.data? 'Đồng ý': 'Gửi email xác thực');
    }
    else {
        if(rememberUser.checked){
            localStorage.setItem('rememberUser', 'true');
        }
        else {
            localStorage.setItem('rememberUser', 'false');
        }
        showDialog('success', result.message);
    }
});

forgotPassword.addEventListener('click', async () => {
    showDialog('question', "Chúng tôi sẽ gửi một thông báo qua địa chỉ email bạn nhập bên trên để xác nhận?", async () => {
        const username = usernameInput.value.trim();
        const data = {
            email: username
        }
        const result = await callAPI(`/auth/send-verify-change-password`, 'POST', data, false);
        showDialog(result.success ? 'success' : 'error', result.message);
    });
});

async function verify(result, email) {
    if(result.verifiedEmail === null && result.verifiedDevice === null) return;
    let resultSend;
    const data = {
        email: email
    }
    if(result.verifiedEmail === false){
        resultSend = await callAPI(`/auth/send-verify-email`, 'POST', data, false);
    } 
    else if(result.verifiedDevice === false){
        resultSend = await callAPI(`/auth/send-verify-device`, 'POST', data, false);
    }
    showDialog(resultSend.success ? 'success' : 'error', resultSend.message);
}
