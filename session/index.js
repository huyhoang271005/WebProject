import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

// --- CẤU HÌNH API (Dựa trên ảnh bro gửi) ---
const API_GET_SESSION = "/sessions?page=0&size=20";

// 1. Đăng xuất từng thiết bị (GET)
// Endpoint trong ảnh là: /logout/{sessionId}
const API_LOGOUT_ONE = "/logout";

// 3. Đăng xuất thiết bị khác (GET)
// ⚠️ LƯU Ý: Trong ảnh tớ không thấy endpoint này, nhưng bro bảo backend có làm.
// Bro hỏi lại backend xem link là gì nhé. Tớ đang đoán là:
const API_LOGOUT_OTHERS = "/logout-all";

const currentListEl = document.getElementById("currentDeviceList");
const otherListEl = document.getElementById("otherDeviceList");
const contentDiv = document.getElementById("info");

// Hàm lấy icon
function getDeviceIcon(type) {
  if (type === "MOBILE") return "fa-mobile-screen";
  if (type === "TABLET") return "fa-tablet-screen-button";
  return "fa-desktop";
}

// Hàm format địa chỉ
function formatLocation(addr) {
  if (!addr) return "Không xác định";
  // Ví dụ: Hanoi, VN
  return `${addr.city || addr.region || ""}, ${addr.country || ""}`.replace(
    /^, /,
    ""
  );
}

async function loadSessions() {
  const result = await callAPI(API_GET_SESSION);
  if (!result.success) {
    await showDialog("error", result.message);
    return;
  }
  const sessions = result.data.listData || [];
  renderSessions(sessions);
}

function renderSessions(sessions) {
  currentListEl.innerHTML = "";
  otherListEl.innerHTML = "";

  if (contentDiv) contentDiv.style.display = "block";

  // Tách danh sách: Hiện tại vs Khác
  const currentSession = sessions.find((s) => s.thisSession === true);
  const otherSessions = sessions.filter((s) => s.thisSession !== true);

  // 1. Render Thiết bị hiện tại
  if (currentSession) {
    currentListEl.innerHTML = createDeviceHTML(currentSession, true);
  }

  // 2. Render Các thiết bị khác
  if (otherSessions.length === 0) {
    otherListEl.innerHTML =
      '<div style="padding:20px; color:#9CA3AF; text-align:center; font-style:italic;">Không có thiết bị khác đang đăng nhập</div>';
    document.getElementById("revokeOthersBtn").style.display = "none"; // Ẩn nút nếu ko có gì để xoá
  } else {
    document.getElementById("revokeOthersBtn").style.display = "block";
    otherSessions.forEach((session) => {
      otherListEl.insertAdjacentHTML(
        "beforeend",
        createDeviceHTML(session, false)
      );
    });
  }

  // Gán sự kiện click cho các nút X
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleLogoutOne(btn.dataset.id);
    };
  });
}

// Hàm tạo HTML giao diện giống Discord
function createDeviceHTML(session, isCurrent) {
  const icon = getDeviceIcon(session.deviceType);
  const location = formatLocation(session.address);
  const time = convertToVNTime(session.lastLogin);

  // Nút X chỉ hiện cho thiết bị khác
  const actionBtn = isCurrent
    ? ""
    : `<button class="close-btn" data-id="${session.sessionId}" title="Đăng xuất thiết bị này">
             <i class="fa-solid fa-xmark"></i>
           </button>`;

  const nameBadge = isCurrent
    ? '<span class="current-badge">Hiện tại</span>'
    : "";

  return `
    <div class="device-card">
        <div class="device-icon-wrapper">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div class="device-details">
            <div class="device-name">
                ${session.deviceName} ${nameBadge}
            </div>
            <div class="device-meta">
                ${location} • ${time}
            </div>
        </div>
        ${actionBtn}
    </div>
    `;
}

// --- XỬ LÝ HÀNH ĐỘNG (Dùng Method GET / Logout) ---

// 1. Đăng xuất 1 thiết bị
async function handleLogoutOne(sessionId) {
  await showDialog("question", "Đăng xuất thiết bị này?", async () => {
    // Gọi: GET /logout/{sessionId}
    const result = await callAPI(`${API_LOGOUT_ONE}/${sessionId}`);

    if (result.success) await loadSessions();
    else await showDialog("error", result.message);
  });
}

// 3. Đăng xuất CÁC THIẾT BỊ KHÁC
document
  .getElementById("revokeOthersBtn")
  .addEventListener("click", async () => {
    await showDialog(
      "question",
      "Đăng xuất tất cả các thiết bị khác?",
      async () => {
        // Gọi: GET /logout-others (Hoặc link tương tự)
        const result = await callAPI(API_LOGOUT_OTHERS);

        if (result.success) {
          await showDialog("success", "Đã đăng xuất các thiết bị khác.");
          await loadSessions();
        } else {
          await showDialog("error", result.message);
        }
      }
    );
  });

await loadPage(async () => {
  await loadSessions();
});
