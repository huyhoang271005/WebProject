// index.js
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

let state = {
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    mainImageFile: null,
    products: []
};

// ========== KHỞI TẠO ==========
(async function init() {
    console.log("🚀 Khởi động hệ thống...");
    
    // Chặn vòng lặp refresh token (Giữ nguyên logic cũ của bạn)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            if (args[0].includes("refresh-token") || args[0].includes("auth/login")) {
                console.error("❌ Force Logout");
                localStorage.clear();
                window.location.href = "/login.html";
                return Promise.reject("Force Logout");
            }
        }
        return response;
    };

    setupEventListeners();
    await loadBaseData();
    
    // Mặc định vào màn hình form
    UI.switchView('form');
    UI.resetForm(false);
    
    console.log("✅ Hệ thống đã sẵn sàng!");
})();

// ========== TẢI DỮ LIỆU NỀN ==========
async function loadBaseData() {
    console.log("📦 Bắt đầu tải dữ liệu nền...");
    
    // 1. Load Categories
    try {
        const categories = await ProductService.getCategories();
        state.categories = categories;
        console.log("✅ Categories:", state.categories.length);
        UI.renderCategories(state.categories);
    } catch (e) {
        console.error("❌ Lỗi load categories:", e);
        state.categories = [];
    }
    
    // 2. Load Brands
    try {
        const brands = await ProductService.getBrands();
        state.brands = brands;
        UI.renderBrands(state.brands, "");
    } catch (e) {
        console.error("❌ Lỗi load brands:", e);
        state.brands = [];
    }
    
    // 3. Load Attributes
    try {
        const attributes = await ProductService.getAttributes();
        state.attributes = attributes;
        console.log("✅ Attributes:", state.attributes.length);
    } catch (e) {
        console.error("❌ Lỗi load attributes:", e);
        state.attributes = [];
    }
    
    console.log("📦 Hoàn tất tải dữ liệu!");
}

// ========== THIẾT LẬP SỰ KIỆN ==========
function setupEventListeners() {
    // Nút reset
    const btnReset = document.getElementById("resetBtn");
    if (btnReset) {
        btnReset.onclick = () => {
            UI.resetForm(false);
            state.variants = [];
            state.mainImageFile = null;
        };
    }
    
    // Nút thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => {
            UI.addAttrRow("", "", state.attributes);
        };
    }
    
    // Nút tạo biến thể
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) {
        btnGenVariants.onclick = () => {
            handleGenerateVariants();
        };
    }
    
    // Khi chọn category -> Lọc lại brands
    const cateSelect = document.getElementById("categoryId");
    if (cateSelect) {
        cateSelect.onchange = (e) => {
            const selectedCateId = e.target.value;
            console.log("📌 Đã chọn category:", selectedCateId);
            UI.renderBrands(state.brands, selectedCateId);
        };
    }
    
    // Upload ảnh chính
    const mainImgInput = document.getElementById("mainImage");
    if (mainImgInput) {
        mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
                console.log("📷 Đã chọn ảnh chính:", file.name);
            }
        };
    }
    
    // Submit form
    const form = document.getElementById("productForm");
    if (form) {
        form.onsubmit = handleSubmit;
    }
}

// ========== XỬ LÝ TẠO BIẾN THỂ ==========
function handleGenerateVariants() {
    console.log("🔄 Tạo biến thể...");
    
    const attrs = VariantLogic.parseAttributesFromDOM();
    console.log("📋 Attributes parsed:", attrs);
    
    if (attrs.length === 0) {
        alert("Vui lòng thêm ít nhất 1 thuộc tính!");
        return;
    }
    
    const basePrice = parseFloat(document.getElementById("price").value) || 0;
    const basePriceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    
    console.log("✅ Đã tạo", state.variants.length, "biến thể");
    UI.renderVariants(state.variants);
}

