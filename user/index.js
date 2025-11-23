import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";
await loadPage(async()=>{
    const result = await callAPI('/auth/users');
    if(!result.success){
        await showDialog('error', result.message);
    }
    else {
        renderUsers(result.data);
    }
});

function renderUsers(users) {
    const tbody = document.querySelector("#info tbody");
    tbody.innerHTML = "";

    users.forEach(user => {
        const name = user.fullName || user.username;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Người dùng">
                <div class="user-info">
                    <img src="${user.imageUrl}" class="avatar" />
                    ${name}
                </div>
            </td>
            <td data-label="Ngày tham gia">${convertToVNTime(user.createdAt).split(' ')[1]}</td>
        `;

        // Click chuyển sang trang detail
        tr.onclick = () => {
            window.location.href = `../user-detail?uid=${user.userId}`;
        };

        tbody.appendChild(tr);
    });
}