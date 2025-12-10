import { loadPage, convertToVNTime, getLoader, noImage } from "../public/public.js";
import { showDialog } from "../dialog/index.js";
import { callAPI } from "../public/api.js";
import { initEmailList } from "./email-list.js";
import { loadNavbar } from "../navbar/navbar.js";
await loadNavbar({});
await loadPage(async()=>{
    const param = new URLSearchParams(window.location.search);
    const uid = param.get('uid');
    const user = await callAPI(`/user/${uid}`);
    if(!user.success){
        await showDialog('error', user.message);
        return;
    }
    await render(user.data);
});

async function render(user) {
    document.getElementById("avatarPreview").src = user.imageUrl ? user.imageUrl : noImage;
    document.getElementById("username").textContent = user.username;
    document.getElementById("fullName").textContent = user.fullName;
    document.getElementById("birthday").textContent = user.birthday;
    document.getElementById("gender").textContent = user.gender == 'MALE' ? 'Nam': user.gender == 'FEMALE' ? 'Nữ' : 'Khác';
    document.getElementById("createdAt").textContent = convertToVNTime(user.createdAt);
    if(user.extendUserResponse){
        const resultRoles = await callAPI('/roles');
        const resultStatus = await callAPI('/user-status');
        const roles = resultRoles.data;
        const status = resultStatus.data;
        document.getElementById("adminFields").style.display = "block";
        const rolesSelect = document.getElementById("roleSelect");
        const statusSelect = document.getElementById("statusSelect");
        const emailsSection = document.getElementById("emailsSection");
        const btnUpdate = document.getElementById('btnUpdate');
        const btnLogout = document.getElementById('btnLogout');
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
            await getLoader('btnUpdate', async()=>{
                const result = await callAPI('/user', 'POST', data);
                await showDialog(result.success ? 'success' : 'error', result.message);
            });
        });
        btnLogout.addEventListener('click', async()=>{
            await getLoader('btnLogout', async()=>{
                const result = await callAPI(`/logout-all/${user.userId}`);
                await showDialog(result.success ? 'success' : 'error', result.message);
            })
        });

    } else {
        document.getElementById("adminFields").style.display = "none";
    }
}