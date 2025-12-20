// index.js
import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

// --- STATE QUẢN LÝ DỮ LIỆU ---
let state = {
    products: [],
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    mainImageFile: null,
    isEdit: false,
    currentId: null,
    currentMainImageUrl: "" 
};

// === 1. KHỞI TẠO ===
(async function init() {
    // 1. Load các dữ liệu nền (Danh mục, Brand, Attribute) trước
    await loadBaseData();
    
    // 2. Kiểm tra URL xem có ID sản phẩm cần sửa không?
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // ==> CÓ ID: Chuyển sang chế độ SỬA
        console.log("Phát hiện ID từ URL:", productId);
        await window.editProduct(productId);
        // Cập nhật tiêu đề nếu có element hiển thị tiêu đề
        const titleEl = document.querySelector("#createView h2");
        if(titleEl) titleEl.innerText = "Cập Nhật Sản Phẩm";
    } else {
        // ==> KHÔNG CÓ ID: Chế độ THÊM MỚI
        console.log("Không có ID, chế độ tạo mới");
        UI.resetForm(false);
    }
    
    setupEventListeners();
    setupGlobalFunctions();
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

        if (UI.els.cateSelect) {
            UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
            state.categories.forEach(c => {
                UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }
    } catch (e) {
        console.error("Lỗi reloadData:", e);
    }
}

// === 2. SỰ KIỆN ===
function setupEventListeners() {
    // Nút Reset
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) btnReset.onclick = () => UI.resetForm(state.isEdit); 
    
    // Nút thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) btnAddAttr.onclick = () => { UI.addAttrRow("", "", null, null, [], {}, state.attributes); };
    
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

// === 3. HÀM GLOBAL ===
function setupGlobalFunctions() {
    window.editProduct = async (id) => {
        const fullData = await ProductService.getProductById(id);
        if (!fullData || !fullData.productDetailDTO) {
            alert("Không tìm thấy dữ liệu sản phẩm!");
            return;
        }

        const detail = fullData.productDetailDTO;
        const attributes = fullData.attributes || [];
        const variants = fullData.variants || [];
        const variantValues = fullData.variantValues || [];

        // Setup State
        state.isEdit = true;
        state.currentId = id;
        state.variants = []; 
        state.mainImageFile = null;
        state.currentMainImageUrl = detail.imageName || ""; // Lưu key ảnh cũ
        
        UI.resetForm(true);
        // Nếu bạn dùng cơ chế ẩn hiện list/form thì cần switch view ở đây
        // UI.switchView('form'); 
        
        // Điền thông tin cơ bản
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
        
        setVal("productName", detail.productName);
        setVal("description", detail.description || "");
        setVal("price", detail.price);
        setVal("priceOriginal", detail.originalPrice); // Lấy từ DB đổ vào Input
        
        if(UI.els.cateSelect) {
            UI.els.cateSelect.value = detail.categoryId;
            UI.renderBrands(state.brands, detail.categoryId, detail.brandId);
        }
        
        if(detail.imageUrl) UI.renderMainImage(detail.imageUrl);
        else if(detail.imageName) UI.renderMainImage(`/images/${detail.imageName}`);

        // KHÔI PHỤC THUỘC TÍNH
        attributes.forEach(attr => {
            const valuesString = attr.attributeValues
                .map(v => v.attributeValueName)
                .join(", ");

            const valueIdMap = {};
            attr.attributeValues.forEach(v => {
                valueIdMap[v.attributeValueName] = v.attributeValueId;
            });

            UI.addAttrRow(
                attr.attributeName, 
                valuesString, 
                null, 
                attr.attributeId, 
                [], 
                valueIdMap, 
                state.attributes 
            );
        });

        // KHÔI PHỤC BIẾN THỂ
        state.variants = variants.map(v => {
            const relatedValues = variantValues.filter(vv => vv.variantId === v.variantId);
            const comboValues = attributes.map(attr => {
                const match = attr.attributeValues.find(av => 
                    relatedValues.some(rv => rv.attributeValueId === av.attributeValueId)
                );
                return match ? match.attributeValueName : "?";
            });

            return {
                id: v.variantId,
                name: comboValues.join(" - "), 
                comboValues: comboValues,
                price: v.price,
                priceOriginal: v.originalPrice, // Map đúng key trả về từ server
                stock: v.stock,
                imageName: v.imageName || "",
                imageUrl: v.imageUrl || "", 
                previewUrl: v.imageUrl || "",
                rawFile: null
            };
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

    window.updateVar = (i, field, value) => {
        if(state.variants[i]) state.variants[i][field] = value;
    };

    window.removeVariant = (i) => {
        state.variants.splice(i, 1);
        UI.renderVariants(state.variants);
    };

    window.applyBulkInfo = () => {
        const pOrg = document.getElementById("bulk_price_org")?.value;
        const pSell = document.getElementById("bulk_price")?.value;
        const stock = document.getElementById("bulk_stock")?.value;
        if (!pOrg && !pSell && !stock) return;
        state.variants.forEach(v => {
            if (pOrg) v.priceOriginal = parseFloat(pOrg);
            if (pSell) v.price = parseFloat(pSell);
            if (stock) v.stock = parseInt(stock);
        });
        UI.renderVariants(state.variants);
    };
}

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    const basePrice = parseFloat(document.getElementById("price").value) || 0;
    const basePriceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    UI.renderVariants(state.variants);
}

// === 4. LOGIC SAVE (ĐÃ FIX: priceOriginal -> originalPrice) ===
async function handleSave(e) {
    e.preventDefault();
    
    // B1: Lấy thông tin thuộc tính
    const currentAttrs = VariantLogic.parseAttributesFromDOM();

    if (currentAttrs.length > 0 && state.variants.length === 0) {
        alert("⚠️ Bạn chưa tạo biến thể! Nhấn nút 'Tạo biến thể' trước.");
        return; 
    }

    // B2: Chuẩn bị Payload
    // SỬA: Đổi tên key từ priceOriginal -> originalPrice
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("productName").value,
            description: document.getElementById("description").value,
            price: parseFloat(document.getElementById("price").value) || 0,
            originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0, // <--- SỬA TẠI ĐÂY
            categoryId: document.getElementById("categoryId").value, 
            brandId: document.getElementById("brandId").value,
            imageName: "productImage" 
        },
        attributes: [], 
        variants: [], 
        variantValues: []
    };

    // B3: Xử lý Attributes và tạo Map ID
    const attrValueMap = {}; 
    const timeNow = Date.now();

    currentAttrs.forEach((attr, attrIdx) => {
        const attributeId = attr.id ? attr.id : `attr_${timeNow}_${attrIdx}`;
        const attrValues = attr.values.map((v, vIdx) => {
            const existingValueId = attr.valueIdMap[v];
            const finalValueId = existingValueId ? existingValueId : `val_${timeNow}_${attrIdx}_${vIdx}`;
            attrValueMap[`${attrIdx}-${v}`] = finalValueId;
            return { 
                attributeValueId: finalValueId,
                attributeValueName: v 
            };
        });
        payload.attributes.push({ 
            attributeId: attributeId, 
            attributeName: attr.name, 
            attributeValues: attrValues
        });
    });

    // B4: Xử lý Variants
    state.variants.forEach((v, idx) => {
        const variantTempId = state.isEdit && v.id && !v.id.toString().startsWith("new_") 
            ? v.id // Nếu sửa và có ID cũ thì dùng ID cũ
            : `var_${timeNow}_${idx}`; // Nếu mới thì tạo temp ID
            
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;

        // SỬA: Đổi tên key từ priceOriginal -> originalPrice
        payload.variants.push({
            variantId: variantTempId,
            price: v.price,
            originalPrice: v.priceOriginal || v.price, // <--- SỬA TẠI ĐÂY
            stock: v.stock,
            imageName: imgKey,
            attributeValues: [] 
        });

        // Link variantValues
        v.comboValues.forEach((val, valIdx) => {
            const valueId = attrValueMap[`${valIdx}-${val}`];
            if (valueId) {
                payload.variantValues.push({
                    variantId: variantTempId,
                    attributeValueId: valueId
                });
            }
        });
    });

    // B5: Đóng gói FormData
    const formData = new FormData();
    if(state.mainImageFile) formData.append("productImage", state.mainImageFile);
    
    state.variants.forEach((v, idx) => {
        if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    console.log("=== FINAL PAYLOAD (FIXED ORIGINAL PRICE) ===", JSON.stringify(payload, null, 2));

    // B6: Gửi API
    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            alert("Thành công!");
            // Nếu muốn reload lại trang hiện tại để thấy cập nhật:
            window.location.reload();
        } else {
             const errorMsg = res?.message || "Lỗi server";
             alert("Lỗi: " + errorMsg);
        }
    } catch(err) {
        console.error(err);
        alert("Lỗi hệ thống: " + err.message);
    }
}