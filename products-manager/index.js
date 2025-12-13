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
    mainImageFile: null
};

// === HANDLER SAVE ===
async function handleSave(e) {
    e.preventDefault();

    // VALIDATION
    const productName = document.getElementById("prodName").value.trim();
    const price = parseFloat(document.getElementById("prodPrice").value);
    const categoryId = document.getElementById("prodCate").value;
    const brandId = document.getElementById("prodBrand").value;

    if (!productName || !categoryId || !brandId || !price) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    // BUILD PAYLOAD JSON
    const payload = {
        productDetailDTO: {
            productName: productName,
            description: document.getElementById("prodDesc").value.trim() || "",
            price: price,
            priceOriginal: parseFloat(document.getElementById("prodOriginalPrice").value) || price,
            categoryId: categoryId,
            brandId: brandId,
            imageName: null,
            imageUrl: null
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // XỬ LÝ ẢNH CHÍNH
    if (state.mainImageFile) {
        const fileName = state.mainImageFile.name;
        const nameOnly = fileName.includes('.') 
            ? fileName.substring(0, fileName.lastIndexOf('.'))
            : fileName;
        payload.productDetailDTO.imageName = nameOnly;
    }

    // XỬ LÝ ATTRIBUTES
    state.currentAttributes.forEach((attr) => {
        const attributeValues = attr.values.map((valName) => ({
            attributeValueId: attr.valueIdMap?.[valName] || null,
            attributeValueName: valName
        }));

        payload.attributes.push({
            attributeId: attr.id || null,
            attributeName: attr.name,
            attributeValues: attributeValues
        });
    });

    // XỬ LÝ VARIANTS
    state.variants.forEach((v, idx) => {
        const variantId = `variant_${idx}`;
        
        let variantImageName = null;
        if (v.rawFile) {
            const fileName = v.rawFile.name;
            variantImageName = fileName.includes('.')
                ? fileName.substring(0, fileName.lastIndexOf('.'))
                : fileName;
        }

        payload.variants.push({
            variantId: variantId,
            imageName: variantImageName,
            imageUrl: null,
            price: parseFloat(v.price) || price,
            priceOriginal: parseFloat(v.priceOriginal) || parseFloat(v.price) || price,
            stock: parseInt(v.stock) || 0,
            sold: 0,
            active: true
        });

        // Map variantValues
        if (v.comboValues && v.comboValues.length > 0) {
            v.comboValues.forEach((valName) => {
                const parentAttr = state.currentAttributes.find(a => a.values.includes(valName));
                if (parentAttr) {
                    const attrValueId = parentAttr.valueIdMap?.[valName];
                    if (attrValueId) {
                        payload.variantValues.push({
                            variantId: variantId,
                            attributeValueId: attrValueId
                        });
                    }
                }
            });
        }
    });

    // BUILD FORMDATA
    const formData = new FormData();
    formData.append("productDTO", JSON.stringify(payload));
    
    if (state.mainImageFile) {
        formData.append("images", state.mainImageFile);
    }
    
    state.variants.forEach((v) => {
        if (v.rawFile) {
            formData.append("images", v.rawFile);
        }
    });

    // DEBUG LOG
    console.log("=== PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("\n=== FORMDATA ===");
    for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `File(${value.name})` : value);
    }

    // GỬI REQUEST
    const res = await ProductService.create(formData);
    console.log("=== RESPONSE ===", res);
    
    if (res && res.success) {
        await showDialog("success", "Tạo sản phẩm thành công!");
        UI.switchView('list');
        await reloadData();
        resetForm();
    } else {
        await showDialog("error", res?.message || "Có lỗi xảy ra");
    }
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

function openForm() {
    resetForm();
    UI.switchView('form');
    UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
}

function resetForm() {
    state.variants = [];
    state.mainImageFile = null;
    state.currentAttributes = [];
    
    document.getElementById("productForm").reset();
    UI.els.attrContainer.innerHTML = "";
    UI.els.variantWrapper.classList.add("hidden");
    UI.els.brandSelect.innerHTML = `<option value="">-- Chọn danh mục trước --</option>`;
    UI.els.formTitle.innerText = "Thêm sản phẩm mới";
    UI.renderMainImage(null);
    UI.els.mainImgInput.value = "";
}

function setupEventListeners() {
    document.getElementById("btnOpenAdd").onclick = openForm;
    document.getElementById("btnBack").onclick = () => { 
        UI.switchView('list'); 
        reloadData(); 
    };
    document.getElementById("btnAddAttr").onclick = () => { 
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes); 
    };
    
    UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    document.getElementById("productForm").onsubmit = handleSave;
    
    document.getElementById("mainImgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            UI.renderMainImage(URL.createObjectURL(file));
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
    window.handleSelectVariantImage = handleSelectVariantImage;
}

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

(async function init() {
    await reloadData();
    setupEventListeners();
})();