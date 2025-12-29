// index.js
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

const state = {
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    mainImageFile: null
};

// --- KHỞI TẠO ---
(async () => {
    console.log("🚀 System Start");
    UI.switchView('form');
    
    await Promise.all([
        ProductService.getCategories().then(res => { state.categories = res; UI.renderCategories(res); }),
        ProductService.getBrands().then(res => { state.brands = res; UI.renderBrands(res); }),
        ProductService.getAttributes().then(res => { state.attributes = res; })
    ]);

    setupEvents();
})();

// --- SỰ KIỆN ---
function setupEvents() {
    document.getElementById("categoryId").onchange = (e) => UI.renderBrands(state.brands, e.target.value);

    document.getElementById("mainImage").onchange = (e) => {
        if (e.target.files[0]) {
            state.mainImageFile = e.target.files[0];
            UI.renderMainImage(URL.createObjectURL(state.mainImageFile));
        }
    };

    document.getElementById("btnAddAttr").onclick = () => UI.addAttrRow(state.attributes);

    document.getElementById("btnGenerateVariants").onclick = () => {
        const attrs = VariantLogic.parseAttributesFromDOM();
        if (!attrs.length) return alert("Cần ít nhất 1 thuộc tính để tạo biến thể");
        
        const price = parseFloat(document.getElementById("price").value) || 0;
        const orgPrice = parseFloat(document.getElementById("priceOriginal").value) || 0;
        
        state.variants = VariantLogic.generateVariants(attrs, price, orgPrice, state.variants);
        UI.renderVariants(state.variants);
        console.log("✅ Đã tạo biến thể:", state.variants);
    };

    document.getElementById("productForm").onsubmit = handleSubmit;
}

// --- XỬ LÝ SUBMIT ---
async function handleSubmit(e) {
    e.preventDefault();
    console.log("📤 Đang xử lý submit...");

    const productName = document.getElementById("productName").value.trim();
    const catId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;
    
    if (!productName || !catId || !brandId || !state.mainImageFile) {
        return alert("Vui lòng nhập tên, danh mục, thương hiệu và ảnh chính!");
    }

    const currentAttrs = VariantLogic.parseAttributesFromDOM();
    
    // Check lỗi logic attributes
    if (state.variants.length > 0 && currentAttrs.length === 0) {
         return alert("Lỗi: Bạn đã xóa các dòng thuộc tính. Vui lòng nhấn nút 'Tạo biến thể' lại trước khi lưu!");
    }
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        return alert("Bạn đã nhập thuộc tính nhưng chưa nhấn nút 'Tạo biến thể'!");
    }

    const btn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if(btn) btn.disabled = true;
    if(spinner) spinner.classList.remove("d-none");

    try {
        // 👇 LẤY GIÁ TRỊ VÀ ÉP KIỂU SỐ (NUMBER) ĐỂ TRÁNH LỖI 500
        const priceVal = parseFloat(document.getElementById("price").value) || 0;
        const originalPriceVal = parseFloat(document.getElementById("priceOriginal").value) || 0;

        const payload = {
            productDetailDTO: {
                productId: null,
                productName: productName,
                description: document.getElementById("description").value || "",
                price: priceVal, // Số
                OriginalPrice: originalPriceVal, // 👈 ĐÃ SỬA: Tên trường là OriginalPrice (số)
                categoryId: catId,
                brandId: brandId,
                imageName: "productImage"
            },
            attributes: [],
            variants: [],
            variantValues: []
        };

        // 1. Map Attributes
        payload.attributes = currentAttrs.map(attr => ({
            attributeId: attr.id,
            attributeName: attr.name,
            attributeValues: attr.values.map(val => ({
                attributeValueId: attr.valueIdMap?.[val] || null,
                attributeValueName: val
            }))
        }));

        // 2. Map Variants
        for (let i = 0; i < state.variants.length; i++) {
            const v = state.variants[i];
            
            const mappedAttributeValues = v.comboValues.map((valName, valIdx) => {
                const parentAttr = currentAttrs[valIdx];
                if (!parentAttr) return null;

                return {
                    attributeId: parentAttr.id,
                    attributeName: parentAttr.name,
                    attributeValueName: valName,
                    attributeValueId: parentAttr.valueIdMap?.[valName] || null
                };
            }).filter(item => item !== null);

            if (mappedAttributeValues.length === 0 && currentAttrs.length > 0) {
                throw new Error(`Dữ liệu biến thể "${v.name}" bị lỗi. Vui lòng tạo lại biến thể!`);
            }

            payload.variants.push({
                variantId: null,
                price: v.price, // Số
                OriginalPrice: v.priceOriginal, // 👈 ĐÃ SỬA: Đồng bộ tên trường trong variant luôn cho chắc
                stock: v.stock,
                imageName: v.rawFile ? `image_variant_${i}` : null,
                attributeValues: mappedAttributeValues
            });
        }

        console.log("📦 Payload gửi đi:", payload);

        // 3. Build FormData
        const formData = new FormData();
        formData.append("productImage", state.mainImageFile);
        
        state.variants.forEach((v, idx) => {
            if (v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
        });

        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        // 4. Call API
        const res = await ProductService.createProduct(formData);
        
        console.log("📥 Kết quả:", res);

        if (res && res.success) {
            alert("✅ Tạo sản phẩm thành công!");
            UI.resetForm();
            state.variants = [];
            state.mainImageFile = null;
        } else {
            const serverMsg = res?.message || "Lỗi không xác định";
            const detailMsg = res?.data?.[0]?.message || res?.data?.[0]?.error || "";
            alert(`❌ Tạo thất bại: ${serverMsg}\n${detailMsg}`);
        }

    } catch (err) {
        console.error(err);
        alert("❌ Lỗi: " + err.message);
    } finally {
        if(btn) btn.disabled = false;
        if(spinner) spinner.classList.add("d-none");
    }
}

// --- GLOBAL HELPERS ---
window.applyBulk = () => {
    const org = document.getElementById("bulk_org").value;
    const prc = document.getElementById("bulk_price").value;
    const stk = document.getElementById("bulk_stock").value;
    state.variants.forEach(v => {
        if (org) v.priceOriginal = parseFloat(org);
        if (prc) v.price = parseFloat(prc);
        if (stk) v.stock = parseInt(stk);
    });
    UI.renderVariants(state.variants);
};
window.removeVar = (idx) => {
    state.variants.splice(idx, 1);
    UI.renderVariants(state.variants);
};
window.updateVar = (idx, field, val) => {
    if (state.variants[idx]) state.variants[idx][field] = parseFloat(val);
};
window.setVarImg = (idx, el) => {
    if (el.files[0] && state.variants[idx]) {
        state.variants[idx].rawFile = el.files[0];
        state.variants[idx].previewUrl = URL.createObjectURL(el.files[0]);
        UI.renderVariants(state.variants);
    }
};