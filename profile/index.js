import { callAPI } from "../lib/api.js";
import { showDialog } from "../dialog/index.js";
import { convertToVNTime, getLoader } from "../lib/public.js";
import { initEmailList } from "./email-list.js";
import { loadNavbar } from "../navbar/navbar.js";
import { toggleLoading } from "../lib/loader.js"; // [MỚI] Dùng Loader xịn

const usernameInput = document.getElementById("username");
const fullNameInput = document.getElementById("fullName");
const birthdayInput = document.getElementById("birthday");
const genderInput = document.getElementById("gender");
const emailsSection = document.getElementById("emailsSection");
const role = document.getElementById("role");
const saveBtn = document.getElementById("saveBtn");
const createdAt = document.getElementById("createdAt");
const updatedAt = document.getElementById("updatedAt");
const avatarInput = document.getElementById("avatar");
const avatarPreview = document.getElementById("avatarPreview");

// Hàm load thông tin Profile
async function loadProfile() {
  const result = await callAPI("/profile");
  if (!result.success) {
    await showDialog("error", result.message);
    return;
  }
  const profile = result.data;

  // Fill dữ liệu
  avatarPreview.src =
    profile.imageUrl || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  usernameInput.value = profile.username || "";
  fullNameInput.value = profile.fullName || "";
  birthdayInput.value = profile.birthday || "";
  genderInput.value = profile.gender || "OTHER";
  role.value = profile.roleName || "GUEST";

  createdAt.textContent = convertToVNTime(profile.createdAt);
  updatedAt.textContent = convertToVNTime(profile.updatedAt);

  // Load Email list template
  const html = await fetch("/profile/email-list.html");
  const text = await html.text();
  emailsSection.innerHTML = text; // Dùng innerHTML cho sạch
  initEmailList(profile.emails);
}

// [MỚI] Sử dụng toggleLoading cho toàn bộ quá trình khởi tạo trang
document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    await loadNavbar();
    await loadProfile();
  } catch (error) {
    console.error("Lỗi khởi tạo trang Profile:", error);
  } finally {
    // Tắt loader sau khi load xong (delay nhẹ cho mượt)
    setTimeout(() => toggleLoading(false), 300);
  }
});

// Sự kiện đổi ảnh Avatar (Preview)
avatarInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    avatarPreview.src = URL.createObjectURL(file);
  }
});

// Sự kiện Lưu thay đổi
saveBtn.addEventListener("click", async () => {
  const data = new FormData();
  data.append(
    "profileRequest",
    new Blob(
      [
        JSON.stringify({
          username: usernameInput.value,
          fullName: fullNameInput.value,
          birthday: birthdayInput.value,
          gender: genderInput.value,
          roleName: role.value,
        }),
      ],
      { type: "application/json" }
    )
  );

  if (avatarInput.files[0]) {
    data.append("avatar", avatarInput.files[0]);
  }

  let result = null;
  // Dùng getLoader cục bộ cho nút Save (hiệu ứng xoay trên nút)
  await getLoader("saveBtn", async () => {
    result = await callAPI("/profile", "PUT", data, true);
  });

  await showDialog(result.success ? "success" : "error", result.message);
});
