import {callAPI} from "/lib/api.js";
import {showDialog} from "/dialog/index.js";
import {  getLoader, getEye} from "/lib/public.js";
import {connectSse, subscribeTopic} from "/lib/sse.js";

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginForm = document.getElementById('login-form');
const statusDiv = document.getElementById('status');
const forgotPassword = document.getElementById('forgotPassword');
const rememberUser = document.getElementById('rememberUser');
async function login() {
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

    }
    else {
        if(result.data.verifiedEmail === false || result.data.verifiedDevice === false){
            status = 'question';
            await showDialog(status, result.message, async () => await verify(result.data, username),
                status === 'error' || status === 'success' ? 'Đồng ý': 'Gửi email xác thực');
            return;
        }
        localStorage.setItem('rememberUser', rememberUser.checked);
        window.location.replace('/home');
    }
}

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
    if(resultSend.success){
        await connectSse("/sse?sessionId=" + resultSend.data.sessionId);
        subscribeTopic("verified", async (data) => {
            if(data === true){
                await login();
            }
        });
    }
    await showDialog(resultSend.success ? 'success' : 'error', resultSend.message);
}

window.addEventListener('DOMContentLoaded', async () => {
    await getEye();
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await login();
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
    const params = new URLSearchParams(window.location.search);
    if(params.get("register")){
        let infoLogin = sessionStorage.getItem("infoLogin");
        infoLogin = JSON.parse(infoLogin);
        usernameInput.value = infoLogin.email;
        passwordInput.value = infoLogin.password;
        sessionStorage.clear();
        await login();
    }
});
