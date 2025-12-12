import { callAPI } from "../public/api.js";


// DOM Elements
const addressForm = document.getElementById('addressForm');
const addressListEl = document.getElementById('addressList');
const saveBtn = document.getElementById('saveAddressBtn');
const saveBtnText = document.getElementById('saveBtnText');
const cancelBtn = document.getElementById('cancelEditBtn');
const contactIdInput = document.getElementById('contactId');
const formTitle = document.getElementById('formTitle');
const addressCount = document.getElementById('addressCount');

// State
let currentAddresses = [];
let isEditMode = false;

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    const loadPageEl = document.getElementById('loadPage');
    const infoEl = document.getElementById('info');

    console.log("Trang Quản lý Địa chỉ đã sẵn sàng.");

    await loadAddresses();
    attachEventHandlers();

    if (loadPageEl) loadPageEl.style.display = 'none';
    if (infoEl) infoEl.style.display = 'block';
});

// Event Handlers
function attachEventHandlers() {
    addressForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const data = {
        contactName: document.getElementById('contact_name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim()
    };

    const contactId = contactIdInput.value;

    if (contactId) {
        await updateAddress(contactId, data);
    } else {
        await addNewAddress(data);
    }
}

// Load and Display Addresses
async function loadAddresses() {
    if (!addressListEl) return;

    showLoading();

    const result = await callAPI("/contacts", "GET");

    if (result.success && result.data?.listData) {
        currentAddresses = result.data.listData;
        renderAddressList();
    } else {
        showError(`Lỗi khi tải địa chỉ: ${result.message || 'Không rõ'}`);
    }
}

function renderAddressList() {
    if (currentAddresses.length === 0) {
        showEmptyState();
        return;
    }

    currentAddresses.sort((a, b) => a.contactId.localeCompare(b.contactId));

    updateAddressCount(currentAddresses.length);

    const html = currentAddresses.map(address => createAddressItemHTML(address)).join('');
    addressListEl.innerHTML = html;

    // Attach event listeners
    currentAddresses.forEach(address => {
        const item = addressListEl.querySelector(`[data-id="${address.contactId}"]`);
        if (item) {
            item.querySelector('.edit-btn').addEventListener('click', () => editAddress(address.contactId));
            item.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(address.contactId));
        }
    });
}

function createAddressItemHTML(address) {
    const isEditing = isEditMode && contactIdInput.value === address.contactId;

    return `
        <div class="address-item ${isEditing ? 'editing' : ''}" data-id="${address.contactId}">
            <h4>
                <i class="fa fa-map-pin"></i>
                ${escapeHtml(address.contactName)}
            </h4>
            <p>
                <i class="fa fa-phone"></i>
                ${escapeHtml(address.phone)}
            </p>
            <p>
                <i class="fa fa-map-marker-alt"></i>
                ${escapeHtml(address.address)}
            </p>
            <div class="address-actions">
                <button type="button" class="edit-btn">
                    <i class="fa fa-edit"></i> Sửa
                </button>
                <button type="button" class="delete-btn">
                    <i class="fa fa-trash"></i> Xóa
                </button>
            </div>
        </div>
    `;
}

// CRUD Operations
async function addNewAddress(data) {
    startButtonLoading('Đang thêm...');

    const result = await callAPI("/contacts", "POST", data);

    if (result.success) {
        showNotification("Thêm địa chỉ mới thành công!");
        resetForm();
        const newAddress = { contactId: result.data.contactId, ...data };
        currentAddresses.unshift(newAddress);
        renderAddressList();
    } else {
        showNotification(`Lỗi khi thêm: ${result.message || 'Không rõ'}`, 'error');
    }

    stopButtonLoading();
}

