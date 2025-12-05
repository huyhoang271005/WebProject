import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

<<<<<<< HEAD
// --- CẤU HÌNH API (Hỏi backend để điền đúng nhé) ---
const API_GET_SESSION = "sessions?page=0&size=20";
const API_REVOKE_ONE = "sessions"; // DELETE /auth/sessions/{id}

// ⚠️ HAI API NÀY TỚ ĐANG ĐỂ GIẢ ĐỊNH, BRO SỬA LẠI CHO ĐÚNG LINK BACKEND CUNG CẤP
const API_REVOKE_OTHERS = "sessions/revoke-others";
const API_REVOKE_ALL = "sessions/revoke-all";

const currentListEl = document.getElementById("currentDeviceList");
const otherListEl = document.getElementById("otherDeviceList");
const contentDiv = document.getElementById("info");

// Hàm lấy icon dựa trên deviceType
function getDeviceIcon(type) {
  if (type === "MOBILE") return "fa-mobile-screen";
  if (type === "TABLET") return "fa-tablet-screen-button";
  return "fa-desktop"; // Mặc định là WEB/PC
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
=======
// --- CẤU HÌNH API ---
// Bro lưu ý: tớ để size=20 để hiện được nhiều thiết bị hơn, chứ size=3 thì ít quá
const API_GET_SESSION = "/auth/sessions?page=0&size=20";

// --- QUAN TRỌNG: Link API xoá session ---
// Tớ đang giả định backend dùng Method DELETE vào link này.
// Nếu sai bro hỏi bạn backend: "API revoke session đường dẫn là gì?" nhé.
const API_REVOKE_SESSION = "/auth/sessions";

const sessionListEl = document.getElementById("sessionList");
const contentDiv = document.getElementById("info");

// Hàm làm đẹp tên thiết bị
function parseDeviceName(userAgent) {
  if (!userAgent) return "Thiết bị ẩn danh";
  if (userAgent.includes("Windows")) return "Máy tính Windows";
  if (userAgent.includes("Macintosh")) return "Máy tính Mac";
  if (userAgent.includes("Android")) return "Điện thoại Android";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad"))
    return "iPhone/iPad";
  if (userAgent.includes("Linux")) return "Máy tính Linux";
  return "Thiết bị khác";
}

// Hàm lấy icon
function getDeviceIcon(userAgent) {
  if (
    userAgent.includes("Android") ||
    userAgent.includes("iPhone") ||
    userAgent.includes("Mobile")
  ) {
    return "fa-mobile-screen";
  }
  return "fa-laptop";
}

// 1. Hàm tải danh sách từ Server thật
async function loadSessions() {
  // Gọi API thật
  const result = await callAPI(API_GET_SESSION);

  if (!result.success) {
    // Nếu lỗi (ví dụ chưa đăng nhập), hiện thông báo
    await showDialog("error", result.message);
    return;
  }

  // Lấy dữ liệu từ backend trả về
  // Cấu trúc: { data: { listData: [...] } }
>>>>>>> 8ea699efb635b0bb0d7c15fae02e7ed258f893c0
  const sessions = result.data.listData || [];
  renderSessions(sessions);
}

<<<<<<< HEAD
function renderSessions(sessions) {
  currentListEl.innerHTML = "";
  otherListEl.innerHTML = "";

  if (contentDiv) contentDiv.style.display = "block";

  // Tách danh sách thành 2 phần
  const currentSession = sessions.find((s) => s.thisSession === true);
  const otherSessions = sessions.filter((s) => s.thisSession !== true);

  // 1. Render Thiết bị hiện tại
  if (currentSession) {
    currentListEl.innerHTML = createDeviceHTML(currentSession, true);
  }

  // 2. Render Các thiết bị khác
  if (otherSessions.length === 0) {
    otherListEl.innerHTML =
      '<div style="padding:15px; color:#888; text-align:center;">Không có thiết bị khác</div>';
    document.getElementById("revokeOthersBtn").style.display = "none"; // Ẩn nút xoá khác nếu ko có
  } else {
    document.getElementById("revokeOthersBtn").style.display = "block";
    otherSessions.forEach((session) => {
      otherListEl.insertAdjacentHTML(
        "beforeend",
        createDeviceHTML(session, false)
      );
    });
  }

  // Gán sự kiện cho các nút X (chỉ ở danh sách khác)
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleRevokeOne(btn.dataset.id);
=======
// 2. Hàm hiển thị (Render)
function renderSessions(sessions) {
  sessionListEl.innerHTML = "";

  // Đảm bảo bảng hiện ra
  if (contentDiv) contentDiv.style.display = "block";
  const table = document.querySelector("table");
  if (table) table.style.display = "table";

  if (sessions.length === 0) {
    sessionListEl.innerHTML =
      '<tr><td colspan="4" style="text-align:center;">Không tìm thấy phiên đăng nhập nào.</td></tr>';
    return;
  }

  sessions.forEach((session) => {
    const deviceNamePretty = parseDeviceName(session.userAgent);
    const icon = getDeviceIcon(session.userAgent);

    // --- XỬ LÝ TRẠNG THÁI ---
    let statusHtml = "";
    let actionHtml = "";
    let rowClass = ""; // Class để chỉnh màu dòng nếu cần

    if (session.thisSession === true) {
      // Trường hợp 1: Máy đang dùng
      statusHtml = '<span class="status-badge current">Đang truy cập</span>';
      actionHtml =
        '<span style="color: #aaa; font-size: 0.9rem;">(Thiết bị này)</span>';
      rowClass = "row-current";
    } else if (session.revoked === true) {
      // Trường hợp 2: Đã bị đăng xuất (Revoked)
      statusHtml = '<span class="status-badge revoked">Đã đăng xuất</span>';
      actionHtml = '<span style="color: #aaa;">-</span>'; // Không cho xoá tiếp
      rowClass = "row-revoked";
    } else {
      // Trường hợp 3: Máy khác đang hoạt động bình thường
      statusHtml = '<span class="status-badge active">Đang hoạt động</span>';
      actionHtml = `<button class="revoke-btn" data-id="${session.sessionId}">Đăng xuất</button>`;
    }

    const tr = document.createElement("tr");
    if (rowClass) tr.classList.add(rowClass);

    tr.innerHTML = `
            <td data-label="Thiết bị">
                <div class="device-info">
                    <i class="fa-solid ${icon} device-icon"></i>
                    <div>
                        <div style="font-weight: 500;">${deviceNamePretty}</div>
                        <div style="font-size: 0.8rem; color: #9ca3af; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${
                          session.userAgent
                        }">
                            ${session.deviceName || session.userAgent}
                        </div>
                    </div>
                </div>
            </td>
            <td data-label="Thời gian">
                ${convertToVNTime(session.lastLogin)}
            </td>
            <td data-label="Trạng thái">
                ${statusHtml}
            </td>
            <td data-label="Hành động">
                ${actionHtml}
            </td>
        `;
    sessionListEl.appendChild(tr);
  });

  // Gắn sự kiện click cho các nút Đăng xuất
  document.querySelectorAll(".revoke-btn").forEach((btn) => {
    btn.onclick = async () => {
      const sessionId = btn.dataset.id;
      await handleRevoke(sessionId);
>>>>>>> 8ea699efb635b0bb0d7c15fae02e7ed258f893c0
    };
  });
}

<<<<<<< HEAD
// Hàm tạo HTML cho từng dòng
function createDeviceHTML(session, isCurrent) {
  const icon = getDeviceIcon(session.deviceType);
  const location = formatLocation(session.address);
  const time = convertToVNTime(session.lastLogin);

  // Nếu là thiết bị hiện tại thì không có nút X
  const actionBtn = isCurrent
    ? ""
    : `<button class="close-btn" data-id="${session.sessionId}" title="Đăng xuất thiết bị này"><i class="fa-solid fa-xmark"></i></button>`;

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

// --- CÁC HÀM XỬ LÝ HÀNH ĐỘNG ---

// 1. Xoá 1 thiết bị cụ thể
async function handleRevokeOne(sessionId) {
  await showDialog("question", "Đăng xuất thiết bị này?", async () => {
    const result = await callAPI(`${API_REVOKE_ONE}/${sessionId}`, "DELETE");
    if (result.success) await loadSessions();
    else await showDialog("error", result.message);
  });
}

// 2. Xoá TẤT CẢ (Kể cả mình - sẽ bị văng ra Login)
document.getElementById("revokeAllBtn").addEventListener("click", async () => {
  await showDialog(
    "question",
    "Bạn sẽ bị đăng xuất khỏi TẤT CẢ thiết bị (bao gồm máy này). Tiếp tục?",
    async () => {
      const result = await callAPI(API_REVOKE_ALL, "DELETE");

      if (result.success) {
        // Vì đã đăng xuất chính mình, nên chuyển về trang Login
        window.location.replace("../auth/login");
      } else {
        await showDialog("error", result.message);
      }
    }
  );
});

// 3. Xoá CÁC THIẾT BỊ KHÁC (Giữ lại mình)
document
  .getElementById("revokeOthersBtn")
  .addEventListener("click", async () => {
    await showDialog(
      "question",
      "Đăng xuất tất cả các thiết bị khác?",
      async () => {
        const result = await callAPI(API_REVOKE_OTHERS, "DELETE");

        if (result.success) {
          await showDialog("success", "Đã đăng xuất các thiết bị khác.");
          await loadSessions();
        } else {
          await showDialog("error", result.message);
        }
      }
    );
  });

=======
// 3. Hàm xử lý khi bấm nút Đăng xuất (Revoke)
async function handleRevoke(sessionId) {
  await showDialog(
    "question",
    "Bạn có chắc muốn đăng xuất thiết bị này không?",
    async () => {
      // Gọi API DELETE: /auth/sessions/{sessionId}
      const result = await callAPI(
        `${API_REVOKE_SESSION}/${sessionId}`,
        "DELETE"
      );

      if (result.success) {
        await showDialog("success", "Đã đăng xuất thiết bị thành công");
        // Tải lại danh sách để cập nhật trạng thái
        await loadSessions();
      } else {
        await showDialog(
          "error",
          result.message || "Có lỗi xảy ra khi đăng xuất."
        );
      }
    }
  );
}

// Chạy hàm khi vào trang
>>>>>>> 8ea699efb635b0bb0d7c15fae02e7ed258f893c0
await loadPage(async () => {
  await loadSessions();
});
