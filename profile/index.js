import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { convertToVNTime, getLoader, showLoader } from "../public/public.js";
import { initEmailList } from "./email-list.js";
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const birthdayInput = document.getElementById('birthday');
const genderInput = document.getElementById('gender');
const emailsSection = document.getElementById('emailsSection');
const role = document.getElementById('role');
const saveBtn = document.getElementById('saveBtn');
const createdAt = document.getElementById('createdAt');
const updatedAt = document.getElementById('updatedAt');
const avatarInput = document.getElementById('avatar');
const avatarPreview = document.getElementById('avatarPreview');
await getLoader('saveBtn');
async function loadProfile() {
    const result = await callAPI('/profile');
    if(!result.success){
        await showDialog('error', result.message);
        return;
    }
    const profile = result.data;
    avatarPreview.src = profile.imageUrl
    usernameInput.value = profile.username;
    fullNameInput.value = profile.fullName;
    birthdayInput.value = profile.birthday;
    genderInput.value = profile.genderName;
    role.value = profile.roleName;
    createdAt.textContent = convertToVNTime(profile.createdAt);
    updatedAt.textContent = convertToVNTime(profile.updatedAt);
    const html = await fetch("./email-list.html");
    const text = await html.text();
    emailsSection.insertAdjacentHTML('beforeend', text);
    window.emailManager = initEmailList(profile.emails);
}
await loadProfile();
avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file){
        avatarPreview.src = URL.createObjectURL(file);
    }
});
saveBtn.addEventListener('click', async()=> {
    const data = new FormData();
    data.append('profileRequest', new Blob(
        [JSON.stringify({
            username: usernameInput.value,
            fullName: fullNameInput.value,
            birthday: birthdayInput.value,
            genderName: genderInput.value,
            roleName: role.value
        })],
        {type: 'application/json'}
    ));
    data.append('avatar', avatarInput.files[0]);
    showLoader(true);
    saveBtn.classList.add('loading');
    const result = await callAPI('/profile', 'PUT', data, true);
    saveBtn.classList.remove('loading');
    showLoader(false);
    await showDialog(result.success ? 'success': 'error', result.message);
});