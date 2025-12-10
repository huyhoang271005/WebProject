import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

// === STATE ===
let state = {
    products: [], 
    categories: [], 
    brands: [],
    variants: [], 
    currentAttributes: [],
    isEdit: false, 
    currentId: null,
    mainImageFile: null, 
    mainImagePreview: null,
    currentMainImageName: ""
};

// === INIT ===
(async function init() {
    await reloadData();
    setupEventListeners();
})();

async function reloadData() {
    const [prods, cats, brands] = await Promise.all([
        ProductService.getAll(), 
        ProductService.getCategories(), 
        ProductService.getBrands()
    ]);
    state.products = prods; 
    state.categories = cats; 
    state.brands = brands;
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
        UI.addAttrRow("", "", handleCalcVariants, null, [], {});
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
    window.removeVariant = (i) => { 
        state.variants.splice(i, 1); 
        UI.renderVariants(state.variants); 
    };
    window.handleSelectVariantImage = handleSelectVariantImage;
}

async function loadAndOpenForm(id) {
    const product = await ProductService.getDetail(id);
    if (product) openForm(product);
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
                    valueIdMap
                );
            });
            
            state.variants = product.variants.map(v => ({
                id: v.variantId,
                name: "Loading...",
                price: v.price, 
                stock: v.stock,
                imageName: v.imageName
            }));
            handleCalcVariants();
        }
    } else {
        UI.addAttrRow("", "", handleCalcVariants, null, [], {});
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
    
    let finalMainImageName = state.currentMainImageName;
    if (state.mainImageFile) {
        try {
            const uploaded = await ProductService.uploadImage(state.mainImageFile);
            if (uploaded) finalMainImageName = uploaded;
        } catch (err) { 
            console.error("Main image upload failed", err); 
        }
    }

    const variantPromises = state.variants.map(async (v) => {
        if (v.rawFile) {
            try {
                const uploaded = await ProductService.uploadImage(v.rawFile);
                if (uploaded) v.imageName = uploaded;
            } catch (err) { 
                console.error("Variant upload failed", err); 
            }
        }
        return v;
    });
    await Promise.all(variantPromises);

    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("prodName").value,
            description: document.getElementById("prodDesc").value,
            price: document.getElementById("prodPrice").value,
            priceOriginal: document.getElementById("prodOriginalPrice").value || "0",
            categoryId: document.getElementById("prodCate").value,
            brandId: document.getElementById("prodBrand").value,
            imageName: finalMainImageName
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    state.currentAttributes.forEach((attr, attrIndex) => {
        const attrId = attr.id || `attr_${Date.now()}_${attrIndex}`;
        
        const attributeValues = attr.values.map((valName, valIndex) => {
            const valueId = attr.valueIdMap[valName] || `attrval_${Date.now()}_${attrIndex}_${valIndex}`;
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

    state.variants.forEach((v, vIndex) => {
        const varId = (v.id && !v.id.toString().startsWith("new_")) 
            ? v.id 
            : `var_${Date.now()}_${vIndex}`;
        
        payload.variants.push({
            variantId: varId,
            imageName: v.imageName || "",
            price: v.price,
            priceOriginal: v.price,
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

    console.log("Payload to send:", JSON.stringify(payload, null, 2));
    
    const res = await ProductService.save(payload, state.isEdit);
    if (res.success) {
        await showDialog("success", "Lưu thành công!");
        UI.switchView('list');
        reloadData();
    } else {
        await showDialog("error", res.message || "Có lỗi xảy ra");
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