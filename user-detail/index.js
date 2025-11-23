import { loadPage, convertToVNTime } from "../public/public.js";
import { showDialog } from "../dialog/index.js";
import { callAPI } from "../public/api.js";
import { initEmailList } from "./email-list.js";

await loadPage(async()=>{
    const param = new URLSearchParams(window.location.search);
    const uid = param.get('uid');
    const roles = await callAPI('/roles');
    const status = await callAPI('/user-status');
    const user = await callAPI(`/user/${uid}`);
    if(!roles.success || !status.success || !user.success){
        await showDialog('error', "Lỗi khi tải dữ liệu vui lòng tải lại trang");
        return;
    }
    await render(user.data, roles.data, status.data);
});

async function render(user, roles, status) {
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
        const emailsSection = document.getElementById("emailsSection");
        const btnUpdate = document.getElementById('btnUpdate');
        const html = await fetch("./email-list.html");
        const text = await html.text();
        emailsSection.insertAdjacentHTML('beforeend', text);
        initEmailList(user.userId, user.extendUserResponse.emails);
        roles.forEach((role) => {
            const html = `<option value="${role.roleId}">${role.roleName}</option>`;
            rolesSelect.insertAdjacentHTML('beforeend', html);
        });
        rolesSelect.value = user.extendUserResponse.roleId;

        status.forEach((st)=>{
            const html = `<option value="${st}">${st}</option>`;
            statusSelect.insertAdjacentHTML('beforeend', html);
        });
        statusSelect.value = user.extendUserResponse.userStatus;

        // Thay đổi role/status
        document.getElementById("roleSelect").onchange = (e)=>{
            user.role = e.target.value;
        };
        document.getElementById("statusSelect").onchange = (e)=>{
            user.status = e.target.value;
        };
        btnUpdate.addEventListener('click', async()=>{
            const data = {
                userId: user.userId,
                userStatus: statusSelect.value,
                roleId: rolesSelect.value
            }
            const result = await callAPI('/user', 'POST', data);
            await showDialog(result.success ? 'success' : 'error', result.message);
        });

    } else {
        document.getElementById("adminFields").style.display = "none";
    }
}