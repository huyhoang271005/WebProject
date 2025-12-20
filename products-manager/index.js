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
    mainImageFile: null, // File ảnh main (Blob/File)
    isEdit: false,
    currentId: null,
    currentMainImageUrl: "" // Đường dẫn ảnh cũ (nếu có)
};

// === 1. KHỞI TẠO ===
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
            
            // Lưu lại tên ảnh cũ để dùng nếu không up ảnh mới
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
        btnBack.onclick = () => { 
            UI.switchView('list'); 
            reloadData(); 
        };
    }
    
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => { 
            UI.addAttrRow("", "", null, null, [], {}, state.attributes); 
        };
    }
    
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) {
        btnGenVariants.onclick = () => { 
            handleCalcVariants(); 
        };
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
    if(btnReset) { 
        btnReset.onclick = () => UI.resetForm(state.isEdit); 
    }
}

// === 3. HÀM TOÀN CỤC ===
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
        
        // Fill data
        const el = (id) => document.getElementById(id);
        if(el("productName")) el("productName").value = detail.productName;
        if(el("description")) el("description").value = detail.description || "";
        if(el("price")) el("price").value = detail.price;
        if(el("priceOriginal")) el("priceOriginal").value = detail.originalPrice;
        
        if(UI.els.cateSelect) {
            UI.els.cateSelect.value = detail.categoryId;
            UI.renderBrands(state.brands, detail.categoryId, detail.brandId);
        }
        
        if(detail.imageUrl) UI.renderMainImage(detail.imageUrl);
        else if(detail.imageName) UI.renderMainImage(`/images/${detail.imageName}`);
        
        // TODO: Logic load attributes/variants cũ nếu cần
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

// === 4. HÀM LƯU (ĐÃ CHỈNH SỬA THEO YÊU CẦU ẢNH CHAT) ===
async function handleSave(e) {
    e.preventDefault();
    
    // B1: Parse attributes
    const currentAttrs = VariantLogic.parseAttributesFromDOM();

    // Validate
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        const msg = "⚠️ Bạn chưa tạo biến thể!\nVui lòng nhấn nút màu xanh 'Tạo biến thể'.";
        if(typeof showDialog === 'function') await showDialog("error", msg);
        else alert(msg);
        return; 
    }

    // B2: Chuẩn bị Payload
    // imageName mặc định lấy cái cũ, lát nữa nếu có upload mới sẽ bị ghi đè
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

    // B3: Xử lý Attribute Value ID (Fix lỗi NULL)
    const attrValueIdMap = {}; 
    currentAttrs.forEach(attr => {
        const attrValues = attr.values.map(v => {
            const existingValueId = attr.valueIdMap[v];
            
            // Nếu không có ID -> Gán undefined để JSON bỏ qua key này (Backend tự tạo mới)
            const finalId = existingValueId ? existingValueId : undefined;
            
            attrValueIdMap[`${attr.id}-${v}`] = finalId;
            
            const valObj = { attributeValueName: v };
            if (finalId !== undefined) {
                valObj.attributeValueId = finalId;
            }
            return valObj;
        });
        
        payload.attributes.push({ 
            attributeId: attr.id, 
            attributeName: attr.name, 
            attributeValues: attrValues
        });
    });

    // B4: Xử lý Variants & Ảnh Variant
    state.variants.forEach((v, idx) => {
        // Tạo key mapping cho ảnh variant (ví dụ: image_variant_0)
        // Đây cũng là "imageName" để backend map, không phải tên file thật
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;
        
        const variantAttrValues = v.comboValues.map((val, valIdx) => {
            const attr = currentAttrs[valIdx];
            if (!attr) return null;
            
            const mapKey = `${attr.id}-${val}`;
            const valueId = attrValueIdMap[mapKey];
            
            const attrValObj = {
                attributeId: attr.id,
                attributeName: attr.name,
                attributeValueName: val
            };
            if (valueId !== undefined) {
                attrValObj.attributeValueId = valueId;
            }
            return attrValObj;
        }).filter(Boolean);

        payload.variants.push({
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: imgKey, // Gửi key map, không gửi tên file
            attributeValues: variantAttrValues 
        });
    });

    // B5: Đóng gói FormData
    const formData = new FormData();

    // --- XỬ LÝ ẢNH MAIN (QUAN TRỌNG THEO ẢNH CHAT) ---
    if(state.mainImageFile) {
        // 1. Trong JSON: Đặt cứng tên là "productImage"
        // (Đây là tên để map, không cần đuôi .png)
        payload.productDetailDTO.imageName = "productImage";

        // 2. Trong FormData: Append file với key y hệt là "productImage"
        formData.append("productImage", state.mainImageFile);
    }
    // ----------------------------------------------------
    
    // Append các ảnh biến thể (nếu có)
    state.variants.forEach((v, idx) => {
        if(v.rawFile) {
            // Key map: image_variant_0, image_variant_1...
            formData.append(`image_variant_${idx}`, v.rawFile);
        }
    });
    
    // Append JSON
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    console.log("=== FINAL PAYLOAD (FIXED) ===", JSON.stringify(payload, null, 2));

    // B6: Gửi API
    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            if(typeof showDialog === 'function') await showDialog("success", "Thành công!");
            else alert("Thành công!");
            
            UI.switchView('list');
            reloadData();
        } else {
             const errorMsg = res?.message || "Lỗi không xác định";
             if(typeof showDialog === 'function') await showDialog("error", errorMsg);
             else alert("Lỗi: " + errorMsg);
        }
    } catch(err) {
        console.error(err);
        alert("Lỗi hệ thống: " + err.message);
    }
}