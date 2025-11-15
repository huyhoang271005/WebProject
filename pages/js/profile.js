import { callAPI } from "../../public/api.js";
import { showDialog } from "../../dialog/dialog.js";
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
    usernameInput.textContent = profile.username;
    fullNameInput.textContent = profile.fullName;
    birthdayInput.textContent = profile.birthday;
    genderInput.textContent = profile.gender;
    emailInput.textContent = profile.emails[0].email;
    role.textContent = profile.role;
    createdAt = profile.createdAt;
    updatedAt = profile.updatedAt;
}
await loadProfile();
avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file){
        avatarPreview.src = URL.createObjectURL(file);
    }
});