// index.js
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
    mainImageFile: null,
    isEdit: false,
    currentId: null,
    currentMainImageUrl: ""
};

// === INIT ===
(async function init() {
    await reloadData();
    setupEventListeners();
    setupGlobalFunctions();
})();

async function reloadData() {
    try {
        const targetId = "6786aedf-aa81-44ef-b28f-06abff1b5c1c"; // ID Test
        const [productData, cats, brands, attrs] = await Promise.all([
            ProductService.getProductById(targetId),
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        let productList = [];
        if (productData && productData.productDetailDTO) {
            const detail = productData.productDetailDTO;
            const uiItem = {
                productId: detail.productId,
                productName: detail.productName,
                priceOriginal: detail.originalPrice,
                price: detail.price,
                imageName: detail.imageName,
                imageUrl: detail.imageUrl,
                variants: productData.variants || [], 
                categoryName: cats.find(c => c.categoryId == detail.categoryId)?.categoryName || "-",
                brandName: brands.find(b => b.brandId == detail.brandId)?.brandName || "-"
            };
            productList = [uiItem]; 
        }

        state.products = productList;
        UI.renderTable(state.products);
        
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

function setupEventListeners() {
    const btnAdd = document.getElementById("btnOpenCreate");
    if (btnAdd) {
        btnAdd.onclick = () => {
            state.isEdit = false;
            state.currentId = null;
            state.variants = [];
            state.mainImageFile = null;
            state.currentMainImageUrl = "";
            UI.resetForm(false);
            UI.switchView('form');
        };
    }
    const btnBack = document.getElementById("btnBackToList");
    if (btnBack) {
        btnBack.onclick = () => { UI.switchView('list'); reloadData(); };
    }
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => { UI.addAttrRow("", "", null, null, [], {}, state.attributes); };
    }
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) {
        btnGenVariants.onclick = () => { handleCalcVariants(); };
    }
    if (UI.els.cateSelect) {
        UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
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
    
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) { btnReset.onclick = () => UI.resetForm(state.isEdit); }
}

// === CÁC HÀM GLOBAL ===
function setupGlobalFunctions() {
    window.editProduct = async (id) => {
        const fullData = await ProductService.getProductById(id);
        if (!fullData || !fullData.productDetailDTO) return;
        const detail = fullData.productDetailDTO;
        state.isEdit = true;
        state.currentId = id;
        state.variants = []; 
        state.mainImageFile = null;
        state.currentMainImageUrl = detail.imageName || "";
        UI.resetForm(true);
        UI.switchView('form');
        
        if(document.getElementById("productName")) document.getElementById("productName").value = detail.productName;
        if(document.getElementById("description")) document.getElementById("description").value = detail.description || "";
        if(document.getElementById("price")) document.getElementById("price").value = detail.price;
        if(document.getElementById("priceOriginal")) document.getElementById("priceOriginal").value = detail.originalPrice;
        if(UI.els.cateSelect) {
            UI.els.cateSelect.value = detail.categoryId;
            UI.renderBrands(state.brands, detail.categoryId, detail.brandId);
        }
        if(detail.imageUrl) UI.renderMainImage(detail.imageUrl);
        else if(detail.imageName) UI.renderMainImage(`/images/${detail.imageName}`);
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

    // --- MỚI: HÀM ÁP DỤNG HÀNG LOẠT ---
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

// Thay thế hàm handleSave cũ trong index.js bằng hàm này:

// Thay thế toàn bộ hàm handleSave trong file index.js

async function handleSave(e) {
    e.preventDefault();
    
    // 1. Lấy danh sách thuộc tính từ giao diện
    const currentAttrs = VariantLogic.parseAttributesFromDOM();

    // 2. CHECK: Nhập thuộc tính mà quên bấm nút "Tạo biến thể"
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        const msg = "⚠️ Bạn chưa tạo biến thể!\nVui lòng nhấn nút màu xanh 'Tạo biến thể' trước khi lưu.";
        if(typeof showDialog === 'function') await showDialog("error", msg);
        else alert(msg);
        return; 
    }

    // 3. Chuẩn bị Payload
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("productName").value,
            description: document.getElementById("description").value,
            price: parseFloat(document.getElementById("price").value) || 0,
            priceOriginal: parseFloat(document.getElementById("priceOriginal").value) || 0,
            categoryId: document.getElementById("categoryId").value, 
            brandId: document.getElementById("brandId").value,
            imageName: state.currentMainImageUrl || "" 
        },
        attributes: [], 
        variants: [], 
        variantValues: []
    };

    // 4. Build Attributes Payload & Tạo Map để tra cứu ID
    // Chúng ta cần lưu lại cả ID và Name để lát ghép vào variant
    const attrMap = []; 

    currentAttrs.forEach(attr => {
        // Lưu metadata để dùng cho variant bên dưới
        attrMap.push({
            id: attr.id,    // ID của thuộc tính (nếu chọn từ dropdown)
            name: attr.name // Tên thuộc tính
        });
        
        const attrValues = attr.values.map(v => ({ attributeValueName: v }));
        payload.attributes.push({ 
            attributeName: attr.name, 
            attributeValues: attrValues,
            attributeId: attr.id 
        });
    });

    // 5. Build Variants Payload (FIX QUAN TRỌNG TẠI ĐÂY)
    state.variants.forEach((v, idx) => {
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;
        
        // Ghép đầy đủ thông tin: ID, Name, Value cho backend
        const variantAttrValues = v.comboValues.map((val, valIdx) => {
            const meta = attrMap[valIdx]; // Lấy thông tin thuộc tính tương ứng vị trí
            return {
                attributeId: meta.id || null, // Gửi kèm ID nếu có
                attributeName: meta.name,     // Gửi kèm Tên
                attributeValueName: val       // Giá trị (Đỏ, XL...)
            };
        });

        payload.variants.push({
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: imgKey,
            attributeValues: variantAttrValues // <--- Backend cần cái này đầy đủ
        });
    });

    // 6. Gửi dữ liệu
    const formData = new FormData();
    if(state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage";
        formData.append("productImage", state.mainImageFile);
    }
    state.variants.forEach((v, idx) => {
        if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
    });
    
    // Log ra để kiểm tra
    console.log("🔥 Payload chuẩn bị gửi:", JSON.stringify(payload, null, 2));

    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            if(typeof showDialog === 'function') await showDialog("success", "Thành công!");
            else alert("Thành công");
            UI.switchView('list');
            reloadData();
        } else {
             // In lỗi chi tiết từ server nếu có
             console.error("Server Error Detail:", res);
             if(typeof showDialog === 'function') await showDialog("error", res?.message || "Lỗi lưu sản phẩm");
             else alert("Lỗi: " + (res?.message || "Kiểm tra lại dữ liệu"));
        }
    } catch(err) {
        console.error(err);
        alert("Lỗi hệ thống: " + err.message);
    }
}