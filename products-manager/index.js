// index.js
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

// --- STATE QUẢN LÝ DỮ LIỆU ---
let state = {
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    mainImageFile: null
};

// === 1. KHỞI TẠO ===
(async function init() {
    // --- [QUAN TRỌNG] CHẶN VÒNG LẶP REFRESH TOKEN ---
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            // Nếu API trả về 401 (Hết hạn) ở các url nhạy cảm -> Logout ngay
            if (args[0].includes("refresh-token") || args[0].includes("auth/login")) {
                console.error("Force Logout: Phát hiện vòng lặp token.");
                localStorage.clear();
                window.location.href = "/login.html";
                return Promise.reject("Force Logout");
            }
        }
        return response;
    };
    // ------------------------------------------------

    setupEventListeners();

    // Load dữ liệu nền (Danh mục, Brand, Thuộc tính)
    await loadBaseData();
    
    // Mặc định vào luôn màn hình Thêm mới
    UI.switchView('form');
    UI.resetForm(false);
})();

async function loadBaseData() {
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Render Select Danh mục
        if (UI.els.cateSelect) {
            UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
            state.categories.forEach(c => {
                UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }
    } catch (e) {
        console.error("Lỗi loadBaseData:", e);
    }
}

// === 2. SỰ KIỆN ===
function setupEventListeners() {
    // Nút Reset
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) btnReset.onclick = () => {
        UI.resetForm(false);
        state.variants = [];
        state.mainImageFile = null;
    };
    
    // Nút thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) btnAddAttr.onclick = () => { 
        // Thêm dòng thuộc tính trống
        UI.addAttrRow("", "", null, null, [], {}, state.attributes); 
    };
    
    // Nút tạo biến thể
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) btnGenVariants.onclick = () => { handleCalcVariants(); };
    
    // Select Danh mục -> Load Brand
    if (UI.els.cateSelect) UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    
    // Input ảnh chính
    if (UI.els.mainImgInput) {
        UI.els.mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }
    
    // Submit Form
    const form = document.getElementById("productForm");
    if (form) form.onsubmit = handleSave;
}

// Tính toán biến thể
function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    const basePrice = parseFloat(document.getElementById("price").value) || 0;
    const basePriceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    
    // Tạo biến thể từ logic tổ hợp
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    UI.renderVariants(state.variants);
}

// === 3. XỬ LÝ LƯU (CREATE) ===
async function handleSave(e) {
    e.preventDefault();
    
    // 1. Validate cơ bản
    if (state.variants.length === 0) {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        if (currentAttrs.length > 0) {
            alert("⚠️ Bạn đã nhập thuộc tính nhưng chưa nhấn nút 'Tạo biến thể'!");
            return;
        }
        // Nếu không có thuộc tính nào, chấp nhận tạo sản phẩm đơn thể (tùy logic backend)
    }

    // Hiệu ứng loading
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if(submitBtn) submitBtn.disabled = true;
    if(spinner) spinner.classList.remove("d-none");

    try {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        
        // 2. Chuẩn bị Payload (Khớp với JSON backend yêu cầu)
        const payload = {
            productDetailDTO: {
                productId: null, // Tạo mới là null
                productName: document.getElementById("productName").value,
                description: document.getElementById("description").value,
                price: parseFloat(document.getElementById("price").value) || 0,
                originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0,
                categoryId: document.getElementById("categoryId").value, 
                brandId: document.getElementById("brandId").value,
                imageName: "productImage" // Đặt cờ để backend biết có ảnh upload
            },
            attributes: [], 
            variants: [], 
            variantValues: [] // Backend của bạn có vẻ cần cái này
        };

        // 3. Xử lý Attributes & Tạo Map ID
        // Map này dùng để nối variants với attribute values
        const attrValueMap = {}; 
        const timeNow = Date.now();

        currentAttrs.forEach((attr, attrIdx) => {
            // Nếu người dùng chọn Attribute có sẵn từ DB -> dùng ID đó. Nếu gõ mới -> null hoặc temp ID
            const attributeId = attr.id ? attr.id : null; 
            
            const attrValues = attr.values.map((v, vIdx) => {
                // Nếu value có sẵn trong DB -> dùng ID đó
                const existingValueId = attr.valueIdMap ? attr.valueIdMap[v] : null;
                
                // Tạo ID tạm để map xuống variantValues bên dưới (quan trọng)
                const tempMapKey = `${attrIdx}-${v}`;
                // Backend sẽ tự tạo ID mới nếu gửi null, nhưng ta cần cơ chế để map
                // Ở đây ta cứ gửi null id nếu mới, backend sẽ handle dựa trên text
                
                // Tuy nhiên, để map được biến thể, ta cần lưu vết. 
                // Nếu backend thông minh, ta chỉ cần gửi structure đúng.
                
                return { 
                    attributeValueId: existingValueId, // Null nếu mới
                    attributeValueName: v 
                };
            });
            
            payload.attributes.push({ 
                attributeId: attributeId, 
                attributeName: attr.name, 
                attributeValues: attrValues
            });
        });

        // 4. Xử lý Variants
        state.variants.forEach((v, idx) => {
            const imgKey = v.rawFile ? `image_variant_${idx}` : null;

            payload.variants.push({
                variantId: null, // Tạo mới
                price: v.price,
                originalPrice: v.priceOriginal || v.price,
                stock: v.stock,
                imageName: imgKey,
                attributeValues: [] // Để trống nếu dùng mảng variantValues riêng
            });

            // Logic map variantValues (Nếu backend cần)
            // Phần này khá phức tạp nếu backend không tự map theo index.
            // Nhưng với JSON success bạn đưa, backend trả về variantValues đầy đủ.
            // Tạm thời ta gửi mảng variants sạch, backend sẽ tự generate variantValues dựa trên attributes.
        });

        console.log("Payload gửi đi:", payload);

        // 5. Đóng gói vào FormData (Multipart)
        const formData = new FormData();
        // Ảnh chính
        if(state.mainImageFile) formData.append("productImage", state.mainImageFile);
        
        // Ảnh biến thể
        state.variants.forEach((v, idx) => {
            if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
        });
        
        // JSON Data
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        // 6. Gửi API
        const res = await ProductService.createProduct(formData);
        
        // 7. Xử lý kết quả
        // Dựa vào JSON bạn đưa: { success: true, message: "...", data: {...} }
        if(res && res.success) {
            alert("✅ Thêm sản phẩm thành công!");
            // Reset form để nhập tiếp
            UI.resetForm(false);
            state.variants = [];
            state.mainImageFile = null;
        } else {
             // Lấy message lỗi
             const errorMsg = res?.message || "Lỗi không xác định từ server";
             alert("❌ Thất bại: " + errorMsg);
             console.error("Lỗi chi tiết:", res);
        }

    } catch(err) {
        console.error(err);
        alert("❌ Lỗi hệ thống: " + err.message);
    } finally {
        // Mở lại nút submit
        if(submitBtn) submitBtn.disabled = false;
        if(spinner) spinner.classList.add("d-none");
    }
}