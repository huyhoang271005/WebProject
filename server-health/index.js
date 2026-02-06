import { loadNavbar } from "/navbar/navbar.js";
import { callAPI } from "/lib/api.js";
import { showDialog } from "/dialog/index.js";

// Init
document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  await fetchHealthStatus();
  setupEvents();

  // Auto refresh every 30s
  setInterval(fetchHealthStatus, 30000);
});

function setupEvents() {
    const btnClear = document.getElementById("btnClearCache");
    if(btnClear) {
        btnClear.onclick = async () => {
            await showDialog("question", "Bạn có chắc muốn xóa toàn bộ cache server không?",
                async () => {
                    btnClear.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang xóa...';
                    btnClear.disabled = true;

                    const res = await callAPI("/api/cache/clear", "POST");
                    await showDialog(res.success ? "success" : "error", res.message);
                    btnClear.innerHTML = '<i class="fa-solid fa-broom"></i> Xóa Cache Server';
                    btnClear.disabled = false;
                });
        };
    }

    const btnRefresh = document.getElementById("btnRefresh");
    if(btnRefresh) {
        btnRefresh.onclick = fetchHealthStatus;
    }
}

async function fetchHealthStatus() {
    const lastUpdated = document.getElementById("lastUpdated");
    const btnRefresh = document.getElementById("btnRefresh");

    if(btnRefresh) {
        btnRefresh.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btnRefresh.disabled = true;
    }

    const data = await callAPI("/actuator/health", "GET");

    if(data?.success === false) {
        await showDialog("error", data.message);
    }
    renderHealthGrid(data);

    // Update time
    const now = new Date();
    lastUpdated.innerHTML = `<i class="fa-regular fa-clock"></i> Cập nhật lần cuối: ${now.toLocaleTimeString()}`;
    if(btnRefresh) {
        btnRefresh.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Làm mới';
        btnRefresh.disabled = false;
    }
}

function renderHealthGrid(data) {
    const grid = document.getElementById("healthGrid");
    grid.innerHTML = "";

    if (!data || !data.components) {
        grid.innerHTML = `<div class="card error">Invalid Health Data Structure</div>`;
        return;
    }

    // 1. Overall Status (Optional, maybe put in header)
    // const overallStatus = data.status; 

    // 2. Loop components
    Object.keys(data.components).forEach(key => {
        const comp = data.components[key];
        const status = comp.status; 
        const statusClass = status === "UP" ? "up" : (status === "DOWN" ? "down" : "unknown");
        const statusBadgeClass = status === "UP" ? "status-up" : (status === "DOWN" ? "status-down" : "status-unknown");
        
        let icon = "fa-cube";
        if (key === "db") icon = "fa-database";
        if (key === "diskSpace") icon = "fa-hard-drive";
        if (key === "mail") icon = "fa-envelope";
        if (key === "ping") icon = "fa-network-wired";
        if (key === "ssl") icon = "fa-lock";

        let metricsHtml = "";
        if (comp.details) {
            // Special handling format
            if (key === "diskSpace") {
                const totalGB = (comp.details.total / 1024 / 1024 / 1024).toFixed(2);
                const freeGB = (comp.details.free / 1024 / 1024 / 1024).toFixed(2);
                const usedGB = (totalGB - freeGB).toFixed(2);
                const percent = Math.round((usedGB / totalGB) * 100);
                
                metricsHtml += createMetricRow("Used", `${usedGB} GB (${percent}%)`);
                metricsHtml += createMetricRow("Free", `${freeGB} GB`);
                metricsHtml += createMetricRow("Total", `${totalGB} GB`);
                metricsHtml += `
                    <div style="background:#e5e7eb; height:6px; border-radius:3px; margin-top:8px; overflow:hidden;">
                        <div style="width:${percent}%; background:${percent > 90 ? '#ef4444' : '#10b981'}; height:100%;"></div>
                    </div>
                `;
            } else {
                // Default loop
                Object.keys(comp.details).forEach(dKey => {
                    const val = comp.details[dKey];
                    if (typeof val !== 'object' && !Array.isArray(val)) {
                         metricsHtml += createMetricRow(dKey, val);
                    }
                });
            }
        } else {
            metricsHtml += `<div style="color:#9ca3af; font-style:italic; font-size:0.9rem;">No details available</div>`;
        }

        const cardHtml = `
            <div class="health-card ${statusClass}">
                <div class="card-header">
                    <div class="card-title">${formatTitle(key)}</div>
                    <span class="status-badge ${statusBadgeClass}">${status}</span>
                </div>
                <div>
                    ${metricsHtml}
                </div>
                <i class="fa-solid ${icon} card-icon-bg"></i>
            </div>
        `;
        grid.insertAdjacentHTML("beforeend", cardHtml);
    });
}

function createMetricRow(label, value) {
    return `
        <div class="metric-row">
            <span class="metric-label">${formatTitle(label)}:</span>
            <span class="metric-value" title="${value}">${value}</span>
        </div>
    `;
}

function formatTitle(str) {
    // db -> DB, camelCase -> Title Case
    if(str === 'db') return 'Database';
    if(str === 'ssl') return 'SSL';
    return str.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}
