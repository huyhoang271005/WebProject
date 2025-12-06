// Import các hàm tiện ích có sẵn của nhóm
import { callAPI } from "../../public/api.js";
import { showDialog } from "../../dialog/index.js";
import { getLoader, loadPage } from "../../public/public.js";

// Khai báo biến
const tableBody = document.querySelector("#categoryTable tbody");
const loadMoreBtn = document.getElementById("loadMore");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");

// Input fields
const idInput = document.getElementById("categoryId");
const nameInput = document.getElementById("categoryName");
const descInput = document.getElementById("description");

let page = 0;
const size = 10; // Số lượng load mỗi lần
let isEditing = false; // Trạng thái đang sửa hay đang thêm

// 1. Hàm load dữ liệu từ API
async function loadCategories(isLoadMore = false) {
    if (!isLoadMore) {
        page = 0;
        tableBody.innerHTML = ""; // Xóa cũ nếu load mới
    }

    // Gọi API (Giả định endpoint là /category theo chuẩn RESTful)
    // Tìm dòng gọi API trong hàm loadCategories
    const result = await callAPI(`/auth/categories?page=${page}&size=${size}`, "GET");

    if (!result.success) {
        await showDialog("error", result.message);
        return;
    }

    const { hasMore, listData } = result.data; // Cấu trúc JSON Huy Hoàng yêu cầu trả về

    // Render dữ liệu ra bảng
    listData.forEach(cat => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${cat.categoryId}</td>
            <td>${cat.categoryName}</td>
            <td>${cat.description || ""}</td>
            <td>
                <button class="action-btn edit-btn" style="background: #F59E0B;">Sửa</button>
                <button class="action-btn delete-btn" style="background: #EF4444;">Xóa</button>
            </td>
        `;

        // Bắt sự kiện nút Sửa
        tr.querySelector(".edit-btn").onclick = () => {
            fillFormToEdit(cat);
        };

        // Bắt sự kiện nút Xóa
        tr.querySelector(".delete-btn").onclick = () => {
            deleteCategory(cat.categoryId, cat.categoryName);
        };

        tableBody.appendChild(tr);
    });

    // Xử lý nút Load More
    if (hasMore) {
        loadMoreBtn.style.display = "block";
        page++;
    } else {
        loadMoreBtn.style.display = "none";
    }
}

// 2. Xử lý Thêm mới hoặc Cập nhật
saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();

    if (!name) {
        await showDialog("error", "Vui lòng nhập tên danh mục!");
        return;
    }

    // Chuẩn bị dữ liệu gửi đi (theo đúng ảnh tin nhắn Huy Hoàng)
    const payload = {
        categoryName: name,
        description: desc
    };

    let apiPath = "/auth/category";
    let method = "POST";

    if (isEditing) {
        // Nếu đang sửa thì thêm ID và đổi method thành PUT
        payload.categoryId = idInput.value;
        method = "PUT";
    }

    // Gọi API với hiệu ứng loading
    await getLoader("saveBtn", async () => {
        const result = await callAPI(apiPath, method, payload);

        // Hiện thông báo kết quả
        await showDialog(result.success ? "success" : "error", result.message);

        if (result.success) {
            resetForm();
            loadCategories(); // Load lại bảng
        }
    });
});

// 3. Hàm điền dữ liệu vào form để sửa
function fillFormToEdit(category) {
    isEditing = true;
    formTitle.textContent = `Chỉnh sửa: ${category.categoryName}`;
    saveBtn.textContent = "Cập nhật";
    cancelBtn.style.display = "inline-block";

    idInput.value = category.categoryId;
    nameInput.value = category.categoryName;
    descInput.value = category.description;

    // Cuộn xuống form
    nameInput.focus();
}

// 4. Hàm xóa category
async function deleteCategory(id, name) {
    await showDialog("question", `Bạn có chắc chắn muốn xóa danh mục "${name}" không?`, async () => {
        const result = await callAPI(`/auth/category/${id}`, "DELETE"); // Giả định endpoint xóa có dạng /category/{id}
        /* LƯU Ý: Nếu Huy Hoàng dùng Query Param để xóa (vd: /category?id=1) 
           thì bạn sửa dòng trên thành: callAPI(`/category?id=${id}`, "DELETE");
        */

        await showDialog(result.success ? "success" : "error", result.message);
        if (result.success) {
            loadCategories();
        }
    });
}

// 5. Reset form về trạng thái thêm mới
function resetForm() {
    isEditing = false;
    formTitle.textContent = "Thêm mới danh mục";
    saveBtn.textContent = "Lưu lại";
    cancelBtn.style.display = "none";

    idInput.value = "";
    nameInput.value = "";
    descInput.value = "";
}

cancelBtn.addEventListener("click", resetForm);

loadMoreBtn.addEventListener("click", () => {
    getLoader("loadMore", async () => {
        await loadCategories(true);
    });
});

// Chạy lần đầu khi vào trang
await loadPage(async () => {
    await loadCategories();
});