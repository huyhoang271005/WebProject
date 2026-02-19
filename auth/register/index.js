// register.js
import { showDialog } from "/dialog/index.js";
import { callAPI } from "/lib/api.js";
import { getEye, getLoader, noImage } from "/lib/public.js";
import { connectSse, subscribeTopic } from "/lib/sse.js";
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const birthdayInput = document.getElementById('birthday');
const genderInput = document.getElementById('gender');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const avatarInput = document.getElementById('avatar');
const registerForm = document.getElementById('registerForm');
const statusDiv = document.getElementById('status');
const avatarPreview = document.getElementById('avatarPreview');
avatarPreview.src = noImage;
await getEye();
avatarInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        avatarPreview.src = URL.createObjectURL(file);
    }
});
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const birthday = birthdayInput.value.trim();
    const gender = genderInput.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const avatar = avatarInput.files[0];

    statusDiv.textContent = '';
    statusDiv.classList.remove('error');
    if(!username || !fullName || !birthday || !gender || !email || !password) {
        statusDiv.style.display = 'block';
        statusDiv.classList.add("error");
        statusDiv.textContent = "Vui lòng nhập đẩy đủ thông tin";
        return;
    }
    const data = new FormData();
    data.append('registerRequest', new Blob(
        [JSON.stringify({
            email,
            password,
            username,
            fullName,
            birthday,
            gender
        })],
        { type: 'application/json' }
    ));
    data.append('avatar', avatar);
    let result = null;
    await getLoader('registerBtn', async () => {
        result = await callAPI('/auth/register', 'POST', data, true);
    });
    if (!result.success) {
        if (Array.isArray(result.data) && result.data) {
            statusDiv.style.display = 'block';
            statusDiv.classList.add("error");
            result.data.forEach(err => {
                statusDiv.textContent += err.error + '\n';
            });
        }
    }
    else {
        const sendEmail = await callAPI('/auth/send-verify-email', 'POST', { email });
        if (sendEmail.success) {
            await connectSse("/sse?sessionId=" + result.data.sessionId);
            subscribeTopic("verified", async (data) => {
                if (data === true) {
                    sessionStorage.setItem("infoLogin", JSON.stringify({
                        email: email,
                        password: password
                    }));
                    window.location.replace("/auth/login/?register=true");
                }
            });
        }
        await showDialog(sendEmail.success ? 'success' : 'error', sendEmail.message);
    }

});
