import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js"; // Đảm bảo đúng tên file export
import { UI } from "./ui.js";

let state = {
    products: [],
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    currentAttributes: [],
    isEdit: false,
    currentId: null,
    mainImageFile: null,
    currentMainImageName: ""
};

// === 1. KHỞI TẠO ===
(async function init() {
    // Gắn các hàm global ngay lập tức để tránh lỗi "is not defined"
    setupGlobalFunctions();
    
    // Tải dữ liệu
    await reloadData();
    
    // Gắn sự kiện click, submit
    setupEventListeners();
})();

// === 2. TẢI DỮ LIỆU (SỬA LỖI REFRESH TOKEN 6 LẦN) ===
async function reloadData() {
    try {
        // QUAN TRỌNG: Gọi từng API một (await từng dòng) thay vì Promise.all
        // Để nếu token hết hạn, API đầu tiên sẽ refresh xong xuôi rồi mới đến API sau.
        
        const prods = await ProductService.getAll();
        const cats = await ProductService.getCategories();
        const brands = await ProductService.getBrands();
        const attrs = await ProductService.getAttributes();

        state.products = prods || [];
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Render giao diện
        UI.renderTable(state.products);
        
        // Render dropdown danh mục
        if (UI.els.cateSelect) {
            UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
            state.categories.forEach(c => {
                UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }
    } catch (e) {
        console.error("Lỗi tải dữ liệu:", e);
        // Nếu lỗi 401/403 quá nặng, có thể redirect về login
        // window.location.href = '../auth/login.html'; 
    }
}

// === 3. SỰ KIỆN ===
function setupEventListeners() {
    // Helper lấy element an toàn
    const getEl = (id) => document.getElementById(id);

    const btnAdd = getEl("btnOpenAdd");
    if (btnAdd) {
        btnAdd.onclick = () => {
            state.isEdit = false;
            state.currentId = null;
            state.variants = [];
            state.mainImageFile = null;
            state.currentMainImageName = "";
            state.currentAttributes = [];
            
            UI.resetForm(false);
            // Thêm 1 dòng thuộc tính trống
            UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
            UI.switchView('form');
        };
    }

    const btnBack = getEl("btnBack");
    if (btnBack) {
        btnBack.onclick = () => {
            UI.switchView('list');
            reloadData();
        };
    }

    const btnAddAttr = getEl("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => {
            UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
        };
    }

    if (UI.els.cateSelect) {
        UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    }

    const mainImgInput = getEl("mainImgInput");
    if (mainImgInput) {
        mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }

    const form = getEl("productForm");
    if (form) form.onsubmit = handleSave;
}

// === 4. CÁC HÀM XỬ LÝ (GLOBAL) ===
function setupGlobalFunctions() {
    // Sửa lỗi "handleDelete is not defined"
    window.deleteProduct = async (id) => {
        await showDialog("question", "Bạn có chắc muốn xóa?", async () => {
            try {
                const res = await ProductService.delete ? await ProductService.delete(id) : { success: false, message: "Service thiếu hàm delete" };
                if (res && res.success) {
                    await showDialog("success", "Đã xóa thành công");
                    reloadData();
                } else {
                    await showDialog("error", "Lỗi xóa: " + (res?.message || "Unknown"));
                }
            } catch (e) {
                await showDialog("error", "Lỗi server: " + e.message);
            }
        });
    };

    window.editProduct = (id) => {
        const product = state.products.find(p => p.productId === id);
        if (product) loadAndOpenForm(product);
    };

    window.handleSelectVariantImage = (index, input) => {
        const file = input.files[0];
        if (file && state.variants[index]) {
            state.variants[index].rawFile = file;
            state.variants[index].previewUrl = URL.createObjectURL(file);
            state.variants[index].imageName = file.name;
            UI.renderVariants(state.variants);
        }
    };

    window.updateVar = (i, f, v) => {
        if (state.variants[i]) state.variants[i][f] = v;
    };
    
    window.updateVarOriginalPrice = (i, v) => {
        if (state.variants[i]) state.variants[i].priceOriginal = v;
    };

    window.removeVariant = (i) => {
        state.variants.splice(i, 1);
        UI.renderVariants(state.variants);
    };
}

function loadAndOpenForm(product) {
    state.isEdit = true;
    state.currentId = product.productId;
    state.variants = [];
    state.currentAttributes = [];
    state.mainImageFile = null;
    state.currentMainImageName = product.imageName || "";

    UI.resetForm(true);
    UI.fillForm(product);
    UI.renderBrands(state.brands, product.categoryId, product.brandId);

    // Map lại attributes cũ lên UI
    if (product.attributes?.length) {
        product.attributes.forEach(attr => {
            const valStr = attr.attributeValues.map(v => v.attributeValueName).join(", ");
            const valueIdMap = {};
            const valueIds = [];
            attr.attributeValues.forEach(v => {
                valueIdMap[v.attributeValueName] = v.attributeValueId;
                valueIds.push(v.attributeValueId);
            });

            UI.addAttrRow(
                attr.attributeName,
                valStr,
                handleCalcVariants,
                attr.attributeId,
                valueIds,
                valueIdMap,
                state.attributes
            );
        });

        // Map Variants
        state.variants = (product.variants || []).map(v => ({
            id: v.variantId,
            name: "Đang tải...", // Sẽ được tính lại bởi handleCalcVariants
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: v.imageName,
            previewUrl: v.imageUrl || (v.imageName ? `http://localhost:8080/images/${v.imageName}` : "")
        }));
        
        // Tính lại tên variant
        handleCalcVariants();
    }
    
    UI.switchView('form');
}

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    state.currentAttributes = attrs;
    
    const priceEl = document.getElementById("prodPrice");
    const basePrice = priceEl ? (parseFloat(priceEl.value) || 0) : 0;
    
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}

