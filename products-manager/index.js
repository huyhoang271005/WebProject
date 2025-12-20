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
        // ID Test (có thể thay đổi tùy logic của bạn)
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

        // Map dữ liệu vào bảng (nếu có)
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
        
        // Render Select danh mục
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

// === 2. SỰ KIỆN (BUTTONS) ===
function setupEventListeners() {
    // Nút mở form tạo mới
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
    
    // Nút quay lại danh sách
    const btnBack = document.getElementById("btnBackToList");
    if (btnBack) {
        btnBack.onclick = () => { 
            UI.switchView('list'); 
            reloadData(); 
        };
    }
    
    // Nút thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => { 
            UI.addAttrRow("", "", null, null, [], {}, state.attributes); 
        };
    }
    
    // Nút tạo biến thể (Generate)
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) {
        btnGenVariants.onclick = () => { 
            handleCalcVariants(); 
        };
    }
    
    // Select Danh mục -> Load thương hiệu
    if (UI.els.cateSelect) {
        UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    }
    
    // Input ảnh chính
    if (UI.els.mainImgInput) {
        UI.els.mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }
    
    // Form Submit
    const form = document.getElementById("productForm");
    if (form) form.onsubmit = handleSave;
    
    // Nút Reset
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) { 
        btnReset.onclick = () => UI.resetForm(state.isEdit); 
    }
}

// === 3. HÀM TOÀN CỤC (Gắn vào window để gọi từ HTML) ===
function setupGlobalFunctions() {
    // Sửa sản phẩm
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
        
        // Fill dữ liệu vào form
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
        
        setVal("productName", detail.productName);
        setVal("description", detail.description || "");
        setVal("price", detail.price);
        setVal("priceOriginal", detail.originalPrice);
        
        if(UI.els.cateSelect) {
            UI.els.cateSelect.value = detail.categoryId;
            UI.renderBrands(state.brands, detail.categoryId, detail.brandId);
        }
        
        // Render ảnh chính
        if(detail.imageUrl) UI.renderMainImage(detail.imageUrl);
        else if(detail.imageName) UI.renderMainImage(`/images/${detail.imageName}`);
        
        // TODO: Phần load thuộc tính cũ lên form (nếu cần xử lý phức tạp hơn thì thêm logic ở đây)
    };

    // Chọn ảnh cho variant
    window.handleSelectVariantImage = (index, input) => {
        const file = input.files[0];
        if (file && state.variants[index]) {
            state.variants[index].rawFile = file;
            state.variants[index].previewUrl = URL.createObjectURL(file);
            UI.renderVariants(state.variants);
        }
    };

    // Update giá/kho variant
    window.updateVar = (i, field, value) => {
        if(state.variants[i]) state.variants[i][field] = value;
    };

    // Xóa variant
    window.removeVariant = (i) => {
        state.variants.splice(i, 1);
        UI.renderVariants(state.variants);
    };

    // Áp dụng hàng loạt
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

// === 4. LOGIC XỬ LÝ ===

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    const basePrice = parseFloat(document.getElementById("price").value) || 0;
    const basePriceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    UI.renderVariants(state.variants);
}

// --- HÀM LƯU QUAN TRỌNG (ĐÃ FIX LỖI) ---
async function handleSave(e) {
    e.preventDefault();
    
    // B1: Lấy thông tin thuộc tính hiện tại
    const currentAttrs = VariantLogic.parseAttributesFromDOM();

    // Validate
    if (currentAttrs.length > 0 && state.variants.length === 0) {
        const msg = "⚠️ Bạn chưa tạo biến thể!\nVui lòng nhấn nút màu xanh 'Tạo biến thể' trước khi lưu.";
        if(typeof showDialog === 'function') await showDialog("error", msg);
        else alert(msg);
        return; 
    }

    // B2: Chuẩn bị Payload cơ bản
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

    // B3: Xử lý Attributes & ID Mapping
    // Map này dùng để tra cứu ID: Key="AttrId-ValueName" => Value=ID (hoặc undefined)
    const attrValueIdMap = {}; 
    
    currentAttrs.forEach(attr => {
        const attrValues = attr.values.map(v => {
            // Check xem giá trị này có ID từ database chưa
            const existingValueId = attr.valueIdMap[v];
            
            // QUAN TRỌNG: Nếu không có ID cũ -> Gán undefined để JSON bỏ qua key này
            const finalId = existingValueId ? existingValueId : undefined;
            
            // Lưu vào map
            attrValueIdMap[`${attr.id}-${v}`] = finalId;
            
            // Tạo object Attribute Value
            const valObj = { attributeValueName: v };
            // Chỉ thêm key Id nếu nó tồn tại
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

    // B4: Xử lý Variants
    state.variants.forEach((v, idx) => {
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;
        
        const variantAttrValues = v.comboValues.map((val, valIdx) => {
            const attr = currentAttrs[valIdx];
            if (!attr) return null;
            
            const attrId = attr.id;
            const mapKey = `${attrId}-${val}`;
            const valueId = attrValueIdMap[mapKey]; // Lấy ID (hoặc undefined) từ map trên
            
            // Tạo object cho Variant
            const attrValObj = {
                attributeId: attrId,
                attributeName: attr.name,
                attributeValueName: val
            };
            
            // QUAN TRỌNG: Chỉ thêm key Id nếu có giá trị thực
            if (valueId !== undefined) {
                attrValObj.attributeValueId = valueId;
            }

            return attrValObj;
        }).filter(Boolean);

        payload.variants.push({
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: imgKey,
            attributeValues: variantAttrValues 
        });
    });

    // B5: Đóng gói vào FormData (Multipart/form-data)
    const formData = new FormData();
    
    // Ảnh chính
    if(state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage";
        formData.append("productImage", state.mainImageFile);
    }
    
    // Ảnh biến thể
    state.variants.forEach((v, idx) => {
        if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
    });
    
    // JSON Data
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // Debug xem payload sạch chưa
    console.log("=== FINAL PAYLOAD ===", JSON.stringify(payload, null, 2));

    // B6: Gọi Service
    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            if(typeof showDialog === 'function') await showDialog("success", "Thành công!");
            else alert("Thành công: " + (res.message || "Đã lưu sản phẩm"));
            
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