import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { UI } from "./ui.js";

// State toàn cục
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

// === 1. ĐIỂM KHỞI CHẠY (MAIN) ===
(async function main() {
    // Kiểm tra kỹ xem đang ở trang nào
    const tableEl = document.getElementById("productTable");
    const formEl = document.getElementById("productForm");

    if (tableEl) {
        // Đang ở trang danh sách (index.html)
        await initListPage();
    } else if (formEl) {
        // Đang ở trang thêm/sửa (add_product.html)
        await initFormPage();
    }
})();

// === 2. LOGIC TRANG DANH SÁCH ===
async function initListPage() {
    console.log("🚀 Init List Page");
    
    // --- QUAN TRỌNG: Khai báo hàm Global trước khi render bảng ---
    window.handleDelete = async (id) => {
        await showDialog("question", "Bạn có chắc chắn muốn xóa?", async () => {
            try {
                const res = await ProductService.deleteProduct(id);
                if (res && res.success) {
                    await showDialog("success", "Đã xóa sản phẩm");
                    await reloadTableData();
                } else {
                    await showDialog("error", res?.message || "Lỗi khi xóa");
                }
            } catch (e) {
                await showDialog("error", "Lỗi server: " + e.message);
            }
        });
    };

    // Sau đó mới tải dữ liệu
    await reloadTableData();
}

async function reloadTableData() {
    try {
        // Gọi API lấy danh sách (nếu server lỗi 500, xem lại file service.js)
        const products = await ProductService.getAll({}); 
        state.products = products || [];
        UI.renderTable(state.products);
    } catch (e) {
        console.error("Lỗi tải danh sách:", e);
        // Không show dialog lỗi ở đây để tránh spam popup nếu server chết
    }
}

// === 3. LOGIC TRANG FORM (ADD/EDIT) ===
async function initFormPage() {
    console.log("📝 Init Form Page");

    // 1. Load Master Data (Danh mục, Thương hiệu, Thuộc tính)
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // --- SỬA LỖI NULL: Kiểm tra element tồn tại trước khi gán innerHTML ---
        const catSelect = document.getElementById("prodCate");
        if (catSelect) {
            catSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
            state.categories.forEach(c => {
                catSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }

    } catch (e) {
        console.error("Lỗi load master data:", e);
        await showDialog("error", "Không thể tải dữ liệu danh mục.");
    }

    // 2. Kiểm tra xem là Thêm hay Sửa
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const titleEl = document.getElementById("formTitle"); // Lấy thẻ tiêu đề

    if (productId) {
        // --- EDIT MODE ---
        state.isEdit = true;
        state.currentId = productId;
        if(titleEl) titleEl.innerText = "Cập nhật sản phẩm";
        
        await loadProductDetail(productId);
    } else {
        // --- ADD MODE ---
        state.isEdit = false;
        if(titleEl) titleEl.innerText = "Thêm sản phẩm mới";
        
        // Thêm dòng thuộc tính trống đầu tiên
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    }

    setupFormEventListeners();
}

async function loadProductDetail(id) {
    try {
        const res = await ProductService.getProductDetail(id);
        if (res && res.success) {
            const data = res.data;
            // Fill data vào form
            state.variants = UI.fillForm(data, state.attributes, handleCalcVariants);
            
            // Lưu url ảnh cũ
            state.currentMainImageUrl = data.productDetailDTO.imageUrl;
            
            // Render lại brand
            const catId = data.productDetailDTO.categoryId;
            const brandId = data.productDetailDTO.brandId;
            if(catId) UI.renderBrands(state.brands, catId, brandId);
        } else {
            await showDialog("error", "Không tìm thấy dữ liệu sản phẩm");
        }
    } catch (e) {
        console.error(e);
        await showDialog("error", "Lỗi tải chi tiết sản phẩm");
    }
}

function setupFormEventListeners() {
    // 1. Submit Form
    const form = document.getElementById("productForm");
    if(form) form.onsubmit = handleSave;

    // 2. Chọn danh mục -> Load thương hiệu
    const prodCate = document.getElementById("prodCate");
    if(prodCate) {
        prodCate.onchange = (e) => {
            UI.renderBrands(state.brands, e.target.value);
        };
    }

    // 3. Chọn ảnh chính
    const mainImgInput = document.getElementById("mainImgInput");
    if(mainImgInput) {
        mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }

    // 4. Thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if(btnAddAttr) {
        btnAddAttr.onclick = () => {
            UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
        };
    }

    // 5. Global Helpers (Gắn vào window để HTML gọi được)
    window.handleSelectVariantImage = (index, input) => {
        const file = input.files[0];
        if (file && state.variants[index]) {
            state.variants[index].imageFile = file;
            state.variants[index].previewUrl = URL.createObjectURL(file);
            UI.renderVariants(state.variants);
        }
    };

    window.updateVar = (index, field, value) => {
        if (state.variants[index]) {
            state.variants[index][field] = value;
        }
    };

    window.removeVariant = (index) => {
        state.variants.splice(index, 1);
        UI.renderVariants(state.variants);
    };
}

