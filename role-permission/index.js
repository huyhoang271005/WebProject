import { callAPI } from "../lib/api.js";
import { showDialog } from "../dialog/index.js";
import { getLoader, loadPage } from "../lib/public.js";
import { loadNavbar } from "../navbar/navbar.js";
let ROLE_PERMISSIONS = [];
let ALL_PERMISSIONS = [];
await loadPage(async() => {
    await loadNavbar();
    const resultRolePermission = await callAPI('/role-permission');
    const resultPermission = await callAPI('/permissions');

    if(!resultRolePermission.success){
        await showDialog('error', resultRolePermission.message);
        return;
    }
    if(!resultPermission.success){
        await showDialog('error', resultPermission.message);
        return;
    }

    ROLE_PERMISSIONS = resultRolePermission.data;
    ALL_PERMISSIONS = resultPermission.data;

    await render();
});

const roleList = document.getElementById("roleList");
const addRoleBtn = document.getElementById("addRoleBtn");
const newRoleName = document.getElementById("newRoleName");
async function render() {
    roleList.innerHTML = "";

    ROLE_PERMISSIONS.forEach((rolePermission, roleIndex) => {

        // lấy danh sách permissionName đã có
        const existingPermissions = rolePermission.permissions.map(p => p.permissionName);

        const roleHTML = `
            <div class="role">
                <div class="role-header">
                    <strong>${rolePermission.roleName}</strong>
                    <button class="delete delete-role-btn" data-index="${roleIndex}">Xóa chức vụ</button>
                </div>

                <div class="permission-list" id="perm-${roleIndex}">
                    ${rolePermission.permissions.map((p, permIndex) => `
                        <div class="permission-row">
                            <input value="${p.permissionName}" data-role="${roleIndex}" data-perm="${permIndex}" readonly>
                            <button class="delete remove-perm-btn" 
                                data-role="${roleIndex}" data-perm="${permIndex}">
                                X
                            </button>
                        </div>
                    `).join("")}
                </div>

                <div style="margin-top:10px;">
                    <select class="perm-select" data-role="${roleIndex}">
                        <option value="">-- Chọn quyền --</option>
                        ${ALL_PERMISSIONS
                            .filter(p => !existingPermissions.includes(p.permissionName))
                            .map(p => `<option value="${p.permissionName}">${p.permissionName}</option>`)
                            .join("")}
                    </select>
                    <button class="add-perm-btn" data-role="${roleIndex}">Thêm</button>
                </div>
            </div>
        `;

        roleList.insertAdjacentHTML("beforeend", roleHTML);
    });

    await initEvents();
}

async function initEvents() {

    // Xoá role
    document.querySelectorAll(".delete-role-btn").forEach(btn => {
        btn.onclick = async() => {
            const idx = btn.dataset.index;
            await showDialog('question', `Bạn có muốn xoá chức vụ ${ROLE_PERMISSIONS[idx].roleName} không?`,
                async() => {
                    const result = await callAPI(`/roles/${ROLE_PERMISSIONS[idx].roleId}`, 'DELETE');
                    if(result.success){
                        ROLE_PERMISSIONS.splice(idx, 1);
                        await render();
                    }
                    await showDialog(result.success ? 'success' : 'error', result.message);
                }
            );
        };
    });

    // Xoá role permission
    document.querySelectorAll(".remove-perm-btn").forEach(btn => {
        btn.onclick = async() => {
            const roleIdx = btn.dataset.role;
            const permIdx = btn.dataset.perm;
            const rolePermissionId = ROLE_PERMISSIONS[roleIdx].permissions[permIdx].rolePermissionId;
            await showDialog('question', `Bạn có muốn xoá quyền ${ROLE_PERMISSIONS[roleIdx].permissions[permIdx].permissionName} 
                cho chức vụ ${ROLE_PERMISSIONS[roleIdx].roleName} không?`, 
                async() => {
                    const result = await callAPI(`/role-permission/${rolePermissionId}`, 'DELETE');
                    if(result.success){
                        ROLE_PERMISSIONS[roleIdx].permissions.splice(permIdx, 1);
                        await render();
                    }
                    await showDialog(result.success ? 'success' : 'error', result.message);
                });
        };
    });

    // Cập nhật permission khi sửa text
    document.querySelectorAll(".permission-row input").forEach(input => {
        input.oninput = () => {
            const roleIdx = input.dataset.role;
            const permIdx = input.dataset.perm;

            ROLE_PERMISSIONS[roleIdx].permissions[permIdx].permissionName = input.value;
        };
    });

    // Thêm role permission
    document.querySelectorAll(".add-perm-btn").forEach(btn => {
        btn.onclick = async() => {
            const roleIdx = btn.dataset.role;
            const select = document.querySelector(`.perm-select[data-role="${roleIdx}"]`);
            const value = select.value.trim().toUpperCase();
            if (!value) return;
            const data = {
                roleId: ROLE_PERMISSIONS[roleIdx].roleId,
                permissionId: ALL_PERMISSIONS.filter(p=>p.permissionName === value)[0].permissionId
            }
            const result = await callAPI('/role-permission', 'POST', data);
            if(result.success){
                ROLE_PERMISSIONS[roleIdx].permissions.push({rolePermissionId: result.data.rolePermissionId, permissionName: value});
                await render();
            }
            await showDialog(result.success ? 'success' : 'error', result.message);
        };
    });

}

// Thêm Role
addRoleBtn.onclick = async() => {
    const name = newRoleName.value.trim().toUpperCase();
    if (!name) return;
    const data = {
        roleName: name
    }
    let result = null;
    await getLoader('addRoleBtn', async() => {
        result = await callAPI('/roles', 'POST', data);
    });
    if(result.success){
        ROLE_PERMISSIONS.push({ roleId: result.data.roleId, roleName: name, permissions: []});
        newRoleName.value = "";
        await render();
    }
    await showDialog(result.success ? 'success' : 'error', result.message);
};
