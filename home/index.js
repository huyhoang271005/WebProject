import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

let apiCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Không bật toggleLoading toàn màn hình ở đây để trải nghiệm mượt hơn
  // Chỉ hiện loading ở khu vực sản phẩm thôi
  try {
    // 1. Load Navbar
    await loadNavbar({
      centerHTML: `
        <div class="nav-cat-btn" id="catBtn">
            <i class="fa-solid fa-bars"></i> <span>Danh mục</span>
            <div class="cat-dropdown" id="catDropdown"></div>
        </div>
        <div style="position:relative; flex:1;">
            <input type="text" class="nav-search-input" id="homeSearch" placeholder="Tìm sản phẩm, thương hiệu..." style="width:100%">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="homeSearchBtn"></i>
        </div>`,
    });

    // 2. Chạy Banner
    startBannerCarousel();

    // 3. Gọi API song song (cho nhanh)
    await Promise.all([fetchCategories(), renderHomeSections()]);

    // 4. Render danh mục lên navbar
    renderNavCategories();
    setupNavbarEvents();
  } catch (e) {
    console.error("Home Error:", e);
  }
});

// --- LOGIC BANNER TỰ ĐỘNG ---
function startBannerCarousel() {
  const slides = document.querySelectorAll(".banner-slide");
  const dots = document.querySelectorAll(".dot");
  if (slides.length === 0) return;

  let currentSlide = 0;

  // Hàm chuyển slide
  const showSlide = (index) => {
    slides.forEach((s) => s.classList.remove("active"));
    dots.forEach((d) => d.classList.remove("active"));

    currentSlide = index;
    if (currentSlide >= slides.length) currentSlide = 0;

    slides[currentSlide].classList.add("active");
    if (dots[currentSlide]) dots[currentSlide].classList.add("active");
  };

  // Tự động chạy mỗi 5s
  setInterval(() => {
    showSlide(currentSlide + 1);
  }, 5000);
}

// --- API DANH MỤC ---
async function fetchCategories() {
  try {
    const res = await callAPI("/categories", "GET", null);
    if (res && res.success && Array.isArray(res.data)) {
      apiCategories = res.data;
    } else {
      apiCategories = [
        { id: "an-vat", name: "Đồ ăn vặt" },
        { id: "nuoc-ngot", name: "Nước giải khát" },
      ];
    }
  } catch (e) {
    console.error(e);
  }
}

