import {callAPI} from "../api-public/api.js";
import {showDialog} from "../dialog/dialog.js";

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const statusDiv = document.getElementById('status');
const forgotPassword = document.getElementById('forgotPassword');
const rememberUser = document.getElementById('rememberUser');

loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // reset trạng thái
    statusDiv.textContent = '';
    statusDiv.classList.remove('error');

    if (!username || !password) {
        statusDiv.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        statusDiv.classList.add('error');
        return;
    }
    const data = {
        email: username,
        password: password
    }
    const result = await callAPI(`/auth/login`, 'POST', data, false);
    let status = result.success ? 'success' : 'question';
    if(!result.success && result.data){
        if(Array.isArray(result.data)){
            status = 'error';
            statusDiv.classList.add("error");
            result.data.forEach(err => {
                statusDiv.textContent += err.error;
            });
        }
    }
    if(!result.success) {
        showDialog(status, result.message, async () => await verify(result.data, username), status == 'error' || status == 'success' ? 'Đồng ý': 'Gửi email xác thực');
    }
    else {
        if(rememberUser.checked){
            localStorage.setItem('rememberUser', 'true');
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
