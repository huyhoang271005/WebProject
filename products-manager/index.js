// index.js
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
    setupEventListeners();
    setupGlobalFunctions();

    // 1. Load các dữ liệu nền
    await loadBaseData();
    
    // 2. Load danh sách sản phẩm (để hiển thị bảng)
    await loadProductList(); 

    // 3. Kiểm tra URL xem có ID sản phẩm cần sửa không?
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // ==> CÓ ID: Chuyển sang chế độ SỬA
        console.log("Phát hiện ID từ URL:", productId);
        UI.switchView('form'); // Bắt buộc chuyển sang view Form
        await window.editProduct(productId);
        
        const titleEl = document.querySelector("#createView h2");
        if(titleEl) titleEl.innerText = "Cập Nhật Sản Phẩm";
    } else {
        // ==> KHÔNG CÓ ID: Mặc định ở List View
        UI.switchView('list');
    }
})();

async function loadBaseData() {
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Render Select Danh mục
        if (UI.els.cateSelect) {
            UI.els.cateSelect.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
            state.categories.forEach(c => {
                UI.els.cateSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }
    } catch (e) {
        console.error("Lỗi loadBaseData:", e);
    }
}

// Hàm mới: Load danh sách sản phẩm ra bảng
async function loadProductList() {
    try {
        // Lưu ý: Bạn cần đảm bảo ProductService có hàm getProducts() hoặc tương đương
        // Nếu API trả về phân trang, bạn cần xử lý thêm. Ở đây giả định lấy listData.
        // const res = await ProductService.getProducts(); 
        // const products = res?.data?.listData || [];
        
        // TẠM THỜI: Nếu chưa có API getProducts, để trống hoặc mock dữ liệu để test UI
        const products = []; 
        state.products = products;
        UI.renderTable(products);
    } catch (e) {
        console.error("Lỗi loadProductList:", e);
    }
}

// === 2. SỰ KIỆN (ĐÃ FIX ĐẦY ĐỦ) ===
function setupEventListeners() {
    // 1. Nút "Thêm sản phẩm" (Chuyển từ List -> Form)
    const btnOpenCreate = document.getElementById("btnOpenCreate");
    if (btnOpenCreate) {
        btnOpenCreate.onclick = () => {
            UI.switchView('form');
            UI.resetForm(false);
            state.isEdit = false;
            state.currentId = null;
            const titleEl = document.querySelector("#createView h2");
            if(titleEl) titleEl.innerText = "Thêm Sản Phẩm Mới";
        };
    }

    // 2. Nút "Quay lại" (Chuyển từ Form -> List)
    const btnBackToList = document.getElementById("btnBackToList");
    if (btnBackToList) {
        btnBackToList.onclick = () => {
            UI.switchView('list');
            loadProductList(); // Reload lại bảng khi quay về
        };
    }

    // 3. Nút Reset Form
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) btnReset.onclick = () => UI.resetForm(state.isEdit); 
    
    // 4. Nút thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) btnAddAttr.onclick = () => { UI.addAttrRow("", "", null, null, [], {}, state.attributes); };
    
    // 5. Nút tạo biến thể
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) btnGenVariants.onclick = () => { handleCalcVariants(); };
    
    // 6. Select Danh mục -> Load Brand tương ứng
    if (UI.els.cateSelect) UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    
    // 7. Input ảnh chính (Preview)
    if (UI.els.mainImgInput) {
        UI.els.mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }
    
    // 8. Submit Form
    const form = document.getElementById("productForm");
    if (form) form.onsubmit = handleSave;
}

