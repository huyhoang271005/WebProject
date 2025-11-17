import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { getLoader, showLoader } from "../public/public";
let roles = [
    { 
        name: "ADMIN",
        permissions: ["VIEW_USER", "EDIT_USER", "DELETE_USER"]
    },
    {
        name: "USER",
        permissions: ["VIEW_PROFILE"]
    }
];

const ALL_PERMISSIONS = [
  "VIEW_USER",
  "EDIT_USER",
  "DELETE_USER",
  "VIEW_PROFILE",
  "EDIT_PROFILE",
  "BAN_USER",
  "EXPORT_DATA"
];


const roleList = document.getElementById("roleList");
const addRoleBtn = document.getElementById("addRoleBtn");
const newRoleName = document.getElementById("newRoleName");

function render() {
    roleList.innerHTML = "";

    roles.forEach((role, roleIndex) => {
        const roleHTML = `
            <div class="role">
                <div class="role-header">
                    <strong>${role.name}</strong>
                    <button class="delete delete-role-btn" data-index="${roleIndex}">Xóa chức vụ</button>
                </div>

                <div class="permission-list" id="perm-${roleIndex}">
                    ${role.permissions.map((p, permIndex) => `
                        <div class="permission-row">
                            <input value="${p}" data-role="${roleIndex}" data-perm="${permIndex}">
                            <button class="delete remove-perm-btn" 
                                data-role="${roleIndex}" data-perm="${permIndex}">
                                X
                            </button>
                        </div>
                    `).join("")}
                </div>

                <div style="margin-top:10px;">
                    <select class="perm-select" data-role="${roleIndex}">
                        <option value="">-- Chọn permission --</option>
                        ${ALL_PERMISSIONS
                            .filter(p => !role.permissions.includes(p))
                            .map(p => `<option value="${p}">${p}</option>`)
                            .join("")}
                        </select>
                        <button class="add-perm-btn" data-role="${roleIndex}">Thêm</button>
                </div>
            </div>
        `;

        roleList.insertAdjacentHTML("beforeend", roleHTML);
    });

    initEvents();
}

function initEvents() {

    // Xoá role
    document.querySelectorAll(".delete-role-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = btn.dataset.index;
            roles.splice(idx, 1);
            render();
        };
    });

    // Xoá permission
    document.querySelectorAll(".remove-perm-btn").forEach(btn => {
        btn.onclick = () => {
            const roleIdx = btn.dataset.role;
            const permIdx = btn.dataset.perm;

            roles[roleIdx].permissions.splice(permIdx, 1);
            render();
        };
    });

    // Cập nhật permission khi sửa text
    document.querySelectorAll(".permission-row input").forEach(input => {
        input.oninput = () => {
            const roleIdx = input.dataset.role;
            const permIdx = input.dataset.perm;

            roles[roleIdx].permissions[permIdx] = input.value;
        };
    });

    // Thêm permission
    document.querySelectorAll(".add-perm-btn").forEach(btn => {
        btn.onclick = () => {
            const roleIdx = btn.dataset.role;
            const select = document.querySelector(`.perm-select[data-role="${roleIdx}"]`);
            const value = select.value;
            if (!value) return;

            roles[roleIdx].permissions.push(value);
            render(); // render lại danh sách role + permission
        };
    });

}

// Thêm Role
addRoleBtn.onclick = () => {
    const name = newRoleName.value.trim().toUpperCase();
    if (!name) return;

    roles.push({ name, permissions: [] });
    newRoleName.value = "";
    render();
};

// Khởi động
render();
