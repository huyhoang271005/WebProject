// register.js
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const birthdayInput = document.getElementById('birthday');
const genderInput = document.getElementById('gender');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const avatarInput = document.getElementById('avatar');
const registerBtn = document.getElementById('registerBtn');
const statusDiv = document.getElementById('status');

// Regex tương ứng với @Pattern
const regexUsername = /^[a-zA-Z0-9]{3,20}$/; // ví dụ: 3-20 ký tự a-z A-Z 0-9
const regexFullName = /^[a-zA-Z\s]{3,50}$/;  // ví dụ: 3-50 ký tự chữ + khoảng trắng
const regexDate = /^\d{4}-\d{2}-\d{2}$/;     // yyyy-mm-dd

registerBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const birthday = birthdayInput.value.trim();
    const gender = genderInput.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const avatar = avatarInput.files[0];

    statusDiv.textContent = '';
    statusDiv.classList.remove('success', 'error');

    // Validate từng trường
    if (!username || !regexUsername.test(username)) {
        statusDiv.textContent = 'Tên đăng nhập không hợp lệ!';
        statusDiv.classList.add('error');
        return;
    }

    if (!fullName || !regexFullName.test(fullName)) {
        statusDiv.textContent = 'Họ và tên không hợp lệ!';
        statusDiv.classList.add('error');
        return;
    }

    if (!birthday || !regexDate.test(birthday)) {
        statusDiv.textContent = 'Ngày sinh không hợp lệ!';
        statusDiv.classList.add('error');
        return;
    }

    if (!gender) {
        statusDiv.textContent = 'Vui lòng chọn giới tính!';
        statusDiv.classList.add('error');
        return;
    }

    if (!email) {
        statusDiv.textContent = 'Email không hợp lệ!';
        statusDiv.classList.add('error');
        return;
    }

    if (!password) {
        statusDiv.textContent = 'Vui lòng nhập mật khẩu!';
        statusDiv.classList.add('error');
        return;
    }

    if (!avatar) {
        statusDiv.textContent = 'Vui lòng chọn ảnh đại diện!';
        statusDiv.classList.add('error');
        return;
    }

    // Giả lập đăng ký thành công
    statusDiv.textContent = 'Đang xử lý...';
    setTimeout(() => {
        statusDiv.textContent = '✅ Đăng ký thành công!';
        statusDiv.classList.add('success');
        // Reset form
        usernameInput.value = '';
        fullNameInput.value = '';
        birthdayInput.value = '';
        genderInput.value = '';
        emailInput.value = '';
        passwordInput.value = '';
        avatarInput.value = '';
    }, 1000);
});
