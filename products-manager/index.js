import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
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
    mainImagePreview: null,
    currentMainImageName: ""
};

(async function init() {
    await reloadData();
    setupEventListeners();
})();

async function reloadData() {
    const [prods, cats, brands, attrs] = await Promise.all([
        ProductService.getAll(), 
        ProductService.getCategories(), 
        ProductService.getBrands(),
        ProductService.getAttributes()
    ]);
    state.products = prods || []; 
    state.categories = cats || []; 
    state.brands = brands || [];
    state.attributes = attrs || [];
    UI.renderTable(state.products);
    
    UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
    state.categories.forEach(c => {
        UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
    });
}

function setupEventListeners() {
    document.getElementById("btnOpenAdd").onclick = () => openForm();
    document.getElementById("btnBack").onclick = () => { 
        UI.switchView('list'); 
        reloadData(); 
    };
    document.getElementById("btnAddAttr").onclick = () => {
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    };
    UI.els.cateSelect.onchange = (e) => {
        UI.renderBrands(state.brands, e.target.value);
    };
    document.getElementById("productForm").onsubmit = handleSave;
    
    document.getElementById("mainImgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            state.mainImagePreview = URL.createObjectURL(file);
            UI.renderMainImage(state.mainImagePreview);
        }
    };
    
    window.editProduct = loadAndOpenForm;
    window.deleteProduct = handleDelete;
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
    window.handleSelectVariantImage = handleSelectVariantImage;
}

// Sửa: Lấy thông tin từ danh sách state thay vì gọi API getDetail
async function loadAndOpenForm(id) {
    const product = state.products.find(p => p.productId === id);
    if (product) {
        openForm(product);
    } else {
        showDialog("error", "Không tìm thấy thông tin sản phẩm");
    }
}

function openForm(product = null) {
    state.isEdit = !!product;
    state.currentId = product?.productId || null;
    state.variants = [];
    state.mainImageFile = null;
    state.currentMainImageName = "";
    state.currentAttributes = [];

    UI.resetForm(state.isEdit);

    if (product) {
        UI.fillForm(product);
        UI.renderBrands(state.brands, product.categoryId, product.brandId);
        state.currentMainImageName = product.imageName || "";

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
            
            // Map lại variants từ dữ liệu cũ
            state.variants = product.variants.map(v => ({
                id: v.variantId,
                name: "Loading...", // Tên sẽ được cập nhật khi calc lại logic
                price: v.price, 
                priceOriginal: v.priceOriginal || v.price,
                stock: v.stock,
                imageName: v.imageName
            }));
            handleCalcVariants();
        }
    } else {
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    }
    UI.switchView('form');
}

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    state.currentAttributes = attrs;
    const basePrice = document.getElementById("prodPrice").value || 0;
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}

function handleSelectVariantImage(index, input) {
    const file = input.files[0];
    if (file) {
        state.variants[index].rawFile = file;
        state.variants[index].previewUrl = URL.createObjectURL(file);
        UI.renderVariants(state.variants);
    }
}

async function handleSave(e) {
    e.preventDefault();
    
    // 1. Tạo FormData
    const formData = new FormData();

    // 2. Tạo cấu trúc JSON payload
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("prodName").value,
            description: document.getElementById("prodDesc").value,
            price: document.getElementById("prodPrice").value,
            priceOriginal: document.getElementById("prodOriginalPrice").value || "0",
            categoryId: document.getElementById("prodCate").value,
            brandId: document.getElementById("prodBrand").value,
            imageName: state.currentMainImageName || "" 
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // --- MAP ẢNH CHÍNH ---
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = state.mainImageFile.name; // Map tên file
        formData.append("images", state.mainImageFile); // Đẩy file vào
    }

    // --- XỬ LÝ ATTRIBUTES ---
    state.currentAttributes.forEach((attr, attrIndex) => {
        const attrId = attr.id || `attr_${Date.now()}_${attrIndex}`;
        
        const attributeValues = attr.values.map((valName, valIndex) => {
            const valueId = attr.valueIdMap[valName] || `val_${Date.now()}_${attrIndex}_${valIndex}`;
            if (!attr.valueIdMap) attr.valueIdMap = {};
            attr.valueIdMap[valName] = valueId;
            
            return {
                attributeValueId: valueId,
                attributeValueName: valName
            };
        });
        
        payload.attributes.push({
            attributeId: attrId,
            attributeValues: attributeValues
        });
    });

    // --- MAP ẢNH VARIANTS ---
    state.variants.forEach((v, vIndex) => {
        const varId = (v.id && !v.id.toString().startsWith("new_")) 
            ? v.id 
            : `var_${Date.now()}_${vIndex}`;
        
        let finalImageName = v.imageName || "";

        if (v.rawFile) {
            finalImageName = v.rawFile.name; // Map tên file
            formData.append("images", v.rawFile); // Đẩy file vào
        }
        
        payload.variants.push({
            variantId: varId,
            imageName: finalImageName, // Tên file để BE tìm
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock
        });
        
        if (v.comboValues) {
            v.comboValues.forEach((valName) => {
                const attr = state.currentAttributes.find(a => a.values.includes(valName));
                if (attr && attr.valueIdMap && attr.valueIdMap[valName]) {
                    payload.variantValues.push({
                        attributeValueId: attr.valueIdMap[valName],
                        variantId: varId
                    });
                }
            });
        }
    });

    // 3. Đóng gói JSON vào key "data"
    formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    console.log("Payload:", payload);
    
    // 4. Gọi Service
    const res = await ProductService.save(formData);
    if (res && res.success) {
        await showDialog("success", "Lưu thành công!");
        UI.switchView('list');
        reloadData();
    } else {
        await showDialog("error", res?.message || "Có lỗi xảy ra");
    }
}

async function handleDelete(id) {
    await showDialog("question", "Xóa sản phẩm này?", async () => {
        const res = await ProductService.delete(id);
        if (res.success) { 
            await showDialog("success", "Đã xóa"); 
            reloadData(); 
        } else {
            showDialog("error", res.message || "Không thể xóa");
        }
    });
}