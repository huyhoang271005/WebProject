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

// --- INIT ---
(async () => {
    console.log("🚀 System Start");
    UI.switchView('form');
    
    // Load dữ liệu nền song song
    await Promise.all([
        ProductService.getCategories().then(res => { state.categories = res; UI.renderCategories(res); }),
        ProductService.getBrands().then(res => { state.brands = res; UI.renderBrands(res); }),
        ProductService.getAttributes().then(res => { state.attributes = res; })
    ]);

    setupEvents();
})();

// --- EVENTS ---
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

// --- SUBMIT HANDLER ---
async function handleSubmit(e) {
    e.preventDefault();
    console.log("📤 Đang xử lý submit...");

    // 1. Validate Form cơ bản
    const productName = document.getElementById("productName").value.trim();
    const catId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;
    
    if (!productName || !catId || !brandId || !state.mainImageFile) {
        return alert("Vui lòng nhập tên, danh mục, thương hiệu và ảnh chính!");
    }

    // 2. Lấy attributes hiện tại từ màn hình
    const currentAttrs = VariantLogic.parseAttributesFromDOM();
    
    // Check: Nếu có variants nhưng attributes trên màn hình bị xóa hết -> Lỗi
    if (state.variants.length > 0 && currentAttrs.length === 0) {
         return alert("Lỗi: Bạn đã xóa các thuộc tính. Vui lòng nhấn 'Tạo biến thể' lại trước khi lưu!");
    }
    
    // Check: Có attributes nhưng chưa tạo variants
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        return alert("Bạn đã nhập thuộc tính nhưng chưa nhấn nút 'Tạo biến thể'!");
    }

    const btn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if(btn) btn.disabled = true;
    if(spinner) spinner.classList.remove("d-none");

    try {
        const payload = {
            productDetailDTO: {
                productId: null,
                productName: productName,
                description: document.getElementById("description").value || "",
                price: parseFloat(document.getElementById("price").value) || 0,
                originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0,
                categoryId: catId,
                brandId: brandId,
                imageName: "productImage"
            },
            attributes: [],
            variants: [],
            variantValues: []
        };

        // --- BƯỚC 1: Map Attributes ---
        // Backend cần danh sách thuộc tính (VD: Màu sắc, Size)
        payload.attributes = currentAttrs.map(attr => ({
            attributeId: attr.id,
            attributeName: attr.name,
            attributeValues: attr.values.map(val => ({
                attributeValueId: attr.valueIdMap?.[val] || null,
                attributeValueName: val
            }))
        }));

        // --- BƯỚC 2: Map Variants (Quan trọng) ---
        // Duyệt qua từng variant để map dữ liệu
        for (let i = 0; i < state.variants.length; i++) {
            const v = state.variants[i];
            
            // Map mảng giá trị chuỗi ["Đỏ", "XL"] thành mảng Objects đầy đủ ID
            const mappedAttributeValues = v.comboValues.map((valName, valIdx) => {
                const parentAttr = currentAttrs[valIdx]; // Tìm cha theo thứ tự
                
                // Nếu không tìm thấy cha (do người dùng xóa dòng thuộc tính), trả về null
                if (!parentAttr) return null;

                return {
                    attributeId: parentAttr.id,          // ✅ Gửi ID thuộc tính (bắt buộc)
                    attributeName: parentAttr.name,      // Gửi tên
                    attributeValueName: valName,         // Gửi giá trị (VD: Đỏ)
                    attributeValueId: parentAttr.valueIdMap?.[valName] || null
                };
            }).filter(item => item !== null); // Lọc bỏ null

            // KIỂM TRA AN TOÀN: Nếu variant không có attributeValues nào -> Báo lỗi ngay
            if (mappedAttributeValues.length === 0 && currentAttrs.length > 0) {
                throw new Error(`Dữ liệu biến thể "${v.name}" bị lỗi. Vui lòng nhấn nút "Tạo biến thể" lại!`);
            }

            payload.variants.push({
                variantId: null,
                price: v.price,
                originalPrice: v.priceOriginal,
                stock: v.stock,
                imageName: v.rawFile ? `image_variant_${i}` : null,
                attributeValues: mappedAttributeValues // ✅ Mảng này không được rỗng
            });
        }

        console.log("📦 Payload gửi đi:", payload);

        // --- BƯỚC 3: Đóng gói FormData ---
        const formData = new FormData();
        formData.append("productImage", state.mainImageFile);
        
        state.variants.forEach((v, idx) => {
            if (v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
        });

        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        // --- BƯỚC 4: Gọi API ---
        const res = await ProductService.createProduct(formData);
        
        console.log("📥 Kết quả:", res);

        if (res && res.success) {
            alert("✅ Tạo sản phẩm thành công!");
            UI.resetForm();
            state.variants = [];
            state.mainImageFile = null;
        } else {
            // Hiển thị lỗi chi tiết từ backend trả về
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