// ========== XỬ LÝ SUBMIT (ĐÃ SỬA LỖI LOGIC TẠI ĐÂY) ==========
async function handleSubmit(e) {
    e.preventDefault();
    
    console.log("📤 Bắt đầu submit...");
    
    // Validate
    const productName = document.getElementById("productName").value.trim();
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;
    const price = parseFloat(document.getElementById("price").value) || 0;
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    
    if (!productName) {
        alert("Vui lòng nhập tên sản phẩm!");
        return;
    }
    
    if (!categoryId) {
        alert("Vui lòng chọn danh mục!");
        return;
    }
    
    if (!brandId) {
        alert("Vui lòng chọn thương hiệu!");
        return;
    }
    
    if (!state.mainImageFile) {
        alert("Vui lòng chọn ảnh chính!");
        return;
    }
    
    // Lấy thông tin thuộc tính hiện tại để mapping
    const currentAttrs = VariantLogic.parseAttributesFromDOM();
    
    // Nếu có attributes nhưng chưa tạo variants
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        alert("Vui lòng nhấn 'Tạo biến thể' trước khi lưu!");
        return;
    }
    
    // Disable button
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove("d-none");
    
    try {
        const payload = {
            productDetailDTO: {
                productId: null,
                productName: productName,
                description: document.getElementById("description").value || "",
                price: price,
                originalPrice: priceOriginal,
                categoryId: categoryId,
                brandId: brandId,
                imageName: "productImage"
            },
            attributes: [],
            variants: [],
            variantValues: [] // Có thể backend không dùng, nhưng giữ lại cho đúng struct
        };
        
        // 1. Parse attributes
        currentAttrs.forEach(attr => {
            const attributeValues = attr.values.map(valueName => ({
                attributeValueId: attr.valueIdMap?.[valueName] || null,
                attributeValueName: valueName
            }));
            
            payload.attributes.push({
                attributeId: attr.id,
                attributeName: attr.name,
                attributeValues: attributeValues
            });
        });
        
        // 2. Parse variants & Fix lỗi "Missing attribute values"
        state.variants.forEach((variant, idx) => {
            const imgKey = variant.rawFile ? `image_variant_${idx}` : null;
            
            // LOGIC MỚI: Map từng giá trị trong comboValues về đúng attributeId
            // variant.comboValues: ["Đỏ", "XL"]
            // currentAttrs: [{id: 10, name: "Màu"}, {id: 11, name: "Size"}]
            
            const mappedAttributeValues = variant.comboValues.map((valName, valIndex) => {
                const parentAttr = currentAttrs[valIndex]; // Tìm thuộc tính cha tương ứng vị trí
                return {
                    attributeId: parentAttr.id,          // ID của thuộc tính (VD: 10)
                    attributeValueName: valName,         // Giá trị (VD: Đỏ)
                    attributeValueId: parentAttr.valueIdMap?.[valName] || null // ID giá trị nếu có
                };
            });

            payload.variants.push({
                variantId: null,
                price: variant.price,
                originalPrice: variant.priceOriginal,
                stock: variant.stock,
                imageName: imgKey,
                attributeValues: mappedAttributeValues // ✅ Gửi object đầy đủ thay vì mảng string
            });
        });
        
        console.log("📦 Payload đã fix:", payload);
        
        // Build FormData
        const formData = new FormData();
        
        // Append ảnh chính
        formData.append("productImage", state.mainImageFile);
        
        // Append ảnh variants
        state.variants.forEach((variant, idx) => {
            if (variant.rawFile) {
                formData.append(`image_variant_${idx}`, variant.rawFile);
            }
        });
        
        // Append JSON payload
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));
        
        // Call API
        const response = await ProductService.createProduct(formData);
        
        console.log("📥 Response:", response);
        
        if (response && response.success) {
            alert("✅ Tạo sản phẩm thành công!");
            UI.resetForm(false);
            state.variants = [];
            state.mainImageFile = null;
        } else {
            alert("❌ Lỗi: " + (response?.message || "Không xác định"));
        }
        
    } catch (error) {
        console.error("❌ Lỗi submit:", error);
        alert("❌ Lỗi hệ thống: " + error.message);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add("d-none");
    }
}

// ========== GLOBAL FUNCTIONS ==========
window.applyBulkInfo = () => {
    const priceOrg = document.getElementById("bulk_price_org")?.value;
    const price = document.getElementById("bulk_price")?.value;
    const stock = document.getElementById("bulk_stock")?.value;
    
    state.variants.forEach(v => {
        if (priceOrg) v.priceOriginal = parseFloat(priceOrg);
        if (price) v.price = parseFloat(price);
        if (stock) v.stock = parseInt(stock);
    });
    
    UI.renderVariants(state.variants);
};

window.handleSelectVariantImage = (index, input) => {
    const file = input.files[0];
    if (file && state.variants[index]) {
        state.variants[index].rawFile = file;
        state.variants[index].previewUrl = URL.createObjectURL(file);
        UI.renderVariants(state.variants);
    }
};

window.updateVar = (index, field, value) => {
    if (state.variants[index]) {
        state.variants[index][field] = field === 'stock' ? parseInt(value) : parseFloat(value);
    }
};

window.removeVariant = (index) => {
    state.variants.splice(index, 1);
    UI.renderVariants(state.variants);
};