// --- RENDER SẢN PHẨM ---
async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;

  // Inject CSS Grid Responsive (PC 6 cột, Mobile 2 cột)
  if (!document.getElementById("homeGridStyle")) {
    const style = document.createElement("style");
    style.id = "homeGridStyle";
    style.innerHTML = `
          .home-product-grid { 
              display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; 
          }
          @media (max-width: 1200px) { .home-product-grid { grid-template-columns: repeat(4, 1fr); } }
          @media (max-width: 768px) { .home-product-grid { grid-template-columns: repeat(2, 1fr); } }
      `;
    document.head.appendChild(style);
  }

  // Gọi API lấy sản phẩm
  const res = await callAPI("/auth/products?page=0&size=12", "GET", null);
  container.innerHTML = ""; // Xóa loading

  if (res && res.success) {
    const list = res.data?.listData || [];
    if (list.length > 0) {
      container.insertAdjacentHTML(
        "beforeend",
        `
              <div class="category-section" style="background:white; padding:20px; border-radius:8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div class="section-header" style="border-bottom:1px solid #eee; margin-bottom:20px; padding-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                      <div class="section-title" style="color:#ee4d2d; font-weight:700; text-transform:uppercase; font-size:1.2rem; display:flex; align-items:center;">
                        <i class="fa-solid fa-fire-flame-curved" style="color:#ee4d2d; margin-right:8px; font-size:1.4rem;"></i> GỢI Ý HÔM NAY
                      </div>
                      <a href="../products/index.html" style="color:#ee4d2d; text-decoration:none; font-weight:500;">Xem tất cả <i class="fa-solid fa-chevron-right"></i></a>
                  </div>
                  
                  <div class="home-product-grid">
                      ${list.map((p) => createProductHTML(p)).join("")}
                  </div>
              </div>
          `
      );
    } else {
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Chưa có sản phẩm nào</div>`;
    }
  } else {
    container.innerHTML = `<div style="text-align:center; color:red; padding:20px;">Không tải được sản phẩm: ${res?.message}</div>`;
  }
}

// --- HTML CARD SẢN PHẨM ---
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  // Badge giảm giá
  let discountBadge = "";
  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    discountBadge = `
            <div style="position:absolute; top:0; right:0; background:rgba(255,212,36,.95); width:36px; height:32px; text-align:center; padding-top:2px; font-weight:700; font-size:0.7rem; z-index:2;">
                <span style="color:#ee4d2d;">${percent}%</span>
                <div style="color:white; text-transform:uppercase; font-size:0.6rem;">GIẢM</div>
                <div style="position:absolute; bottom:-4px; left:0; border-width:0 18px 4px; border-style:solid; border-color:transparent rgba(255,212,36,.95); width:0;"></div>
            </div>`;
  }

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${
          p.productId
        }'" 
             style="background:white; border:1px solid transparent; border-radius:4px; overflow:hidden; cursor:pointer; position:relative; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
            ${discountBadge}
            <div class="p-img" style="width:100%; padding-top:100%; position:relative;">
                <img src="${imgUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; transition: transform 0.3s ease;">
            </div>
            <div class="p-info" style="padding:10px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                <div class="p-name" title="${
                  p.productName
                }" style="font-size:0.9rem; color:#333; line-height:1.2rem; margin-bottom:5px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height:2.4rem;">
                    ${p.productName}
                </div>
                <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between;">
                    <span style="color:#ee4d2d; font-size:1rem; font-weight:600;">${priceFormatted}</span>
                    <span style="font-size:0.7rem; color:#888;">Đã bán 99+</span>
                </div>
                <div class="p-rating" style="font-size:0.65rem; color:#ffce3d; margin-top:4px;">
                    ${renderStars(p.ratingAvg || 0)}
                </div>
            </div>
            <style>.product-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; border: 1px solid #ee4d2d !important; }</style>
        </div>
    `;
}

function renderStars(rating) {
  if (!rating) rating = 0;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) html += '<i class="fa-solid fa-star"></i>';
    else if (i - 0.5 <= rating)
      html += '<i class="fa-solid fa-star-half-stroke"></i>';
    else html += '<i class="fa-regular fa-star" style="color:#d5d5d5"></i>';
  }
  return html;
}

// --- SỰ KIỆN NAVBAR ---
function setupNavbarEvents() {
  const catBtn = document.getElementById("catBtn");
  const catDropdown = document.getElementById("catDropdown");

  if (catBtn) {
    catBtn.onclick = (e) => {
      e.stopPropagation();
      catDropdown.classList.toggle("show");
    };
    document.addEventListener("click", () => {
      if (catDropdown) catDropdown.classList.remove("show");
    });
  }

  const searchInput = document.getElementById("homeSearch");
  const searchBtn = document.getElementById("homeSearchBtn");
  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q)
      window.location.href = `../products/index.html?search=${encodeURIComponent(
        q
      )}`;
  };
  if (searchBtn) searchBtn.onclick = doSearch;
  if (searchInput)
    searchInput.onkeypress = (e) => {
      if (e.key === "Enter") doSearch();
    };
}

function renderNavCategories() {
  const el = document.getElementById("catDropdown");
  if (!el) return;
  if (apiCategories.length === 0) {
    el.innerHTML = '<div style="padding:10px;">Đang tải...</div>';
    return;
  }

  el.innerHTML = apiCategories
    .map(
      (c) => `
        <a href="../products/index.html?cat=${c.id}" style="display:flex; align-items:center; gap:10px; padding:10px; color:#333; text-decoration:none; transition:0.2s;">
            <i class="fa-solid fa-caret-right" style="color:#999"></i> ${c.name}
        </a>
    `
    )
    .join("");
}
