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
    editingProductId: null // Lưu ID sản phẩm đang sửa
};

(async function init() {
    setupEventListeners();
    await loadBaseData(); 

    // Kiểm tra URL xem có phải đang sửa sản phẩm không
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        state.editingProductId = productId;
        await loadProductDetail(productId);
    } else {
        UI.switchView('list');
    }
})();

async function loadBaseData() {
    try {
        state.categories = await ProductService.getCategories() || [];
        state.brands = await ProductService.getBrands() || [];
        state.attributes = await ProductService.getAttributes() || [];

        // Render Category Select
        const cateSelect = document.getElementById("categoryId");
        if(cateSelect) {
            cateSelect.innerHTML = `<option value="">-- Chon danh muc --</option>` + 
                state.categories.map(c => `<option value="${c.categoryId}">${c.categoryName}</option>`).join('');
        }
        
        // Render Brand ban đầu (full)
        UI.renderBrands(state.brands);
    } catch (e) {
        console.error("Loi tai du lieu nen:", e);
    }
}

async function loadProductDetail(id) {
    try {
        UI.switchView('form');
        document.querySelector("#createView h2").innerText = "Chinh sua san pham";
        
        const res = await ProductService.getProductById(id);
        if (res && res.data) {
            // 1. Dùng Logic để chuyển JSON API thành cấu trúc phẳng
            const parsedData = VariantLogic.mapResponseToState(res.data);
            
            // Cập nhật state variants
            state.variants = parsedData.variants;

            // 2. Điền dữ liệu vào Form
            UI.fillForm(parsedData, state.attributes);

            // 3. Xử lý riêng cho Brand (vì phụ thuộc category)
            const currentCateId = parsedData.product.categoryId;
            const currentBrandId = parsedData.product.brandId;
            // Render lại dropdown brand chỉ chứa brand thuộc category đó
            UI.renderBrands(state.brands, currentCateId, currentBrandId);
        }
    } catch (err) {
        console.error(err);
        alert("Khong the tai thong tin san pham!");
    }
}

function setupEventListeners() {
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) btnReset.onclick = () => { 
        UI.resetForm(false); 
        state.variants = []; 
        state.mainImageFile = null; 
        state.editingProductId = null;
        window.history.pushState({}, document.title, window.location.pathname); // Xóa param ID trên URL
    };
    
    // Nút mở form tạo mới từ list
    const btnOpenCreate = document.getElementById("btnOpenCreate");
    if (btnOpenCreate) btnOpenCreate.onclick = () => {
        UI.switchView('form');
        UI.resetForm(false);
        state.variants = [];
        state.editingProductId = null;
    };

    const btnBack = document.getElementById("btnBackToList");
    if (btnBack) btnBack.onclick = () => UI.switchView('list');

    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) btnAddAttr.onclick = () => { 
        // Thêm dòng trắng, truyền list attributes hệ thống vào để render select
        UI.addAttrRow("", "", null, null, {}, state.attributes); 
    };
    
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) btnGenVariants.onclick = () => { handleCalcVariants(); };
    
    // Khi chọn danh mục -> Lọc lại Brand
    const cateSelect = document.getElementById("categoryId");
    if (cateSelect) {
        cateSelect.onchange = (e) => {
            UI.renderBrands(state.brands, e.target.value);
        };
    }
    
    const mainImgInput = document.getElementById("mainImage");
    if (mainImgInput) {
        mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }
    
    const form = document.getElementById("productForm");
    if (form) form.onsubmit = handleSave;
}

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    const basePrice = parseFloat(document.getElementById("price").value) || 0;
    const basePriceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    
    // Tạo variants mới, nhưng truyền state.variants cũ vào để giữ lại ID nếu trùng tên
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    UI.renderVariants(state.variants);
}

async function handleSave(e) {
    e.preventDefault();
    
    // Validate cơ bản
    if (state.variants.length === 0) {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        if (currentAttrs.length > 0) return alert("Vui long nhan nut 'Tao bien the' truoc khi luu!");
    }

    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if(submitBtn) submitBtn.disabled = true;
    if(spinner) spinner.classList.remove("d-none");

    try {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        
        // Chuẩn bị payload
        const payload = {
            productDetailDTO: {
                productId: state.editingProductId || null, // Nếu null server sẽ hiểu là tạo mới
                productName: document.getElementById("productName").value,
                description: document.getElementById("description").value,
                price: parseFloat(document.getElementById("price").value) || 0,
                originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0,
                categoryId: document.getElementById("categoryId").value, 
                brandId: document.getElementById("brandId").value,
                imageName: "productImage"
            },
            attributes: [], 
            variants: [], 
            variantValues: [] // Có thể server tự generate cái này, tùy logic BE
        };

        // Build Attributes List
        currentAttrs.forEach((attr) => {
            const attributeId = attr.id ? attr.id : null; 
            const attrValues = attr.values.map((v) => ({ 
                // Tìm ID trong map nếu có (logic sửa), ko thì null (logic mới)
                attributeValueId: attr.valueIdMap ? attr.valueIdMap[v] : null,
                attributeValueName: v 
            }));
            payload.attributes.push({ attributeId, attributeName: attr.name, attributeValues: attrValues });
        });

        // Build Variants List
        state.variants.forEach((v, idx) => {
            const imgKey = v.rawFile ? `image_variant_${idx}` : null;
            payload.variants.push({
                variantId: v.id || null, // ID nếu sửa, null nếu mới
                price: v.price,
                originalPrice: v.priceOriginal,
                stock: v.stock,
                imageName: imgKey, // Key để map với FormData bên dưới
                attributeValues: [] // Backend của bạn có thể cần hoặc tự map dựa trên tên variant
            });
        });

        // Đóng gói FormData
        const formData = new FormData();
        if(state.mainImageFile) formData.append("productImage", state.mainImageFile);
        
        state.variants.forEach((v, idx) => { 
            if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile); 
        });
        
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        // Gọi API (Tùy chỉnh: Nếu có editingProductId thì gọi PUT, không thì POST)
        // Hiện tại dùng chung createProduct như code cũ của bạn
        // Nếu backend phân tách, hãy check: if (state.editingProductId) update... else create...
        const res = await ProductService.createProduct(formData);
        
        if(res && (res.success || res.status === 200)) {
            alert("Thanh cong!");
            window.location.href = "index.html"; // Quay về danh sách
        } else {
             alert("Loi: " + (res?.message || "Server error"));
        }

    } catch(err) {
        console.error(err);
        alert("Loi he thong: " + err.message);
    } finally {
        if(submitBtn) submitBtn.disabled = false;
        if(spinner) spinner.classList.add("d-none");
    }
}

// Global functions cho bảng variants
window.applyBulkInfo = () => {
    const pOrg = document.getElementById("bulk_price_org")?.value;
    const pSell = document.getElementById("bulk_price")?.value;
    const stock = document.getElementById("bulk_stock")?.value;
    state.variants.forEach(v => {
        if (pOrg) v.priceOriginal = parseFloat(pOrg);
        if (pSell) v.price = parseFloat(pSell);
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

window.updateVar = (i, field, value) => { if(state.variants[i]) state.variants[i][field] = value; };
window.removeVariant = (i) => { state.variants.splice(i, 1); UI.renderVariants(state.variants); };