// === 5. XỬ LÝ LƯU (FIX LỖI NULL KEY) ===
async function handleSave(e) {
    e.preventDefault();

    const getVal = (id) => document.getElementById(id)?.value || "";
    
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: getVal("prodName"),
            description: getVal("prodDesc"),
            price: parseFloat(getVal("prodPrice")) || 0,
            priceOriginal: parseFloat(getVal("prodOriginalPrice")) || 0,
            categoryId: getVal("prodCate"),
            brandId: getVal("prodBrand"),
            imageName: state.currentMainImageName
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // --- FIX QUAN TRỌNG: Dùng ID chuỗi (dummy) thay vì null để tránh lỗi Backend ---
    state.currentAttributes.forEach((attr, idx) => {
        // Nếu là mới -> Dùng "attr_timestamp_index" để backend không bị null key
        const attrId = attr.id || `attr_${Date.now()}_${idx}`;
        
        const attributeValues = attr.values.map((valName, valIdx) => {
            const valId = attr.valueIdMap?.[valName] || `val_${Date.now()}_${idx}_${valIdx}`;
            
            // Cập nhật lại map để dùng cho variants
            if (!attr.valueIdMap) attr.valueIdMap = {};
            attr.valueIdMap[valName] = valId;

            return {
                attributeValueId: valId,
                attributeValueName: valName
            };
        });

        payload.attributes.push({
            attributeId: attrId,
            attributeName: attr.name, // Thêm tên attribute
            attributeValues: attributeValues
        });
    });

    state.variants.forEach((v, idx) => {
        const varId = (v.id && !v.id.toString().startsWith("new_")) 
            ? v.id 
            : `var_${Date.now()}_${idx}`;

        let finalImageName = v.imageName || "";
        if (v.rawFile) {
            const fName = v.rawFile.name;
            finalImageName = fName.substring(0, fName.lastIndexOf('.')) || fName;
        }

        payload.variants.push({
            variantId: varId,
            imageName: finalImageName,
            price: parseFloat(v.price) || 0,
            priceOriginal: parseFloat(v.priceOriginal) || parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0
        });

        if (v.comboValues) {
            v.comboValues.forEach(valName => {
                const attr = state.currentAttributes.find(a => a.values.includes(valName));
                if (attr && attr.valueIdMap && attr.valueIdMap[valName]) {
                    payload.variantValues.push({
                        variantId: varId,
                        attributeValueId: attr.valueIdMap[valName]
                    });
                }
            });
        }
    });

    // FormData
    const formData = new FormData();
    
    // Main Image
    if (state.mainImageFile) {
        const fName = state.mainImageFile.name;
        payload.productDetailDTO.imageName = fName.substring(0, fName.lastIndexOf('.')) || fName;
        formData.append("images", state.mainImageFile);
    }
    
    // Variant Images
    state.variants.forEach((v, idx) => {
        if (v.rawFile) {
             // Backend bạn có thể cần key cụ thể hoặc chung là "images"
             // Ở đây gửi chung vào mảng images, backend cần map theo tên file
            formData.append("images", v.rawFile);
        }
    });

    // JSON Blob
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob);

    try {
        const res = await ProductService.save(formData);
        if (res && res.success) {
            await showDialog("success", "Lưu thành công!");
            UI.switchView('list');
            reloadData();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra");
        }
    } catch (e) {
        console.error(e);
        await showDialog("error", "Lỗi kết nối: " + e.message);
    }
}