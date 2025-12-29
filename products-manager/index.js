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
        // ID Test giả định, thực tế bạn có thể bỏ hoặc xử lý logic khác
        const targetId = "6786aedf-aa81-44ef-b28f-06abff1b5c1c"; 
        const [productData] = await ProductService.getProductById(targetId);
        await ProductService.getInfo()
        const cats = ProductService.getCategories;
        const brands = ProductService.getBrands;
        const attrs = ProductService.getAttributes;

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

// === LOGIC SAVE ĐÃ CẬP NHẬT ===
async function handleSave(e) {
    e.preventDefault();
    
    // 1. Lấy dữ liệu thuộc tính từ giao diện
    const currentAttrs = VariantLogic.parseAttributesFromDOM();

    // 2. CHECK AN TOÀN
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        const msg = "⚠️ Bạn chưa tạo biến thể!\nVui lòng nhấn nút màu xanh 'Tạo biến thể' trước khi lưu.";
        if(typeof showDialog === 'function') await showDialog("error", msg);
        else alert(msg);
        return; 
    }

    // 3. Chuẩn bị khung Payload
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

    // 4. Build Attributes (Định nghĩa thuộc tính cho sản phẩm)
    // Map này dùng để tra cứu ID ở bước 5
    const attrValueIdMap = {}; 
    
    currentAttrs.forEach(attr => {
        const attrValues = attr.values.map(v => {
            // Kiểm tra xem giá trị này đã có ID trong database chưa (trường hợp sửa sản phẩm cũ)
            const existingValueId = attr.valueIdMap[v];
            

            const finalId = existingValueId ? existingValueId : null;
            
            // Lưu vào map để lát nữa Step 5 dùng lại
            attrValueIdMap[`${attr.id}-${v}`] = finalId;
            
            return { 
                attributeValueName: v,
                attributeValueId: finalId // Gửi NULL hoặc UUID thật
            };
        });
        
        payload.attributes.push({ 
            attributeName: attr.name, 
            attributeValues: attrValues,
            attributeId: attr.id 
        });
    });

    // 5. Build Variants (Danh sách biến thể)
    state.variants.forEach((v, idx) => {
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;
        
        // Tạo attributeValues với đầy đủ thông tin ID
        const variantAttrValues = v.comboValues.map((val, valIdx) => {
            const attr = currentAttrs[valIdx];
            if (!attr) {
                console.error(`Không tìm thấy attribute tại index ${valIdx}`);
                return null;
            }
            
            const attrId = attr.id;
            // Key để tìm trong Map
            const mapKey = `${attrId}-${val}`;
            
            // Lấy ID từ map ở bước 4.
            // Nếu là giá trị mới thì nó tự động lấy ra NULL (vì nãy mình gán null rồi)
            const valueId = attrValueIdMap[mapKey];
            
            return {
                attributeId: attrId,
                attributeValueId: valueId, // Gọn gàng, chính xác logic backend
                attributeName: attr.name,
                attributeValueName: val
            };
        }).filter(Boolean);

        payload.variants.push({
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: imgKey,
            attributeValues: variantAttrValues 
        });
    });

    // 6. Đóng gói FormData
    const formData = new FormData();
    if(state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage";
        formData.append("productImage", state.mainImageFile);
    }
    state.variants.forEach((v, idx) => {
        if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // DEBUG: In ra để kiểm tra
    console.log("=== PAYLOAD DEBUG ===");
    console.log("Payload JSON:", JSON.stringify(payload, null, 2));

    // 7. Gửi API
    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            if(typeof showDialog === 'function') await showDialog("success", "Thành công!");
            else alert("Thành công");
            
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