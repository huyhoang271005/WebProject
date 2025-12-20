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
        // ID sản phẩm đang test
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

        // --- XỬ LÝ DỮ LIỆU ĐỂ HIỂN THỊ ---
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
        
        // Render Select Danh mục
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
    // 1. Nút mở form thêm mới
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

    // 2. Nút Quay lại
    const btnBack = document.getElementById("btnBackToList");
    if (btnBack) {
        btnBack.onclick = () => {
            UI.switchView('list');
            reloadData();
        };
    }

    // 3. Nút Thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => {
            UI.addAttrRow("", "", null, null, [], {}, state.attributes);
        };
    }

    // 4. Nút Tạo biến thể
    const btnGenVariants = document.getElementById("btnGenerateVariants");
    if (btnGenVariants) {
        btnGenVariants.onclick = () => {
            handleCalcVariants();
        };
    }

    // 5. Sự kiện chọn danh mục -> load thương hiệu
    if (UI.els.cateSelect) {
        UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    }

    // 6. Sự kiện chọn ảnh chính (Upload)
    if (UI.els.mainImgInput) {
        UI.els.mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }

    // 7. Submit Form
    const form = document.getElementById("productForm");
    if (form) form.onsubmit = handleSave;
    
    // 8. Nút Làm mới (Reset)
    const btnReset = document.getElementById("resetBtn");
    if(btnReset) {
        btnReset.onclick = () => UI.resetForm(state.isEdit);
    }
}

// === CÁC HÀM GLOBAL (để gọi từ onclick HTML) ===
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
        
        // Fill data form cơ bản
        if(document.getElementById("productName")) 
            document.getElementById("productName").value = detail.productName;
        
        if(document.getElementById("description")) 
            document.getElementById("description").value = detail.description || "";
        
        if(document.getElementById("price")) 
            document.getElementById("price").value = detail.price;
        
        if(document.getElementById("priceOriginal")) 
            document.getElementById("priceOriginal").value = detail.originalPrice;
        
        // Fill Select Category & Brand
        if(UI.els.cateSelect) {
            UI.els.cateSelect.value = detail.categoryId;
            UI.renderBrands(state.brands, detail.categoryId, detail.brandId);
        }

        // Xử lý ảnh
        if(detail.imageUrl) {
            UI.renderMainImage(detail.imageUrl);
        } else if(detail.imageName) {
            UI.renderMainImage(`/images/${detail.imageName}`);
        }
    };

    // Chọn ảnh variant
    window.handleSelectVariantImage = (index, input) => {
        const file = input.files[0];
        if (file && state.variants[index]) {
            state.variants[index].rawFile = file;
            state.variants[index].previewUrl = URL.createObjectURL(file);
            UI.renderVariants(state.variants);
        }
    };

window.applyBulkInfo = () => {
    const pOrg = document.getElementById("bulk_price_org")?.value;
    const pSell = document.getElementById("bulk_price")?.value;
    const stock = document.getElementById("bulk_stock")?.value;

    // Duyệt qua tất cả variants và gán giá trị nếu ô nhập có dữ liệu
    state.variants.forEach(v => {
        if (pOrg) v.priceOriginal = parseFloat(pOrg);
        if (pSell) v.price = parseFloat(pSell);
        if (stock) v.stock = parseInt(stock);
    });

    // Render lại bảng để thấy thay đổi
    UI.renderVariants(state.variants);
};

    window.updateVar = (i, field, value) => {
        if(state.variants[i]) state.variants[i][field] = value;
    };

    window.removeVariant = (i) => {
        state.variants.splice(i, 1);
        UI.renderVariants(state.variants);
    };
}

// Tính toán biến thể từ thuộc tính
function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    const basePrice = parseFloat(document.getElementById("price").value) || 0;
    const basePriceOriginal = parseFloat(document.getElementById("priceOriginal").value) || 0;
    
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
    UI.renderVariants(state.variants);
}

// Lưu (Create / Update)
async function handleSave(e) {
    e.preventDefault();
    
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

    // Build attributes payload
    const currentAttrs = VariantLogic.parseAttributesFromDOM();
    currentAttrs.forEach(attr => {
        const attrValues = attr.values.map(v => ({ attributeValueName: v }));
        payload.attributes.push({ 
            attributeName: attr.name, 
            attributeValues: attrValues,
            attributeId: attr.id 
        });
    });

    // Build variants payload
    state.variants.forEach((v, idx) => {
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;
        payload.variants.push({
            price: v.price,
            priceOriginal: v.priceOriginal || v.price,
            stock: v.stock,
            imageName: imgKey
        });
    });

    // FormData
    const formData = new FormData();
    if(state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage";
        formData.append("productImage", state.mainImageFile);
    }
    state.variants.forEach((v, idx) => {
        if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // Send API
    try {
        const res = await ProductService.createProduct(formData);
        if(res && res.success) {
            if(typeof showDialog === 'function') await showDialog("success", "Thành công!");
            else alert("Thành công");
            
            UI.switchView('list');
            reloadData();
        } else {
             if(typeof showDialog === 'function') await showDialog("error", res?.message || "Lỗi");
             else alert("Lỗi: " + (res?.message || "Unknown"));
        }
    } catch(err) {
        console.error(err);
        alert("Lỗi: " + err.message);
    }
}