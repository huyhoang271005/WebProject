import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { convertToVNTime } from "../public/public.js";
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const birthdayInput = document.getElementById('birthday');
const genderInput = document.getElementById('gender');
const emailInput = document.getElementById('email');
const role = document.getElementById('role');
const saveBtn = document.getElementById('saveBtn');
const createdAt = document.getElementById('createdAt');
const updatedAt = document.getElementById('updatedAt');
const avatarInput = document.getElementById('avatar');
const avatarPreview = document.getElementById('avatarPreview');
let avatarId = null;
let userId = null;
async function loadProfile() {
    const result = await callAPI('/profile');
    if(!result.success){
        showDialog('error', result.message);
        return;
    }
    const profile = result.data;
    userId = profile.userId;
    avatarPreview.src = profile.imageUrl
    avatarId = profile.imageId;
    usernameInput.value = profile.username;
    fullNameInput.value = profile.fullName;
    birthdayInput.value = profile.birthday;
    genderInput.value = profile.genderName;
    emailInput.value = profile.emails[0].email;
    role.value = profile.roleName;
    createdAt.textContent = convertToVNTime(profile.createdAt);
    updatedAt.textContent = convertToVNTime(profile.updatedAt);
}
await loadProfile();
avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file){
        avatarPreview.src = URL.createObjectURL(file);
    }
});