// index.js
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

let state = {
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    mainImageFile: null
};

(async function init() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (response.status === 401) {
            if (args[0].includes("refresh-token") || args[0].includes("auth/login")) {
                console.error("Force Logout.");
                localStorage.clear();
                window.location.href = "/login.html";
                return Promise.reject("Force Logout");
            }
        }
        return response;
    };

    setupEventListeners();
    await loadBaseData(); 
    
    UI.switchView('form');
    UI.resetForm(false);
})();

async function loadBaseData() {
    try {
        console.log("Bat dau tai du lieu nen...");

        const cats = await ProductService.getCategories();
        state.categories = cats || [];
        console.log("Loaded Categories:", state.categories.length);

        const brands = await ProductService.getBrands();
        state.brands = brands || [];
        console.log("Loaded Brands:", state.brands.length);

        const attrs = await ProductService.getAttributes();
        state.attributes = attrs || [];
        console.log("Loaded Attributes:", state.attributes.length);

        // 1. Render Categories
        if (UI.els.cateSelect) {
            UI.els.cateSelect.innerHTML = `<option value="">-- Chon danh muc --</option>`;
            state.categories.forEach(c => {
                UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }

        // 2. Render Brands NGAY LAP TUC (Hien thi tat ca brand khi chua chon danh muc)
        // De nguoi dung thay duoc data ke ca khi chua chon danh muc
        UI.renderBrands(state.brands, null); 

    } catch (e) {
        console.error("Loi tai du lieu:", e);
    }
}

function setupEventListeners() {
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) btnReset.onclick = () => { UI.resetForm(false); state.variants = []; state.mainImageFile = null; };
    
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) btnAddAttr.onclick = () => { UI.addAttrRow("", "", null, null, [], {}, state.attributes); };
    
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) btnGenVariants.onclick = () => { handleCalcVariants(); };
    
    // Khi chon danh muc -> Loc lai Brand
    if (UI.els.cateSelect) {
        UI.els.cateSelect.onchange = (e) => {
            const cateId = e.target.value;
            console.log("Da chon danh muc ID:", cateId);
            UI.renderBrands(state.brands, cateId);
        };
    }
    
    if (UI.els.mainImgInput) {
        UI.els.mainImgInput.onchange = (e) => {
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
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    UI.renderVariants(state.variants);
}

async function handleSave(e) {
    e.preventDefault();
    if (state.variants.length === 0) {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        if (currentAttrs.length > 0) return alert("Chua nhan Tao bien the!");
    }

    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if(submitBtn) submitBtn.disabled = true;
    if(spinner) spinner.classList.remove("d-none");

    try {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        
        const payload = {
            productDetailDTO: {
                productId: null,
                productName: document.getElementById("productName").value,
                description: document.getElementById("description").value,
                price: parseFloat(document.getElementById("price").value) || 0,
                originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0,
                categoryId: document.getElementById("categoryId").value, 
                brandId: document.getElementById("brandId").value,
                imageName: "productImage"
            },
            attributes: [], variants: [], variantValues: []
        };

        currentAttrs.forEach((attr, attrIdx) => {
            const attributeId = attr.id ? attr.id : null; 
            const attrValues = attr.values.map((v) => ({ 
                attributeValueId: attr.valueIdMap ? attr.valueIdMap[v] : null,
                attributeValueName: v 
            }));
            payload.attributes.push({ attributeId, attributeName: attr.name, attributeValues: attrValues });
        });

        state.variants.forEach((v, idx) => {
            const imgKey = v.rawFile ? `image_variant_${idx}` : null;
            payload.variants.push({
                variantId: null,
                price: v.price,
                originalPrice: v.priceOriginal || v.price,
                stock: v.stock,
                imageName: imgKey,
                attributeValues: []
            });
        });

        const formData = new FormData();
        if(state.mainImageFile) formData.append("productImage", state.mainImageFile);
        state.variants.forEach((v, idx) => { if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile); });
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        const res = await ProductService.createProduct(formData);
        
        if(res && res.success) {
            alert("Thanh cong!");
            UI.resetForm(false);
            state.variants = [];
            state.mainImageFile = null;
        } else {
             alert("Loi: " + (res?.message || "Server error"));
        }
    } catch(err) {
        console.error(err);
        alert("Loi: " + err.message);
    } finally {
        if(submitBtn) submitBtn.disabled = false;
        if(spinner) spinner.classList.add("d-none");
    }
}

// Global
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