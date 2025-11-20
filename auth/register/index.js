// register.js
import { showDialog } from "../../dialog/index.js";
import { callAPI } from "../../public/api.js";
import { getEye, getLoader } from "../../public/public.js";
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const birthdayInput = document.getElementById('birthday');
const genderInput = document.getElementById('gender');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const avatarInput = document.getElementById('avatar');
const registerBtn = document.getElementById('registerBtn');
const statusDiv = document.getElementById('status');
const avatarPreview = document.getElementById('avatarPreview');

getEye();
avatarInput.addEventListener('change', (event)=>{
    const file = event.target.files[0];
    if(file){
        avatarPreview.src = URL.createObjectURL(file);
    }
});
registerBtn.addEventListener('click', async() => {
    const username = usernameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const birthday = birthdayInput.value.trim();
    const gender = genderInput.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const avatar = avatarInput.files[0];

    statusDiv.textContent = '';
    statusDiv.classList.remove('error');
    
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
        {type: 'application/json'}
    ));
    data.append('avatar', avatar);
    let result = null;
    await getLoader('registerBtn', async () => {
        result = await callAPI('/auth/register', 'POST', data, true);
    });
    if(!result.success){
        if(Array.isArray(result.data) && result.data){
            statusDiv.style.display = 'block';
            statusDiv.classList.add("error");
            result.data.forEach(err => {
                statusDiv.textContent += err.error + '\n';
            });
        }
        await showDialog('error', result.message);
    }
    else {
        const sendEmail = await callAPI('/auth/send-verify-email', 'POST', {email});
        await showDialog(sendEmail.success ? 'success' : 'error', sendEmail.message);
    }
    
});
