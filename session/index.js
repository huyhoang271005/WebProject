import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

// --- CẤU HÌNH API ---
const API_GET_SESSION = "/sessions?page=0&size=20";

// 1. Đăng xuất 1 thiết bị (GET) - Cái bro vừa yêu cầu thêm
const API_LOGOUT_ONE = "/logout"; // -> GET /logout/{id}

// 2. Xoá phiên 1 thiết bị (DELETE) - Cái nút X đỏ
const API_REVOKE_ONE = "/sessions"; // -> DELETE /sessions/{id}

// 3. Đăng xuất các thiết bị KHÁC (GET) - Nút to ở dưới
const API_LOGOUT_OTHERS = "/logout-all";

const currentListEl = document.getElementById("currentDeviceList");
const otherListEl = document.getElementById("otherDeviceList");
const contentDiv = document.getElementById("info");

function getDeviceIcon(type) {
  if (type === "MOBILE") return "fa-mobile-screen";
  if (type === "TABLET") return "fa-tablet-screen-button";
  return "fa-desktop";
}

function formatLocation(addr) {
  if (!addr) return "Không xác định";
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

  const currentSession = sessions.find((s) => s.thisSession === true);
  const otherSessions = sessions.filter((s) => s.thisSession !== true);

  if (currentSession) {
    currentListEl.innerHTML = createDeviceHTML(currentSession, true);
  }

  if (otherSessions.length === 0) {
    otherListEl.innerHTML =
      '<div style="padding:20px; color:#9CA3AF; text-align:center; font-style:italic;">Không có thiết bị khác đang đăng nhập</div>';
    document.getElementById("revokeOthersBtn").style.display = "none";
  } else {
    document.getElementById("revokeOthersBtn").style.display = "block";
    otherSessions.forEach((session) => {
      otherListEl.insertAdjacentHTML(
        "beforeend",
        createDeviceHTML(session, false)
      );
    });
  }

  // --- GÁN SỰ KIỆN CHO CÁC NÚT ---

  // 1. Nút Logout (Mới thêm)
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleLogoutOne(btn.dataset.id);
    };
  });

  // 2. Nút Xóa phiên (Nút X đỏ)
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleRevokeOne(btn.dataset.id);
    };
  });
}

function createDeviceHTML(session, isCurrent) {
  const icon = getDeviceIcon(session.deviceType);
  const location = formatLocation(session.address);
  const time = convertToVNTime(session.lastLogin);

  // Nếu là thiết bị hiện tại thì không hiện nút gì cả
  // Nếu là thiết bị khác: Hiện cả nút Logout (cửa) và Revoke (X)
  const actionBtns = isCurrent
    ? ""
    : `<div class="action-group">
             <button class="icon-btn logout-btn" data-id="${session.sessionId}" title="Đăng xuất thiết bị này (Logout)">
                <i class="fa-solid fa-right-from-bracket"></i>
             </button>
             <button class="icon-btn delete-btn" data-id="${session.sessionId}" title="Xóa phiên (Force Revoke)">
                <i class="fa-solid fa-xmark"></i>
             </button>
           </div>`;

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
        ${actionBtns}
    </div>
    `;
}

// ---------------- CÁC HÀM XỬ LÝ ----------------

// A. Đăng xuất 1 thiết bị (GET /logout/{id}) - Nhẹ nhàng
async function handleLogoutOne(sessionId) {
  await showDialog("question", "Đăng xuất thiết bị này?", async () => {
    const result = await callAPI(`${API_LOGOUT_ONE}/${sessionId}`);
    if (result.success) {
      await showDialog("success", "Đã đăng xuất thành công.");
      await loadSessions();
    } else {
      await showDialog("error", result.message);
    }
  });
}

// B. Xóa phiên (DELETE /sessions/{id}) - Mạnh tay
async function handleRevokeOne(sessionId) {
  await showDialog(
    "question",
    "Xóa phiên đăng nhập này? (Thiết bị sẽ phải xác thực lại)",
    async () => {
      const result = await callAPI(`${API_REVOKE_ONE}/${sessionId}`, "DELETE");
      if (result.success) {
        await showDialog("success", "Đã xóa phiên thành công.");
        await loadSessions();
      } else {
        await showDialog("error", result.message);
      }
    }
  );
}

// C. Đăng xuất các thiết bị KHÁC (GET /logout-all)
document
  .getElementById("revokeOthersBtn")
  .addEventListener("click", async () => {
    await showDialog(
      "question",
      "Đăng xuất tất cả các thiết bị khác?",
      async () => {
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
