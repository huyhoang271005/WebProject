// index.js
import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./logic.js";
import { UI } from "./ui.js";

// --- STATE QUẢN LÝ DỮ LIỆU ---
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

// === 1. KHỞI TẠO ===
(async function init() {
    await reloadData();
    setupEventListeners();
    setupGlobalFunctions();
})();

async function reloadData() {
    try {
        const targetId = "6786aedf-aa81-44ef-b28f-06abff1b5c1c"; 
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
            state.currentMainImageUrl = detail.imageName || "";
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

// === 2. SỰ KIỆN ===
function setupEventListeners() {
    const btnAdd = document.getElementById("btnOpenCreate");
    if (btnAdd) btnAdd.onclick = () => {
        state.isEdit = false;
        state.currentId = null;
        state.variants = [];
        state.mainImageFile = null;
        state.currentMainImageUrl = "";
        UI.resetForm(false);
        UI.switchView('form');
    };
    
    const btnBack = document.getElementById("btnBackToList");
    if (btnBack) btnBack.onclick = () => { UI.switchView('list'); reloadData(); };
    
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) btnAddAttr.onclick = () => { UI.addAttrRow("", "", null, null, [], {}, state.attributes); };
    
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) btnGenVariants.onclick = () => { handleCalcVariants(); };
    
    if (UI.els.cateSelect) UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    
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
    if(btnReset) btnReset.onclick = () => UI.resetForm(state.isEdit); 
}

// === 3. HÀM GLOBAL ===
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
        
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
        setVal("productName", detail.productName);
        setVal("description", detail.description || "");
        setVal("price", detail.price);
        setVal("priceOriginal", detail.originalPrice);
        
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

// === 4. LOGIC SAVE (ĐÃ KHÔI PHỤC TEMP ID & MAPPING) ===
async function handleSave(e) {
    e.preventDefault();
    
    // B1: Lấy thông tin thuộc tính
    const currentAttrs = VariantLogic.parseAttributesFromDOM();

    if (currentAttrs.length > 0 && state.variants.length === 0) {
        alert("⚠️ Bạn chưa tạo biến thể! Nhấn nút 'Tạo biến thể' trước.");
        return; 
    }

    // B2: Chuẩn bị Payload
    // QUAN TRỌNG: imageName cứng "productImage" theo yêu cầu
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("productName").value,
            description: document.getElementById("description").value,
            price: parseFloat(document.getElementById("price").value) || 0,
            priceOriginal: parseFloat(document.getElementById("priceOriginal").value) || 0,
            categoryId: document.getElementById("categoryId").value, 
            brandId: document.getElementById("brandId").value,
            imageName: "productImage" 
        },
        attributes: [], 
        variants: [], 
        variantValues: [] // Mảng này bây giờ sẽ có dữ liệu!
    };

    // B3: Xử lý Attributes và tạo Map ID
    // Map dùng để lưu ID của các giá trị thuộc tính (Real ID hoặc Temp ID)
    const attrValueMap = {}; 
    const timeNow = Date.now();

    currentAttrs.forEach((attr, attrIdx) => {
        // Nếu là attr mới chưa có ID thì tạo temp ID, nếu có rồi thì giữ nguyên
        const attributeId = attr.id ? attr.id : `attr_${timeNow}_${attrIdx}`;

        const attrValues = attr.values.map((v, vIdx) => {
            const existingValueId = attr.valueIdMap[v];
            
            // QUAN TRỌNG: Tạo Temp ID (val_...) nếu là mới để Backend map được
            const finalValueId = existingValueId ? existingValueId : `val_${timeNow}_${attrIdx}_${vIdx}`;
            
            // Lưu vào map để lát nữa dùng ghép cặp
            attrValueMap[`${attrIdx}-${v}`] = finalValueId;
            
            return { 
                attributeValueId: finalValueId,
                attributeValueName: v 
            };
        });
        
        payload.attributes.push({ 
            attributeId: attributeId, 
            attributeName: attr.name, 
            attributeValues: attrValues
        });
    });

    // B4: Xử lý Variants và VariantValues
    state.variants.forEach((v, idx) => {
        // 1. Tạo Variant ID tạm (var_...) để link với bảng variantValues
        // (Trừ khi edit biến thể cũ thì giữ ID cũ, nhưng ở đây ta giả định tạo mới logic sinh variant)
        const variantTempId = `var_${timeNow}_${idx}`;
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;

        // 2. Đẩy vào mảng variants
        payload.variants.push({
            variantId: variantTempId, // Gửi temp ID đi
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: imgKey,
            // Backend có thể không cần attributeValues ở trong này nữa nếu đã có variantValues
            // Nhưng cứ để empty hoặc null nếu backend yêu cầu. 
            // Dựa vào ảnh của bạn thì variantValues nằm ở ngoài.
            attributeValues: [] 
        });

        // 3. Đẩy vào mảng variantValues (Link giữa Variant và AttributeValue)
        v.comboValues.forEach((val, valIdx) => {
            // Tìm ID của giá trị thuộc tính từ Map ở B3
            const valueId = attrValueMap[`${valIdx}-${val}`];
            
            if (valueId) {
                payload.variantValues.push({
                    variantId: variantTempId,
                    attributeValueId: valueId
                });
            }
        });
    });

    // B5: Đóng gói FormData
    const formData = new FormData();
    
    // Ảnh chính
    if(state.mainImageFile) {
        formData.append("productImage", state.mainImageFile);
    }
    
    // Ảnh biến thể
    state.variants.forEach((v, idx) => {
        if(v.rawFile) {
            formData.append(`image_variant_${idx}`, v.rawFile);
        }
    });
    
    // JSON
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    console.log("=== FINAL FIXED PAYLOAD (MATCHING SCREENSHOT) ===", JSON.stringify(payload, null, 2));

    // B6: Gửi API
    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            alert("Thành công!");
            UI.switchView('list');
            reloadData();
        } else {
             const errorMsg = res?.message || "Lỗi server";
             alert("Lỗi: " + errorMsg);
        }
    } catch(err) {
        console.error(err);
        alert("Lỗi hệ thống: " + err.message);
    }
}