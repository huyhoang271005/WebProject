import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime, getLoader, noImage } from "../public/public.js";
import { loadNavbar } from "../navbar/navbar.js";
const loadMore = document.getElementById('loadMore');
let page = 0;
let size = 5;
async function loadUsers() {
    const result = await callAPI(`/users?page=${page}&&size=${size}`);
    if(!result.success){
        await showDialog('error', result.message);
        return;
    }
    else {
        page+=1;
        loadMore.style.display = result.data.hasMore ? 'block' : 'none';
        return result.data.listData;
    }
}
await loadPage(async()=>{
    await loadNavbar();
    let data = await loadUsers();
    renderUsers(data)
    loadMore.addEventListener('click', async()=>{
        await getLoader('loadMore', async()=>{
            data = [...data, ...await loadUsers()];
            renderUsers(data);
        })
    })
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
                    <img src="${user.imageUrl ? user.imageUrl : noImage}" class="avatar" />
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