async function updateAddress(id, data) {
    startButtonLoading('Đang cập nhật...');

    const updateData = { contactId: id, ...data };
    const result = await callAPI("/contacts", "PUT", updateData);

    if (result.success) {
        showNotification("Cập nhật địa chỉ thành công!");
        resetForm();
        const index = currentAddresses.findIndex(addr => addr.contactId === id);
        if (index !== -1) {
            currentAddresses[index] = { ...currentAddresses[index], ...data };
        }
        renderAddressList();
    } else {
        showNotification(`Lỗi khi cập nhật: ${result.message || 'Không rõ'}`, 'error');
    }

    stopButtonLoading();
}

async function deleteAddress(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;

    const result = await callAPI(`/contacts/${id}`, "DELETE");

    if (result.success) {
        showNotification("Xóa địa chỉ thành công!");

        // If deleting the address being edited, reset form
        if (contactIdInput.value === id) {
            resetForm();
        }

        currentAddresses = currentAddresses.filter(addr => addr.contactId !== id);

        renderAddressList();;
    } else {
        showNotification(`Lỗi xóa: ${result.message || 'Không rõ'}`, 'error');
    }
}

function editAddress(id) {
    const addressToEdit = currentAddresses.find(addr => addr.contactId === id);

    if (!addressToEdit) {
        showNotification("Không tìm thấy địa chỉ để sửa.", 'error');
        return;
    }

    // Populate form
    contactIdInput.value = addressToEdit.contactId;
    document.getElementById('contact_name').value = addressToEdit.contactName;
    document.getElementById('phone').value = addressToEdit.phone;
    document.getElementById('address').value = addressToEdit.address;

    // Update UI
    isEditMode = true;
    formTitle.innerHTML = '<i class="fa fa-edit"></i> Sửa Địa chỉ';
    saveBtnText.textContent = 'Cập nhật Địa chỉ';
    saveBtn.style.backgroundColor = 'var(--primary-color)';
    cancelBtn.style.display = 'block';

    // Re-render to highlight editing item
    renderAddressList();

    // Focus on first input
    document.getElementById('contact_name').focus();
}

// Form Management
function resetForm() {
    addressForm.reset();
    contactIdInput.value = '';
    isEditMode = false;

    formTitle.innerHTML = '<i class="fa fa-plus-circle"></i> Thêm Địa chỉ Mới';
    saveBtnText.textContent = 'Lưu Địa chỉ';
    saveBtn.style.backgroundColor = '';
    cancelBtn.style.display = 'none';

    // Re-render to remove editing highlight
    renderAddressList();
}

// UI Helper Functions
function startButtonLoading(text) {
    saveBtn.disabled = true;
    saveBtn.classList.add('loading');
    saveBtnText.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${text}`;
}

function stopButtonLoading() {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
    saveBtnText.innerHTML = isEditMode ? 'Cập nhật Địa chỉ' : 'Lưu Địa chỉ';
}

function showLoading() {
    addressListEl.innerHTML = `
        <p class="loading-message">
            <i class="fa fa-spinner fa-spin"></i> Đang tải danh sách địa chỉ...
        </p>
    `;
    updateAddressCount(0);
}

function showEmptyState() {
    addressListEl.innerHTML = `
        <div class="empty-state">
            <i class="fa fa-map-marked-alt"></i>
            <h3>Chưa có địa chỉ nào</h3>
            <p>Hãy thêm địa chỉ giao hàng đầu tiên của bạn!</p>
        </div>
    `;
    updateAddressCount(0);
}

function showError(message) {
    addressListEl.innerHTML = `
        <div class="empty-state">
            <i class="fa fa-exclamation-circle"></i>
            <h3>Lỗi tải dữ liệu</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    updateAddressCount(0);
}

function updateAddressCount(count) {
    if (addressCount) {
        addressCount.textContent = count > 0 ? `(${count})` : '';
    }
}

function showNotification(message, type = 'success') {
    const noti = document.getElementById('notification');

    noti.innerText = message;
    noti.className = type + " show";

    // Hiện
    noti.classList.remove("hidden");

    // 3 giây sau tự biến mất
    setTimeout(() => {
        noti.classList.remove("show");
        setTimeout(() => noti.classList.add("hidden"), 500);
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}