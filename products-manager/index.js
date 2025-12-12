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
    // Gọi tuần tự để tránh conflict khi refresh token
    const prods = await ProductService.getAll();
    const cats = await ProductService.getCategories();
    const brands = await ProductService.getBrands();
    const attrs = await ProductService.getAttributes();
    
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

async function loadAndOpenForm(id) {
    const product = state.products.find(p => p.productId === id);
    if (product) {
        openForm(product);
    } else {
        showDialog("error", "Không tìm thấy dữ liệu sản phẩm");
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

        // Map Attributes
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
            state.variants = product.variants.map(v => ({
                id: v.variantId,
                name: "Loading...", 
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
    const basePrice = parseFloat(document.getElementById("prodPrice").value) || 0;
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}

function handleSelectVariantImage(index, input) {
    const file = input.files[0];
    if (file) {
        state.variants[index].rawFile = file;
        state.variants[index].previewUrl = URL.createObjectURL(file);
        state.variants[index].imageName = file.name;
        UI.renderVariants(state.variants);
    }
}

async function handleSave(e) {
    e.preventDefault();
    
    console.log("🔍 DEBUG - State before save:", {
        variants: state.variants,
        currentAttributes: state.currentAttributes
    });
    
    const formData = new FormData();

    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("prodName").value,
            description: document.getElementById("prodDesc").value,
            price: parseFloat(document.getElementById("prodPrice").value) || 0,
            priceOriginal: parseFloat(document.getElementById("prodOriginalPrice").value) || 0,
            categoryId: document.getElementById("prodCate").value,
            brandId: document.getElementById("prodBrand").value,
            imageName: state.currentMainImageName || "" 
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // Upload main image
    if (state.mainImageFile) {
        // Bỏ extension khỏi tên file
        const fileName = state.mainImageFile.name;
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        payload.productDetailDTO.imageName = nameWithoutExt;
        formData.append("images", state.mainImageFile);
    }

    // Map Attributes
    state.currentAttributes.forEach((attr, attrIndex) => {
        const attrId = attr.id || `attr_${Date.now()}_${attrIndex}`;
        
        const attributeValues = attr.values.map((valName, valIndex) => {
            const valueId = attr.valueIdMap?.[valName] || `val_${Date.now()}_${attrIndex}_${valIndex}`;
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

    // Map Variants
    state.variants.forEach((v, vIndex) => {
        const varId = (v.id && !v.id.toString().startsWith("new_")) 
            ? v.id 
            : `var_${Date.now()}_${vIndex}`;
        
        let finalImageName = v.imageName || ""; 

        if (v.rawFile) {
            // Bỏ extension khỏi tên file variant
            const fileName = v.rawFile.name;
            const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
            finalImageName = nameWithoutExt;
            formData.append("images", v.rawFile); 
        }
        
        // Đảm bảo price là số hợp lệ
        const varPrice = parseFloat(v.price) || 0;
        const varPriceOriginal = parseFloat(v.priceOriginal) || varPrice;
        
        payload.variants.push({
            variantId: varId,
            imageName: finalImageName, 
            price: varPrice,
            priceOriginal: varPriceOriginal,
            stock: parseInt(v.stock) || 0
        });
        
        // Map variantValues - Đảm bảo có đủ cho tất cả attributes
        if (v.comboValues && v.comboValues.length > 0) {
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

    console.log("📤 Payload to send:", JSON.stringify(payload, null, 2));
    console.log("📦 FormData images:", [...formData.keys()]);
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    
    try {
        const res = await ProductService.save(formData);
        console.log("📥 Response from server:", res);
        
        if (res && res.success) {
            await showDialog("success", "Lưu thành công!");
            UI.switchView('list');
            reloadData();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra");
        }
    } catch (error) {
        console.error("❌ Save error:", error);
        await showDialog("error", "Lỗi kết nối server: " + error.message);
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