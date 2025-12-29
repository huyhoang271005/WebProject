// index.js
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

// State quản lý dữ liệu tạm
const state = {
    categories: [],
    brands: [],
    attributes: [],
    variants: [], // Danh sách biến thể đang tạo
    mainImageFile: null
};

// --- INIT ---
(async () => {
    console.log("🚀 System Start");
    UI.switchView('form'); // Mặc định vào form tạo mới
    
    // Load dữ liệu nền
    await Promise.all([
        ProductService.getCategories().then(res => { state.categories = res; UI.renderCategories(res); }),
        ProductService.getBrands().then(res => { state.brands = res; UI.renderBrands(res); }),
        ProductService.getAttributes().then(res => { state.attributes = res; })
    ]);

    setupEvents();
})();

// --- EVENTS ---
function setupEvents() {
    // 1. Thay đổi Category -> Render lại Brand
    document.getElementById("categoryId").onchange = (e) => UI.renderBrands(state.brands, e.target.value);

    // 2. Chọn ảnh chính
    document.getElementById("mainImage").onchange = (e) => {
        if (e.target.files[0]) {
            state.mainImageFile = e.target.files[0];
            UI.renderMainImage(URL.createObjectURL(state.mainImageFile));
        }
    };

    // 3. Thêm dòng thuộc tính
    document.getElementById("btnAddAttr").onclick = () => UI.addAttrRow(state.attributes);

    // 4. Tạo biến thể (Generate)
    document.getElementById("btnGenerateVariants").onclick = () => {
        const attrs = VariantLogic.parseAttributesFromDOM();
        if (!attrs.length) return alert("Cần ít nhất 1 thuộc tính để tạo biến thể");
        
        const price = parseFloat(document.getElementById("price").value) || 0;
        const orgPrice = parseFloat(document.getElementById("priceOriginal").value) || 0;
        
        // Generate và update state
        state.variants = VariantLogic.generateVariants(attrs, price, orgPrice, state.variants);
        UI.renderVariants(state.variants);
    };

    // 5. Submit Form
    document.getElementById("productForm").onsubmit = handleSubmit;
}

// --- SUBMIT HANDLER (QUAN TRỌNG) ---
async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate cơ bản
    const productName = document.getElementById("productName").value.trim();
    const catId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;
    
    if (!productName || !catId || !brandId || !state.mainImageFile) {
        return alert("Vui lòng nhập tên, danh mục, thương hiệu và ảnh chính!");
    }

    // Lấy attributes hiện tại để mapping
    const currentAttrs = VariantLogic.parseAttributesFromDOM();
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        return alert("Bạn đã nhập thuộc tính nhưng chưa tạo biến thể!");
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;

    try {
        // --- BUIL PAYLOAD ---
        const payload = {
            productDetailDTO: {
                productId: null,
                productName: productName,
                description: document.getElementById("description").value || "",
                price: parseFloat(document.getElementById("price").value) || 0,
                originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0, // Mapping theo JSON output
                categoryId: catId,
                brandId: brandId,
                imageName: "productImage"
            },
            attributes: [],
            variants: [],
            variantValues: [] // Backend tự sinh, gửi mảng rỗng
        };

        // 1. Map Attributes
        // Backend cần biết sản phẩm này có những attribute nào (Màu, Size)
        payload.attributes = currentAttrs.map(attr => ({
            attributeId: attr.id,
            attributeName: attr.name,
            attributeValues: attr.values.map(val => ({
                attributeValueId: attr.valueIdMap?.[val] || null, // Nếu value đã tồn tại trong DB
                attributeValueName: val,
                value: val // Alias an toàn
            }))
        }));

        // 2. Map Variants (FIX LỖI 422 TẠI ĐÂY)
        // Backend cần attributeValues NẰM TRONG variant để biết variant đó là màu gì, size gì
        state.variants.forEach((v, idx) => {
            // Map giá trị variant (["Đỏ", "XL"]) về object có ID của thuộc tính cha
            const mappedValues = v.comboValues.map((valName, valIdx) => {
                const parentAttr = currentAttrs[valIdx]; // Thuộc tính cha tương ứng vị trí
                return {
                    attributeId: parentAttr.id,
                    attributeName: parentAttr.name,
                    attributeValueName: valName,
                    attributeValueId: parentAttr.valueIdMap?.[valName] || null
                };
            });

            payload.variants.push({
                variantId: null,
                price: v.price,
                priceOriginal: v.priceOriginal, // Mapping đúng tên trường trong JSON
                stock: v.stock,
                imageName: v.rawFile ? `image_variant_${idx}` : null,
                attributeValues: mappedValues // <--- QUAN TRỌNG: Gửi kèm values chi tiết
            });
        });

        // 3. Build FormData
        const formData = new FormData();
        formData.append("productImage", state.mainImageFile); // Ảnh chính
        
        // Append ảnh variants
        state.variants.forEach((v, idx) => {
            if (v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
        });

        // Append JSON Payload
        // Lưu ý: Key là "productDTO" hay "data" tuỳ backend, ở đây mình dùng productDTO theo code cũ
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        console.log("📤 Payload:", payload);

        // 4. Call API
        const res = await ProductService.createProduct(formData);
        
        if (res && res.success) {
            alert("✅ Tạo sản phẩm thành công!");
            UI.resetForm();
            state.variants = [];
            state.mainImageFile = null;
        } else {
            alert("❌ Lỗi: " + (res?.message || "Unknown Error"));
            console.error(res);
        }

    } catch (err) {
        alert("Lỗi hệ thống: " + err.message);
        console.error(err);
    } finally {
        btn.disabled = false;
    }
}

// --- GLOBAL HELPERS (Cho các sự kiện onclick trong HTML string) ---
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