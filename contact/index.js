import { callAPI } from "../lib/api.js";
import { loadNavbar } from "../navbar/navbar.js";
import { loadPage } from "../lib/public.js";

const PHONE_PATTERN = /^(0[3|5|7|8|9])+([0-9]{8})$/;
const MIN_NAME_LENGTH = 2;
const NOTIFICATION_DURATION = 3000;

const addressForm = document.getElementById('addressForm');
const addressListEl = document.getElementById('addressList');
const saveBtn = document.getElementById('saveAddressBtn');
const saveBtnText = document.getElementById('saveBtnText');
const cancelBtn = document.getElementById('cancelEditBtn');
const contactIdInput = document.getElementById('contactId');
const formTitle = document.getElementById('formTitle');
const addressCount = document.getElementById('addressCount');

let currentAddresses = [];
let isEditMode = false;

loadPage(async () => {
    try {
        await loadNavbar();
        await loadAddresses();
        attachEventHandlers();
    } catch (error) {
        console.error(error);
        showNotification("Có lỗi khi tải trang", 'error');
    }
});

function attachEventHandlers() {
    addressForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    ['contact_name', 'phone', 'address'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => clearFieldError(id));
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const data = {
        contactName: document.getElementById('contact_name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim()
    };

    if (!validateForm(data)) return;

    const contactId = contactIdInput.value;

    if (contactId) {
        await updateAddress(contactId, data);
    } else {
        await addNewAddress(data);
    }
}

function validateForm(data) {
    let isValid = true;

    if (!data.contactName) {
        showFieldError('contact_name', 'Vui lòng nhập họ và tên');
        isValid = false;
    } else if (data.contactName.length < MIN_NAME_LENGTH) {
        showFieldError('contact_name', `Họ tên phải có ít nhất ${MIN_NAME_LENGTH} ký tự`);
        isValid = false;
    }

    if (!data.phone) {
        showFieldError('phone', 'Vui lòng nhập số điện thoại');
        isValid = false;
    } else if (!PHONE_PATTERN.test(data.phone)) {
        showFieldError('phone', 'Số điện thoại không hợp lệ. Bắt đầu bằng 0 và có 10 số');
        isValid = false;
    }

    if (!data.address) {
        showFieldError('address', 'Vui lòng nhập địa chỉ chi tiết');
        isValid = false;
    }

    return isValid;
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`error_${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.innerText = message;
        errorEl.style.display = 'flex';
    }
    if (inputEl) {
        inputEl.closest('.form-group').classList.add('error');
    }
}

function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`error_${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.innerText = '';
    }
    if (inputEl) {
        inputEl.closest('.form-group').classList.remove('error');
    }
}

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

    updateAddressCount(currentAddresses.length);
    const html = currentAddresses.map(address => createAddressItemHTML(address)).join('');
    addressListEl.innerHTML = html;
    attachAddressListeners();
}

function attachAddressListeners() {
    currentAddresses.forEach(address => {
        const item = addressListEl.querySelector(`[data-id="${address.contactId}"]`);
        if (!item) return;

        item.querySelector('.edit-btn').addEventListener('click', () => editAddress(address.contactId));
        item.querySelector('.delete-btn').addEventListener('click', () => deleteAddress(address.contactId));
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

function isResponseSuccessful(result) {
    return result.success || result.contactId;
}

async function addNewAddress(data) {
    startButtonLoading('Đang thêm...');
    const result = await callAPI("/contacts", "POST", data);

    if (isResponseSuccessful(result)) {
        showNotification("Thêm địa chỉ mới thành công!");
        const newId = result.contactId || result.data?.contactId;
        const newAddress = { contactId: newId, ...data };
        currentAddresses.unshift(newAddress);
        renderAddressList();
        resetForm();
    } else {
        showNotification(`Lỗi khi thêm: ${result.message || 'Không rõ'}`, 'error');
    }

    stopButtonLoading();
}

async function updateAddress(id, data) {
    startButtonLoading('Đang cập nhật...');
    const updateData = { contactId: id, ...data };
    const result = await callAPI("/contacts", "PUT", updateData);

    if (isResponseSuccessful(result)) {
        showNotification("Cập nhật địa chỉ thành công!");
        const index = currentAddresses.findIndex(addr => addr.contactId === id);
        if (index !== -1) {
            currentAddresses[index] = { ...currentAddresses[index], ...data };
        }
        renderAddressList();
        resetForm();
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
        renderAddressList();
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
    noti.className = `${type} show`;
    noti.classList.remove("hidden");

    setTimeout(() => {
        noti.classList.remove("show");
        setTimeout(() => noti.classList.add("hidden"), 500);
    }, NOTIFICATION_DURATION);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}