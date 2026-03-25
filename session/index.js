import { callAPI } from "/lib/api.js";
import { showDialog } from "/dialog/index.js";
import { loadPage, convertToVNTime, timeAgo } from "/lib/public.js";
import { loadNavbar } from "/navbar/navbar.js"; // 1. Import Navbar

// --- CẤU HÌNH API ---
const API_GET_SESSION = "/sessions?page=0&size=20";
const API_LOGOUT_ONE = "/logout";
const API_REVOKE_ONE = "/sessions";
const API_LOGOUT_OTHERS = "/logout-all";

const currentListEl = document.getElementById("currentDeviceList");
const otherListEl = document.getElementById("otherDeviceList");
const contentDiv = document.getElementById("info");

// --- HÀM KHỞI TẠO CHÍNH ---
await loadPage(async () => {
  await loadNavbar(); // 2. Load Navbar trước khi load nội dung
  await loadSessions();
});



function getDeviceIcon(userAgent) {
  if (!userAgent) return "fa-desktop";
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "fa-windows";
  if (ua.includes("android")) return "fa-android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac"))
    return "fa-apple";
  if (ua.includes("linux")) return "fa-linux";
  return "fa-desktop";
}

function formatLocation(addr) {
  if (!addr) return "Không xác định";
  return `${addr.city || addr.region || ""}, ${addr.country || ""}`.replace(
    /^, /,
    "",
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
      '<div style="padding:20px; color:#9CA3AF; text-align:center; font-style:italic;">Không có thiết bị khác</div>';
    document.getElementById("revokeOthersBtn").style.display = "none";
  } else {
    document.getElementById("revokeOthersBtn").style.display = "block";
    otherSessions.forEach((session) => {
      otherListEl.insertAdjacentHTML(
        "beforeend",
        createDeviceHTML(session, false),
      );
    });
  }
  initButtonEvents();
}

function createDeviceHTML(session, isCurrent) {
  const iconStr = session.userAgent || session.deviceName || "";
  const icon = getDeviceIcon(iconStr);
  const location = formatLocation(session.address);

  // Xử lý thông tin hiển thị
  const relativeTime = timeAgo(session.lastLogin);
  const timezone = session.address?.timezone || "Không xác định";
  const fullUserAgent = session.userAgent || "Không có thông tin chi tiết";
  const createdTime = convertToVNTime(session.createdAt);

  let statusBadge = "";
  let actionBtns = "";
  let rowClass = "";

  if (isCurrent) {
    statusBadge = '<span class="status-badge current">Đang truy cập</span>';
  } else {
    if (session.revoked === true) {
      statusBadge = '<span class="status-badge inactive">Đã đăng xuất</span>';
      rowClass = "row-inactive";
      actionBtns = `
                <div class="action-group">
                      <button class="icon-btn delete-btn" data-id="${session.sessionId}" title="Xóa lịch sử phiên này">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                </div>`;
    } else {
      statusBadge = '<span class="status-badge active">Đang hoạt động</span>';
      actionBtns = `
                <div class="action-group">
                      <button class="icon-btn logout-btn" data-id="${session.sessionId}" title="Đăng xuất thiết bị này">
                        <i class="fa-solid fa-right-from-bracket"></i>
                      </button>
                      <button class="icon-btn delete-btn" data-id="${session.sessionId}" title="Xóa phiên">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                </div>`;
    }
  }

  return `
    <div class="device-card ${rowClass}">
        <div class="created-at-label" title="Lần đầu đăng nhập">
            Đăng nhập lần đầu: ${createdTime}
        </div>

        <div class="device-icon-wrapper">
            <i class="fa-brands ${icon} ${
              icon === "fa-desktop" ? "fa-solid" : ""
            }"></i>
        </div>
        <div class="device-details">
            <div class="device-name" title="${fullUserAgent}">
                ${session.deviceName}
            </div>
            
            <div class="device-meta">
                ${location} • 
                <span class="time-ago" title="Múi giờ: ${timezone} | Cập nhật lúc: ${convertToVNTime(
                  session.lastLogin,
                )}">
                    ${relativeTime}
                </span>
            </div>
            
            <div style="margin-top: 5px;">
                ${statusBadge}
            </div>
        </div>
        ${actionBtns}
    </div>
    `;
}

function initButtonEvents() {
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleLogoutOne(btn.dataset.id);
    };
  });
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleRevokeOne(btn.dataset.id);
    };
  });
}

// --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
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

async function handleRevokeOne(sessionId) {
  await showDialog(
    "question",
    "Xóa phiên đăng nhập này khỏi danh sách?",
    async () => {
      const result = await callAPI(`${API_REVOKE_ONE}/${sessionId}`, "DELETE");
      if (result.success) {
        await showDialog("success", "Đã xóa phiên thành công.");
        await loadSessions();
      } else {
        await showDialog("error", result.message);
      }
    },
  );
}

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
      },
    );
  });
