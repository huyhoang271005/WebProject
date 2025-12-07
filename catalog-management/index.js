import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { getLoader, loadPage } from "../public/public.js";

// === CẤU HÌNH ===
// Biến này xác định ta đang làm việc với bảng nào
let currentType = 'category'; // Mặc định là category

// Config API cho từng loại (Số ít để Thêm/Sửa/Xóa, Số nhiều để Lấy danh sách)
const config = {
    category: { 
        name: 'Danh mục', 
        getList: '/auth/categories', 
        crud: '/auth/category',
        hasDesc: true 
    },
    brand: { 
        name: 'Thương hiệu', 
        getList: '/auth/brands', 
        crud: '/auth/brand',
        hasDesc: true 
    },
    attribute: { 
        name: 'Thuộc tính', 
        getList: '/auth/attributes', 
        crud: '/auth/attribute',
        hasDesc: false // Attribute không có mô tả
    }
};

// DOM Elements
const tableBody = document.querySelector("#dataTable tbody");
const pageTitle = document.getElementById("pageTitle");
const descGroup = document.getElementById("descGroup");
const descHeader = document.getElementById("descHeader");
const formTitle = document.getElementById("formTitle");

// Form Inputs
const idInput = document.getElementById("dataId");
const nameInput = document.getElementById("dataName");
const descInput = document.getElementById("dataDesc");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const loadMoreBtn = document.getElementById("loadMore");

let page = 0;
const size = 10;
let isEditing = false;

// === 1. XỬ LÝ CHUYỂN TAB ===
const tabs = document.querySelectorAll(".tab-btn");
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        // 1. Đổi giao diện nút tab active
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // 2. Cập nhật loại dữ liệu hiện tại
        currentType = tab.dataset.type;
        
        // 3. Reset form và tải lại dữ liệu mới
        resetForm();
        updateUI();
        loadData();
    });
});

// Hàm cập nhật giao diện theo loại (Ẩn/Hiện cột mô tả)
function updateUI() {
    const conf = config[currentType];
    pageTitle.textContent = `Quản lý ${conf.name}`;
    
    if (conf.hasDesc) {
        descGroup.style.display = "grid"; // Hiện ô nhập
        descHeader.style.display = "";    // Hiện cột bảng
    } else {
        descGroup.style.display = "none"; // Ẩn ô nhập (Attribute)
        descHeader.style.display = "none"; // Ẩn cột bảng
    }
}

// === 2. HÀM TẢI DỮ LIỆU TỪ SERVER ===
async function loadData(isLoadMore = false) {
    if (!isLoadMore) {
        page = 0;
        tableBody.innerHTML = "";
    }

    const conf = config[currentType];
    // Gọi API lấy danh sách (Số nhiều: categories, brands...)
    const result = await callAPI(`${conf.getList}?page=${page}&size=${size}`);

    if (!result.success) {
        await showDialog("error", result.message);
        return;
    }

    const { hasMore, listData } = result.data;

    // Render dữ liệu ra bảng
    listData.forEach(item => {
        // Lấy đúng tên trường dữ liệu động
        const id = item[`${currentType}Id`];     // categoryId, brandId...
        const name = item[`${currentType}Name`]; // categoryName...
        const desc = item.description || "";

        const tr = document.createElement("tr");
        
        // Xây dựng HTML cho dòng (Ẩn cột mô tả nếu là Attribute)
        let html = `
            <td>#${id}</td>
            <td style="font-weight:500; color:#F36F21">${name}</td>
        `;
        
        if (conf.hasDesc) {
            html += `<td>${desc}</td>`;
        } else {
            html += `<td style="display:none"></td>`; // Placeholder ẩn
        }

        html += `
            <td>
                <button class="action-btn edit-btn"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete-btn"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tr.innerHTML = html;

        // Bắt sự kiện Sửa
        tr.querySelector(".edit-btn").onclick = () => fillForm(item);
        
        // Bắt sự kiện Xóa
        tr.querySelector(".delete-btn").onclick = () => deleteItem(id, name);

        tableBody.appendChild(tr);
    });

    loadMoreBtn.style.display = hasMore ? "block" : "none";
    if (hasMore) page++;
}

// === 3. HÀM LƯU DỮ LIỆU (THÊM / SỬA) ===
saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    const conf = config[currentType];

    if (!name) {
        await showDialog("error", "Vui lòng nhập tên!");
        return;
    }

    // Tạo object gửi lên server
    // Ví dụ: { categoryName: "...", description: "..." }
    const payload = {};
    payload[`${currentType}Name`] = name; 
    
    if (conf.hasDesc) {
        payload.description = desc;
    }

    let method = "POST";
    // Nếu đang sửa thì thêm ID và đổi method
    if (isEditing) {
        payload[`${currentType}Id`] = idInput.value;
        method = "PUT";
    }

    // Gọi API (Dùng chung 1 hàm crud: category, brand...)
    await getLoader("saveBtn", async () => {
        const result = await callAPI(conf.crud, method, payload);
        
        await showDialog(result.success ? "success" : "error", result.message);
        if (result.success) {
            resetForm();
            loadData();
        }
    });
});

// === 4. CÁC HÀM PHỤ TRỢ ===
function fillForm(item) {
    isEditing = true;
    const conf = config[currentType];
    
    formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Cập nhật ${conf.name}`;
    saveBtn.textContent = "Cập nhật";
    cancelBtn.style.display = "inline-block";

    // Điền dữ liệu vào form
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
        // API xóa: /auth/category/{id}
        const result = await callAPI(`${conf.crud}/${id}`, "DELETE");
        
        await showDialog(result.success ? "success" : "error", result.message);
        if (result.success) {
            loadData();
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

// Chạy lần đầu
await loadPage(async () => {
    updateUI(); // Cập nhật giao diện theo tab mặc định
    await loadData();
});