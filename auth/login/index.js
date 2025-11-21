import {callAPI} from "../../public/api.js";
import {showDialog} from "../../dialog/index.js";
import {  getLoader, getEye} from "../../public/public.js";

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const statusDiv = document.getElementById('status');
const forgotPassword = document.getElementById('forgotPassword');
const rememberUser = document.getElementById('rememberUser');
await getEye();
loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // reset trạng thái
    statusDiv.style.display = 'none';
    statusDiv.textContent = '';

    if (!username || !password) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Vui lòng nhập đầy đủ thông tin.';
        return;
    }
    const data = {
        email: username,
        password: password
    }
    let result;
    await getLoader('loginBtn', async () => {
        result = await callAPI(`/auth/login`, 'POST', data);
    });
    let status = result.success ? 'success' : 'error';
    if(!result.success){
        if(Array.isArray(result.data)){
            statusDiv.style.display = 'block';
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
        await showDialog(status, result.message, async () => await verify(result.data, username), 
        status == 'error' || status == 'success' ? 'Đồng ý': 'Gửi email xác thực');
    }
    else {
        if(rememberUser.checked){
            localStorage.setItem('rememberUser', 'true');
        }
        else {
            localStorage.setItem('rememberUser', 'false');
        }
        window.location.replace('../../home');
    }
});

forgotPassword.addEventListener('click', async () => {
    await showDialog('question', `Gửi email xác thực đến ${usernameInput.value.trim()}?`, async () => {
        const username = usernameInput.value.trim();
        const data = {
            email: username
        }
        const result = await callAPI(`/auth/send-verify-change-password`, 'POST', data);
        await showDialog(result.success ? 'success' : 'error', result.message);
    });
});

async function verify(result, email) {
    if(!result || Array.isArray(result)) return;
    let resultSend;
    const data = {
        email: email
    }
    if(result.verifiedEmail === false){
        resultSend = await callAPI(`/auth/send-verify-email`, 'POST', data);
    } 
    else if(result.verifiedDevice === false){
        resultSend = await callAPI(`/auth/send-verify-device`, 'POST', data);
    }
    await showDialog(resultSend.success ? 'success' : 'error', resultSend.message);
}
