import { loadPage, convertToVNTime } from "../public/public.js";
import { showDialog } from "../dialog/index.js";
import { callAPI } from "../public/api.js";

await loadPage(async()=>{
    const param = new URLSearchParams(window.location.search);
    const uid = param.get('uid');
    const roles = await callAPI('/roles');
    const status = await callAPI('/user-status');
    const user = await callAPI(`/user/${uid}`);
    render(user.data, roles.data, status.data);
});

function render(user, roles, status) {
    document.getElementById("avatarPreview").src = user.imageUrl;
    document.getElementById("username").textContent = user.username;
    document.getElementById("fullName").textContent = user.fullname;
    document.getElementById("birthday").textContent = user.birthday;
    document.getElementById("gender").textContent = user.gender == 'MALE' ? 'Nam': user.gender == 'FEMALE' ? 'Nữ' : 'Khác';
    document.getElementById("createdAt").textContent = convertToVNTime(user.createdAt);
    if(user.extendUserResponse){
        document.getElementById("adminFields").style.display = "block";
        const rolesSelect = document.getElementById("roleSelect");
        const statusSelect = document.getElementById("statusSelect");
        rolesSelect.value = user.extendUserResponse.roleId;
        statusSelect.value = user.extendUserResponse.userStatus;
        
        roles.forEach((role) => {
            const html = `<option value=${role.roleId}>${role.roleName}</option>`;
            rolesSelect.insertAdjacentHTML('beforeend', html);
        });

        status.forEach((st)=>{
            const html = `<option value=${st}>${st}</option>`;
            statusSelect.insertAdjacentHTML('beforeend', html);
        })

        // Thay đổi role/status
        document.getElementById("roleSelect").onchange = (e)=>{
            user.role = e.target.value;
        };
        document.getElementById("statusSelect").onchange = (e)=>{
            user.status = e.target.value;
        };

    } else {
        document.getElementById("adminFields").style.display = "none";
    }
}