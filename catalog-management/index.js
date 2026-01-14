import { callAPI } from "../lib/api.js";
import { showDialog } from "../dialog/index.js";
import { getLoader, loadPage } from "../lib/public.js";

// === 1. CẤU HÌNH TRUNG TÂM ===
let currentType = 'category';
let page = 0;
const size = 10;
let isEditing = false;

const config = {
    category: {
        name: 'Danh mục',
        getList: '/categories',
        crud: '/categories',
        hasDesc: true
    },
    brand: {
        name: 'Thương hiệu',
        getList: '/brands',
        crud: '/brands',
        hasDesc: true
    },
    attribute: {
        name: 'Thuộc tính',
        getList: '/attributes',
        crud: '/attributes',
        hasDesc: false
    }
};

// DOM Elements
const tableBody = document.querySelector("#dataTable tbody");
const pageTitle = document.getElementById("pageTitle");
const descGroup = document.getElementById("descGroup");
const descHeader = document.getElementById("descHeader");
const formTitle = document.getElementById("formTitle");

const idInput = document.getElementById("dataId");
const nameInput = document.getElementById("dataName");
const descInput = document.getElementById("dataDesc");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const loadMoreBtn = document.getElementById("loadMore");

// === 2. HÀM TẠO HTML CHO 1 DÒNG ===
function createRowHTML(item) {
    // Kiểm tra an toàn: Nếu item null thì trả về dòng rỗng để không lỗi
    if (!item) return document.createElement("tr");

    const conf = config[currentType];
    const id = item[`${currentType}Id`] || "";
    const name = item[`${currentType}Name`] || "Không tên";
    const desc = item.description || "";

    const tr = document.createElement("tr");
    tr.dataset.id = id;

    let html = `<td style="font-weight:500;">${name}</td>`;

    if (conf.hasDesc) {
        html += `<td>${desc}</td>`;
    } else {
        html += `<td style="display:none"></td>`;
    }

    html += `
        <td style="text-align: center;">
            <button class="action-btn edit-btn" style="margin-right:5px;"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete-btn"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    tr.innerHTML = html;

    tr.querySelector(".edit-btn").onclick = () => fillForm(item);
    tr.querySelector(".delete-btn").onclick = () => deleteItem(id, name);

    return tr;
}

// === 3. XỬ LÝ CHUYỂN TAB ===
const tabs = document.querySelectorAll(".tab-btn");
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        currentType = tab.dataset.type;

        resetForm();
        updateUI();
        loadData();
    });
});

function updateUI() {
    const conf = config[currentType];
    pageTitle.textContent = `Quản lý ${conf.name}`;

    if (conf.hasDesc) {
        descGroup.style.display = "grid";
        descHeader.style.display = "";
    } else {
        descGroup.style.display = "none";
        descHeader.style.display = "none";
    }
}

// === 4. HÀM TẢI DỮ LIỆU ===
async function loadData(isLoadMore = false) {
    if (!isLoadMore) {
        page = 0;
        tableBody.innerHTML = "";
    }

    const conf = config[currentType];
    const result = await callAPI(`${conf.getList}?page=${page}&size=${size}`, "GET");

    if (!result.success) {
        // Không hiện dialog lỗi khi mới vào trang (đỡ phiền), chỉ log ra console
        console.error("Lỗi tải dữ liệu:", result.message);
        return;
    }

    const { hasMore, listData } = result.data || { hasMore: false, listData: [] };

    if (Array.isArray(listData)) {
        listData.forEach(item => {
            const tr = createRowHTML(item);
            tableBody.appendChild(tr);
        });
    }

    loadMoreBtn.style.display = hasMore ? "block" : "none";
    if (hasMore) page++;
}

// === 5. HÀM LƯU DỮ LIỆU (Đã sửa để dùng loadData) ===
saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    const conf = config[currentType];

    if (!name) {
        await showDialog("error", "Vui lòng nhập tên hiển thị!");
        return;
    }

    const payload = {};
    payload[`${currentType}Name`] = name;
    if (conf.hasDesc) payload.description = desc;

    let method = "POST";
    if (isEditing) {
        payload[`${currentType}Id`] = idInput.value;
        method = "PUT";
    }

    await getLoader("saveBtn", async () => {
        const result = await callAPI(conf.crud, method, payload);
        await showDialog(result.success ? "success" : "error", result.message);
        if (result.success) {
            resetForm();
            await loadData();
        }
    });
});

// === 6. CÁC HÀM KHÁC ===
function fillForm(item) {
    isEditing = true;
    const conf = config[currentType];

    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Cập nhật ${conf.name}`;
    saveBtn.textContent = "Cập nhật";
    cancelBtn.style.display = "inline-block";

    idInput.value = item[`${currentType}Id`];
    nameInput.value = item[`${currentType}Name`];
    if (conf.hasDesc) {
        descInput.value = item.description;
    }
    nameInput.focus();
}

async function deleteItem(id, name) {
    const conf = config[currentType];
    await showDialog("question", `Bạn chắc chắn muốn xóa ${conf.name} "${name}"?`, async () => {
        const result = await callAPI(`${conf.crud}/${id}`, "DELETE");
        await showDialog(result.success ? "success" : "error", result.message);
        if (result.success) {
            await loadData(); // Tải lại bảng sau khi xóa
        }
    });
}

function resetForm() {
    isEditing = false;
    formTitle.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Thêm mới`;
    saveBtn.textContent = "Lưu dữ liệu";
    cancelBtn.style.display = "none";

    idInput.value = "";
    nameInput.value = "";
    descInput.value = "";
}

cancelBtn.addEventListener("click", resetForm);

loadMoreBtn.addEventListener("click", () => {
    getLoader("loadMore", async () => {
        await loadData(true);
    });
});

// Khởi tạo
await loadPage(async () => {
    updateUI();
    await loadData();
});