// Logic tính toán variants
function handleCalcVariants() {
    const attrs = ProductLogic.parseAttributesFromDOM();
    const priceEl = document.getElementById("prodPrice");
    const basePrice = priceEl ? (parseFloat(priceEl.value) || 0) : 0;
    
    state.variants = ProductLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}


// === 4. XỬ LÝ LƯU (SAVE) ===
async function handleSave(e) {
    e.preventDefault();

    // Lấy value an toàn
    const getName = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    
    const prodName = getName("prodName").trim();
    const prodPrice = getName("prodPrice");
    const catId = getName("prodCate");
    const brandId = getName("prodBrand");
    const prodDesc = getName("prodDesc");
    const prodOriginalPrice = getName("prodOriginalPrice");

    if (!prodName || !prodPrice || !catId || !brandId) {
        await showDialog("error", "Vui lòng nhập đầy đủ thông tin bắt buộc!");
        return;
    }

    // Payload JSON
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: prodName,
            description: prodDesc,
            price: parseFloat(prodPrice),
            originalPrice: parseFloat(prodOriginalPrice) || 0,
            categoryId: catId,
            brandId: brandId
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // Logic Attributes
    const currentAttrs = ProductLogic.parseAttributesFromDOM();
    currentAttrs.forEach(attr => {
        const attrId = (attr.id && !attr.id.toString().startsWith("attr_")) ? attr.id : null;
        const attrValues = attr.values.map(valName => {
            const valId = attr.valueIdMap?.[valName];
            return {
                attributeValueId: (valId && !valId.toString().startsWith("val_")) ? valId : null,
                attributeValueName: valName
            };
        });
        payload.attributes.push({
            attributeId: attrId,
            attributeName: attr.name,
            attributeValues: attrValues
        });
    });

    // Logic Variants
    state.variants.forEach((v, index) => {
        const varId = (v.id && !v.id.toString().startsWith("new_")) ? v.id : null;
        const imageKey = v.imageFile ? `image_variant_${index}` : null; 

        payload.variants.push({
            variantId: varId,
            price: parseFloat(v.price) || 0,
            originalPrice: parseFloat(v.priceOriginal) || 0,
            stock: parseInt(v.stock) || 0,
            imageName: imageKey
        });

        if (v.comboValues) {
            v.comboValues.forEach(valName => {
                const parentAttr = currentAttrs.find(a => a.values.includes(valName));
                if (parentAttr) {
                    const valId = parentAttr.valueIdMap?.[valName];
                    if (valId && !valId.toString().startsWith("val_")) {
                        payload.variantValues.push({
                            variantId: varId,
                            attributeValueId: valId
                        });
                    }
                }
            });
        }
    });

    // FormData
    const formData = new FormData();
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage";
        formData.append("productImage", state.mainImageFile);
    }
    
    state.variants.forEach((v, index) => {
        if (v.imageFile) {
            formData.append(`image_variant_${index}`, v.imageFile);
        }
    });

    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    try {
        // Gọi API Save (tự check create/update)
        const res = await ProductService.saveProduct(formData); 
        
        if (res && res.success) {
            await showDialog("success", state.isEdit ? "Cập nhật thành công!" : "Thêm mới thành công!");
            setTimeout(() => window.location.href = "index.html", 1000);
        } else {
            await showDialog("error", res?.message || "Lỗi lưu sản phẩm");
        }
    } catch (e) {
        console.error(e);
        await showDialog("error", "Lỗi kết nối: " + e.message);
    }
}