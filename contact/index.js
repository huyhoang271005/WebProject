// index.js (Phiên bản chỉ dùng api.js)

import { callAPI } from "../public/api.js";

// --- Khai báo các phần tử DOM ---
const addressForm = document.getElementById('addressForm');
const addressListEl = document.getElementById('addressList');
const saveBtn = document.getElementById('saveAddressBtn');
const cancelBtn = document.getElementById('cancelEditBtn');
const contactIdInput = document.getElementById('contactId');

// Lưu trữ danh sách địa chỉ đã tải để dễ dàng tìm kiếm khi sửa
let currentAddresses = [];

// --- Khởi tạo và Thiết lập ---

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Ẩn loader (thủ công)
    const loadPageEl = document.getElementById('loadPage');
    if (loadPageEl) loadPageEl.style.display = 'none';

    // 2. Hiện nội dung chính (thủ công)
    const infoEl = document.getElementById('info');
    if (infoEl) infoEl.style.display = 'block';

    console.log("Trang Quản lý Địa chỉ đã sẵn sàng.");

    await loadAddresses();
    attachFormSubmitHandler();
    attachCancelHandler();
});

// --- LOGIC TẢI VÀ HIỂN THỊ ĐỊA CHỈ ---

async function loadAddresses() {
    if (!addressListEl) return;

    addressListEl.innerHTML = '<p class="loading-message"><i class="fa fa-spinner fa-spin"></i> Đang tải danh sách địa chỉ...</p>';

    // Sử dụng endpoint GET /contacts
    const result = await callAPI("/contacts", "GET");

    addressListEl.innerHTML = '';
    currentAddresses = []; // Reset danh sách

    if (result.success && result.data && result.data.length > 0) {
        currentAddresses = result.data; // Lưu trữ dữ liệu
        result.data.forEach(address => {
            const addressItem = createAddressItem(address);
            addressListEl.appendChild(addressItem);
        });
    } else {
        const message = result.success ?
            'Bạn chưa có địa chỉ nào được lưu.' :
            `Lỗi khi tải địa chỉ: ${result.message}`;

        addressListEl.innerHTML = `<p class="no-address-message">${message}</p>`;
    }
}

function createAddressItem(address) {
    const item = document.createElement('div');
    // DB không có isDefault, nên ta bỏ class 'default'
    item.className = 'address-item';
    item.setAttribute('data-id', address.contact_id);

    // Hiển thị dữ liệu theo cấu trúc DB
    item.innerHTML = `
        <h4>${address.contact_name} - ${address.phone}</h4>
        <p>${address.address}</p>
        <div class="address-actions">
            <button class="edit-btn">Sửa</button> | 
            <button class="delete-btn">Xóa</button>
        </div>
    `;

    // Gắn sự kiện cho các nút hành động
    item.querySelector('.edit-btn').addEventListener('click', () => editAddress(address.contact_id));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(address.contact_id));

    return item;
}

// --- LOGIC FORM VÀ HÀNH ĐỘNG ---

function attachFormSubmitHandler() {
    addressForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const data = {
            contact_name: document.getElementById('contact_name').value, // contact_name
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value
        };

        const contactId = contactIdInput.value;

        if (contactId) {
            // Trường hợp sửa
            updateAddress(contactId, data);
        } else {
            // Trường hợp thêm mới
            addNewAddress(data);
        }
    });
}

function attachCancelHandler() {
    cancelBtn.addEventListener('click', resetForm);
}

// Hàm quản lý Loader thủ công (thay thế cho getLoader)
function startLoading(btn, text) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${text}...`;
}

function stopLoading(btn, originalText = 'Lưu Địa Chỉ') {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = originalText;
}

function resetForm() {
    addressForm.reset();
    contactIdInput.value = '';
    saveBtn.innerHTML = 'Lưu Địa Chỉ';
    cancelBtn.style.display = 'none';
}

async function addNewAddress(data) {
    startLoading(saveBtn, 'Đang thêm');

    // Sử dụng endpoint POST /contact
    const result = await callAPI("/contacts", "POST", data);

    if (result.success) {
        alert("Thêm địa chỉ mới thành công!");
        resetForm();
        await loadAddresses(); // Tải lại danh sách
    } else {
        alert(`Lỗi khi thêm: ${result.message || 'Không rõ'}`);
    }

    stopLoading(saveBtn);
}

async function updateAddress(id, data) {
    startLoading(saveBtn, 'Đang cập nhật');

    // Gửi cả contactId và các trường dữ liệu. Endpoint PUT /contact
    const updateData = { contact_id: id, ...data };
    const result = await callAPI("/contacts", "PUT", updateData);

    if (result.success) {
        alert("Cập nhật địa chỉ thành công!");
        resetForm();
        await loadAddresses(); // Tải lại danh sách
    } else {
        alert(`Lỗi khi cập nhật: ${result.message || 'Không rõ'}`);
    }

    stopLoading(saveBtn, 'Lưu Địa Chỉ');
}

async function deleteAddress(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;

    // Sử dụng endpoint DELETE /contact/{contactId}
    const result = await callAPI(`/contacts/${id}`, "DELETE");

    if (result.success) {
        alert("Xóa địa chỉ thành công!");
        await loadAddresses();
    } else {
        alert(`Lỗi xóa: ${result.message || 'Không rõ'}`);
    }
}

function editAddress(id) {
    const addressToEdit = currentAddresses.find(addr => addr.contact_id === id);
    if (!addressToEdit) {
        alert("Không tìm thấy địa chỉ để sửa.");
        return;
    }

    // Load dữ liệu lên form
    contactIdInput.value = addressToEdit.contact_id;
    document.getElementById('contact_name').value = addressToEdit.contact_name;
    document.getElementById('phone').value = addressToEdit.phone;
    document.getElementById('address').value = addressToEdit.address;

    // Thay đổi trạng thái nút
    saveBtn.innerHTML = 'Cập Nhật Địa Chỉ';
    cancelBtn.style.display = 'block';
}