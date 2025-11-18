import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { getLoader, showLoader } from "../public/public.js";
let ROLE_PERMISSIONS = [];
let ALL_PERMISSIONS = [];
const resultRolePermission = await callAPI('/auth/role-permission');
const resultPermission = await callAPI('/auth/permission');
async function loadRolePermission() {
    if(!resultRolePermission.success){
        await showDialog('error', resultRolePermission.message);
        return;
    }
    ROLE_PERMISSIONS = resultRolePermission.data;
}
async function loadPermission() {
    if(!resultPermission.success){
        await showDialog('error', resultPermission.message);
        return;
    }
    ALL_PERMISSIONS = resultPermission.data;
}
await loadRolePermission();
await loadPermission();
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
            const result = await callAPI(`/auth/role?roleId=${ROLE_PERMISSIONS[idx].roleId}`, 'DELETE');
            if(result.success){
                ROLE_PERMISSIONS.splice(idx, 1);
                await render();
            }
            else {
                await showDialog('error', result.message);
            }
        };
    });

    // Xoá permission
    document.querySelectorAll(".remove-perm-btn").forEach(btn => {
        btn.onclick = async() => {
            const roleIdx = btn.dataset.role;
            const permIdx = btn.dataset.perm;

            ROLE_PERMISSIONS[roleIdx].permissions.splice(permIdx, 1);
            await render();
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

    // Thêm permission
    document.querySelectorAll(".add-perm-btn").forEach(btn => {
        btn.onclick = async() => {
            const roleIdx = btn.dataset.role;
            const select = document.querySelector(`.perm-select[data-role="${roleIdx}"]`);
            const value = select.value;
            if (!value) return;

            ROLE_PERMISSIONS[roleIdx].permissions.push({permissionName: value, permissions: []});
            await render(); // render lại danh sách role + permission
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
    const result = await callAPI('/auth/role', 'POST', data);
    if(result.success){
        ROLE_PERMISSIONS.push({ RoleName: name});
        newRoleName.value = "";
        await render();
    }
    else {
        await showDialog('error', result.message);
    }
};

// Khởi động
await render();
