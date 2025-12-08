import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { getLoader, loadPage } from "../public/public.js";

// === 1. CẤU HÌNH TRUNG TÂM ===
let currentType = 'category'; // Mặc định
let page = 0;
const size = 10;
let isEditing = false;

// Config cho 3 loại bảng (Đường dẫn API đã thêm /auth/ để test)
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
        hasDesc: false 
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

// === 2. HÀM TẠO HTML CHO 1 DÒNG (Quan trọng: Dùng để Render và Update nóng) ===
function createRowHTML(item) {
    if (!item) {
        console.warn("Server trả về dữ liệu null, bỏ qua dòng này.");
        return document.createElement("tr"); 
    }
    const conf = config[currentType];
    
    // Lấy dữ liệu động dựa trên loại hiện tại
    const id = item[`${currentType}Id`];     
    const name = item[`${currentType}Name`]; 
    const desc = item.description || "";

    const tr = document.createElement("tr");
    tr.dataset.id = id; // Lưu ID ẩn vào attribute của thẻ tr

    // Cột Tên (Không hiện cột ID nữa theo yêu cầu trưởng nhóm)
    let html = `<td style="font-weight:500;">${name}</td>`;
    
    // Cột Mô tả (Ẩn/Hiện tùy config)
    if (conf.hasDesc) {
        html += `<td>${desc}</td>`;
    } else {
        html += `<td style="display:none"></td>`;
    }

    // Cột Thao tác
    html += `
        <td style="text-align: center;">
            <button class="action-btn edit-btn" style="margin-right:5px;"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete-btn"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    tr.innerHTML = html;

    // Bắt sự kiện trực tiếp cho nút Sửa/Xóa của dòng này
    tr.querySelector(".edit-btn").onclick = () => fillForm(item);
    tr.querySelector(".delete-btn").onclick = () => deleteItem(id, name, tr); // Truyền tr để xóa DOM

    return tr;
}

// === 3. XỬ LÝ CHUYỂN TAB (Category -> Brand -> Attribute) ===
const tabs = document.querySelectorAll(".tab-btn");
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        // Active lại tab giao diện
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        // Cập nhật loại dữ liệu
        currentType = tab.dataset.type;
        
        // Reset form và tải lại dữ liệu mới
        resetForm();
        updateUI();
        loadData();
    });
});

function updateUI() {
    const conf = config[currentType];
    pageTitle.textContent = `Quản lý ${conf.name}`;
    
    // Ẩn/Hiện ô nhập mô tả và cột mô tả
    if (conf.hasDesc) {
        descGroup.style.display = "grid";
        descHeader.style.display = "";
    } else {
        descGroup.style.display = "none";
        descHeader.style.display = "none";
    }
}

// === 4. HÀM TẢI DỮ LIỆU TỪ SERVER ===
async function loadData(isLoadMore = false) {
    if (!isLoadMore) {
        page = 0;
        tableBody.innerHTML = "";
    }

    const conf = config[currentType];
    const result = await callAPI(`${conf.getList}?page=${page}&size=${size}`, "GET");

    if (!result.success) {
        await showDialog("error", result.message);
        return;
    }

    const { hasMore, listData } = result.data;

    // Render từng dòng ra bảng
    listData.forEach(item => {
        const tr = createRowHTML(item);
        tableBody.appendChild(tr);
    });

    loadMoreBtn.style.display = hasMore ? "block" : "none";
    if (hasMore) page++;
}

// === 5. HÀM LƯU DỮ LIỆU (THÊM / SỬA - KHÔNG LOAD LẠI TRANG) ===
saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    const conf = config[currentType];

    if (!name) {
        await showDialog("error", "Vui lòng nhập tên hiển thị!");
        return;
    }

    // Chuẩn bị dữ liệu gửi đi
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
            // Lấy dữ liệu mới tinh từ Server trả về (Trưởng nhóm đã hứa trả về cục này)
            const newItem = result.data;

            if (isEditing) {
                // UPDATE: Tìm dòng cũ -> Thay thế bằng dòng mới
                // Tìm tr có data-id tương ứng
                const oldTr = tableBody.querySelector(`tr[data-id="${payload[`${currentType}Id`]}"]`);
                if (oldTr) {
                    const newTr = createRowHTML(newItem);
                    tableBody.replaceChild(newTr, oldTr);
                }
            } else {
                // CREATE: Tạo dòng mới -> Chèn lên đầu bảng
                const newTr = createRowHTML(newItem);
                if (tableBody.firstChild) {
                    tableBody.insertBefore(newTr, tableBody.firstChild);
                } else {
                    tableBody.appendChild(newTr);
                }
            }
            
            resetForm(); // Xóa trắng form để nhập tiếp
        }
    });
});

// === 6. HÀM ĐIỀN FORM ĐỂ SỬA ===
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

// === 7. HÀM XÓA (XÓA DOM NGAY LẬP TỨC) ===
async function deleteItem(id, name, trElement) {
    const conf = config[currentType];
    
    await showDialog("question", `Bạn chắc chắn muốn xóa ${conf.name} "${name}"?`, async () => {
        const result = await callAPI(`${conf.crud}/${id}`, "DELETE");
        
        await showDialog(result.success ? "success" : "error", result.message);
        
        if (result.success) {
            // Xóa dòng khỏi giao diện ngay lập tức
            trElement.remove();
        }
    });
}

// === 8. RESET FORM ===
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

// === KHỞI TẠO ===
await loadPage(async () => {
    updateUI();
    await loadData();
});