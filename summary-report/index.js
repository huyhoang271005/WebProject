import { callAPI } from "../lib/api.js";
import {showDialog} from "/dialog/index.js";

let revenueChartInstance = null;
let orderChartInstance = null;
let dailyChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const filterType = document.getElementById('filterType');
    const dateFilterGroup = document.getElementById('dateFilterGroup');
    const monthFilterGroup = document.getElementById('monthFilterGroup');
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startMonthInput = document.getElementById('startMonth');
    const endMonthInput = document.getElementById('endMonth');
    const btnFilter = document.getElementById('btnFilter');

    // Toggle filter inputs
    filterType.addEventListener('change', () => {
        if (filterType.value === 'date') {
            dateFilterGroup.style.display = 'flex';
            monthFilterGroup.style.display = 'none';
        } else {
            dateFilterGroup.style.display = 'none';
            monthFilterGroup.style.display = 'flex';
        }
    });

    // Default dates (e.g. last 7 days)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    startDateInput.valueAsDate = lastWeek;
    endDateInput.valueAsDate = today;

    // Load initial data
    loadData();

    btnFilter.addEventListener('click', () => {
        loadData();
    });

    async function loadData() {
        btnFilter.classList.add('loading');
        
        let endpoint = "/summary-report?";
        const params = new URLSearchParams();

        if (filterType.value === 'date') {
            if (startDateInput.value) params.append('startDate', startDateInput.value);
            if (endDateInput.value) params.append('endDate', endDateInput.value);
        } else {
            if (startMonthInput.value) params.append('startMonth', startMonthInput.value);
            if (endMonthInput.value) params.append('endMonth', endMonthInput.value);
        }

        endpoint += params.toString();

        const response = await callAPI(endpoint);
        btnFilter.classList.remove('loading');

        if (!response.success) {
            await showDialog("error", response.message);
            return;
        }

        renderDashboard(response.data);
    }
});

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Animate numbers
const animateValue = (id, end, duration) => {
    let start = parseInt(document.getElementById(id).innerText.replace(/\D/g,'')) || 0;
    if (isNaN(start)) start = 0;
    let current = start;
    const range = end - start;
    const increment = end > start ? Math.ceil(range / (duration / 16)) : Math.floor(range / (duration / 16));
    const obj = document.getElementById(id);

    if (range === 0) {
        obj.innerText = end;
        return;
    }

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            obj.innerText = end;
            clearInterval(timer);
        } else {
            obj.innerText = current;
        }
    }, 16);
};

function renderDashboard(rawData) {
    const filterTypeValue = document.getElementById('filterType') ? document.getElementById('filterType').value : 'date';

    // Sort data chronologically mapping reportDate or reportMonth safely
    const reportData = rawData.sort((a, b) => {
        const strA = filterTypeValue === 'month' ? (a.reportMonth || "") : (a.reportDate || "");
        const strB = filterTypeValue === 'month' ? (b.reportMonth || "") : (b.reportDate || "");
        // If it's a month (YYYY-MM), append '-01'
        let dateA = filterTypeValue === 'month' && strA.length === 7 ? strA + '-01' : strA;
        let dateB = filterTypeValue === 'month' && strB.length === 7 ? strB + '-01' : strB;
        return new Date(dateA) - new Date(dateB);
    });

    let sumRevenue = 0;
    let sumOrders = 0;
    let sumProducts = 0;

    let sumWaiting = 0;
    let sumPending = 0;
    let sumDelivering = 0;
    let sumDelivered = 0;
    let sumCompleted = 0;
    let sumCancel = 0;

    const labels = [];
    const revenueData = [];
    const orderData = [];

    reportData.forEach(item => {
        sumRevenue += item.totalRevenue;
        sumOrders += item.totalOrderCount;
        sumProducts += item.productCount;

        sumWaiting += item.orderWaitingCount;
        sumPending += item.orderPendingCount;
        sumDelivering += item.orderDeliveringCount;
        sumDelivered += item.orderDeliveredCount;
        sumCompleted += item.orderCompletedCount;
        sumCancel += item.orderCancelCount;

        const dateStr = filterTypeValue === 'month' ? (item.reportMonth || "") : (item.reportDate || "");
        
        if (filterTypeValue === 'month') {
            // Direct split to avoid Date timezone shifting issues for just YYYY-MM
            const parts = dateStr.split('-');
            if (parts.length >= 2) {
                labels.push(`${parts[1]}/${parts[0]}`);
            } else {
                labels.push(dateStr);
            }
        } else {
            const dateObj = new Date(dateStr);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            labels.push(`${day}/${month}`);
        }

        revenueData.push(item.totalRevenue);
        orderData.push(item.totalOrderCount);
    });

    document.getElementById('totalRevenue').innerText = formatCurrency(sumRevenue);
    animateValue('totalOrders', sumOrders, 800);
    animateValue('totalProducts', sumProducts, 800);

    const isMonthly = filterTypeValue === 'month';
    const titleEl = document.getElementById('dailyOrderChartTitle');
    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-chart-column" style="color:#3b82f6;"></i> Biểu đồ Đơn hàng theo ${isMonthly ? 'tháng' : 'ngày'}`;
    }

    Chart.defaults.font.family = "'Segoe UI', 'Poppins', sans-serif";
    Chart.defaults.color = '#64748b';

    // 1. Revenue Line Chart
    if (revenueChartInstance) revenueChartInstance.destroy();
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    const revenueGradient = ctxRevenue.createLinearGradient(0, 0, 0, 400);
    revenueGradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    revenueGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

    revenueChartInstance = new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu',
                data: revenueData,
                borderColor: '#10b981',
                backgroundColor: revenueGradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [5, 5], color: '#f1f5f9' },
                    ticks: { callback: function (value) { return formatCurrency(value); } }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // 2. Orders Status Doughnut Chart
    if (orderChartInstance) orderChartInstance.destroy();
    const ctxOrder = document.getElementById('orderChart').getContext('2d');
    orderChartInstance = new Chart(ctxOrder, {
        type: 'doughnut',
        data: {
            labels: ['Chờ thanh toán', 'Chờ xác nhận', 'Đang giao', 'Đã giao', 'Hoàn thành', 'Đã huỷ'],
            datasets: [{
                data: [sumWaiting, sumPending, sumDelivering, sumDelivered, sumCompleted, sumCancel],
                backgroundColor: ['#3b82f6', '#f59e0b', '#6366f1', '#14b8a6', '#10b981', '#ef4444'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, usePointStyle: true, padding: 20 }
                }
            },
            cutout: '65%'
        }
    });

    // 3. Daily Order Bar Chart
    if (dailyChartInstance) dailyChartInstance.destroy();
    const ctxDaily = document.getElementById('dailyOrderChart').getContext('2d');
    dailyChartInstance = new Chart(ctxDaily, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số đơn hàng',
                data: orderData,
                backgroundColor: '#3b82f6',
                borderRadius: 6,
                barPercentage: 0.5,
                hoverBackgroundColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { borderDash: [5, 5], color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}