// === 3. HÀM GLOBAL (GẮN VÀO WINDOW) ===
function setupGlobalFunctions() {
    // Hàm gọi khi bấm nút "Sửa" ở bảng
    window.editProduct = async (id) => {
        const fullData = await ProductService.getProductById(id);
        if (!fullData || !fullData.productDetailDTO) {
            alert("Không tìm thấy dữ liệu sản phẩm!");
            return;
        }

        const detail = fullData.productDetailDTO;
        const attributes = fullData.attributes || [];
        const variants = fullData.variants || [];
        const variantValues = fullData.variantValues || [];

        // Setup State
        state.isEdit = true;
        state.currentId = id;
        state.variants = []; 
        state.mainImageFile = null;
        state.currentMainImageUrl = detail.imageName || ""; 
        
        UI.resetForm(true);
        
        // QUAN TRỌNG: Chuyển sang view form để người dùng thấy
        UI.switchView('form'); 
        
        // Điền thông tin cơ bản
        const setVal = (elmId, val) => { if(document.getElementById(elmId)) document.getElementById(elmId).value = val; };
        
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

        // Khôi phục thuộc tính
        attributes.forEach(attr => {
            const valuesString = attr.attributeValues.map(v => v.attributeValueName).join(", ");
            const valueIdMap = {};
            attr.attributeValues.forEach(v => { valueIdMap[v.attributeValueName] = v.attributeValueId; });

            UI.addAttrRow(attr.attributeName, valuesString, null, attr.attributeId, [], valueIdMap, state.attributes);
        });

        // Khôi phục biến thể
        state.variants = variants.map(v => {
            const relatedValues = variantValues.filter(vv => vv.variantId === v.variantId);
            const comboValues = attributes.map(attr => {
                const match = attr.attributeValues.find(av => relatedValues.some(rv => rv.attributeValueId === av.attributeValueId));
                return match ? match.attributeValueName : "?";
            });

            return {
                id: v.variantId,
                name: comboValues.join(" - "), 
                comboValues: comboValues,
                price: v.price,
                priceOriginal: v.originalPrice, 
                stock: v.stock,
                imageName: v.imageName || "",
                imageUrl: v.imageUrl || "", 
                previewUrl: v.imageUrl || "",
                rawFile: null
            };
        });

        UI.renderVariants(state.variants);
    };

    window.deleteProduct = async (id) => {
        if(!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
        // Gọi API xóa ở đây (nếu có trong service)
        // await ProductService.deleteProduct(id);
        alert("Đã xóa (Demo)");
        await loadProductList();
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

// === 4. LOGIC SAVE ===
async function handleSave(e) {
    e.preventDefault();
    
    // Validate cơ bản
    if (state.variants.length === 0) {
        // Nếu không có biến thể, kiểm tra xem có nhập thuộc tính rác không
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        if (currentAttrs.length > 0) {
            alert("⚠️ Bạn đã nhập thuộc tính nhưng chưa nhấn 'Tạo biến thể'!");
            return;
        }
        // Nếu là sản phẩm đơn thể (không có biến thể), có thể cần logic riêng hoặc tự tạo 1 biến thể mặc định ẩn
    }

    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    if(submitBtn) submitBtn.disabled = true;
    if(spinner) spinner.classList.remove("d-none");

    try {
        const currentAttrs = VariantLogic.parseAttributesFromDOM();
        
        // Chuẩn bị Payload
        const payload = {
            productDetailDTO: {
                productId: state.isEdit ? state.currentId : null,
                productName: document.getElementById("productName").value,
                description: document.getElementById("description").value,
                price: parseFloat(document.getElementById("price").value) || 0,
                originalPrice: parseFloat(document.getElementById("priceOriginal").value) || 0,
                categoryId: document.getElementById("categoryId").value, 
                brandId: document.getElementById("brandId").value,
                imageName: state.isEdit ? state.currentMainImageUrl : "productImage"
            },
            attributes: [], 
            variants: [], 
            variantValues: []
        };

        const attrValueMap = {}; 
        const timeNow = Date.now();

        // Xử lý Attributes
        currentAttrs.forEach((attr, attrIdx) => {
            const attributeId = attr.id ? attr.id : `attr_${timeNow}_${attrIdx}`;
            const attrValues = attr.values.map((v, vIdx) => {
                const existingValueId = attr.valueIdMap[v];
                const finalValueId = existingValueId ? existingValueId : `val_${timeNow}_${attrIdx}_${vIdx}`;
                attrValueMap[`${attrIdx}-${v}`] = finalValueId;
                return { attributeValueId: finalValueId, attributeValueName: v };
            });
            payload.attributes.push({ 
                attributeId: attributeId, 
                attributeName: attr.name, 
                attributeValues: attrValues
            });
        });

        // Xử lý Variants
        state.variants.forEach((v, idx) => {
            const variantTempId = state.isEdit && v.id && !v.id.toString().startsWith("new_") 
                ? v.id 
                : `var_${timeNow}_${idx}`;
                
            const imgKey = v.rawFile ? `image_variant_${idx}` : null;

            payload.variants.push({
                variantId: variantTempId,
                price: v.price,
                originalPrice: v.priceOriginal || v.price,
                stock: v.stock,
                imageName: imgKey,
                attributeValues: [] 
            });

            v.comboValues.forEach((val, valIdx) => {
                const valueId = attrValueMap[`${valIdx}-${val}`];
                if (valueId) {
                    payload.variantValues.push({ variantId: variantTempId, attributeValueId: valueId });
                }
            });
        });

        // Đóng gói FormData
        const formData = new FormData();
        if(state.mainImageFile) formData.append("productImage", state.mainImageFile);
        
        state.variants.forEach((v, idx) => {
            if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
        });
        
        formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

        // Gửi API
        const res = await ProductService.createProduct(formData);
        
        if(res && (res.success || res.status === 200)) { // Check flexible tùy response backend
            alert("Thành công!");
            UI.switchView('list');
            await loadProductList();
        } else {
             const errorMsg = res?.message || "Lỗi server";
             alert("Lỗi: " + errorMsg);
        }
    } catch(err) {
        console.error(err);
        alert("Lỗi hệ thống: " + err.message);
    } finally {
        if(submitBtn) submitBtn.disabled = false;
        if(spinner) spinner.classList.add("d-none");
    }
}