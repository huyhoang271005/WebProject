// index.js
import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { UI } from "./ui.js";

// State toàn cục
let state = {
    products: [],
    categories: [],
    brands: [],
    attributes: [], // Master attributes
    variants: [],   // Current variants on form
    mainImageFile: null,
    isEdit: false,
    currentId: null,
    currentMainImageUrl: "" // Lưu url ảnh cũ khi edit
};

// === 1. KHỞI TẠO (ROUTING) ===
(async function init() {
    // Xác định đang ở trang nào
    const isListPage = !!document.getElementById("productTable");
    const isFormPage = !!document.getElementById("productForm");

    if (isListPage) {
        await initListPage();
    } else if (isFormPage) {
        await initFormPage();
    }
})();

// === 2. LOGIC TRANG DANH SÁCH ===
async function initListPage() {
    console.log("🚀 Init List Page");
    await reloadTableData();
    
    // Binding hàm global cho nút Xóa
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
}

async function reloadTableData() {
    try {
        const products = await ProductService.getAll({});
        state.products = products || [];
        UI.renderTable(state.products);
    } catch (e) {
        console.error("Lỗi tải danh sách:", e);
    }
}

// === 3. LOGIC TRANG FORM (ADD/EDIT) ===
async function initFormPage() {
    console.log("📝 Init Form Page");

    // 1. Load Master Data
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Render danh mục vào select
        const catSelect = document.getElementById("prodCate");
        catSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

    } catch (e) {
        console.error("Lỗi load master data:", e);
        await showDialog("error", "Không thể tải dữ liệu danh mục.");
    }

    // 2. Kiểm tra Mode (Add hay Edit) qua URL Param
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // --- EDIT MODE ---
        state.isEdit = true;
        state.currentId = productId;
        document.getElementById("formTitle").innerText = "Cập nhật sản phẩm";
        
        await loadProductDetail(productId);
    } else {
        // --- ADD MODE ---
        state.isEdit = false;
        document.getElementById("formTitle").innerText = "Thêm sản phẩm mới";
        // Thêm 1 dòng thuộc tính trống mặc định
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    }

    setupFormEventListeners();
}

async function loadProductDetail(id) {
    try {
        // Gọi API lấy chi tiết
        // Giả sử service có hàm getProductDetail(id) trả về JSON như bạn cung cấp
        const res = await ProductService.getProductDetail(id);

        if (res && res.success) {
            const data = res.data;
            
            // Gọi UI để fill data
            // Hàm trả về variants đã được map, ta lưu vào state
            state.variants = UI.fillForm(data, state.attributes, handleCalcVariants);
            
            // Lưu url ảnh cũ
            state.currentMainImageUrl = data.productDetailDTO.imageUrl;
            
            // Render lại brand đúng theo category đã fill
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
    // Submit
    document.getElementById("productForm").onsubmit = handleSave;

    // Chọn danh mục -> Load thương hiệu
    document.getElementById("prodCate").onchange = (e) => {
        UI.renderBrands(state.brands, e.target.value);
    };

    // Chọn ảnh chính
    document.getElementById("mainImgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            UI.renderMainImage(URL.createObjectURL(file));
        }
    };

    // Thêm thuộc tính
    document.getElementById("btnAddAttr").onclick = () => {
        UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    };

    // Các hàm global cho UI gọi ngược lại
    window.handleSelectVariantImage = (index, input) => {
        const file = input.files[0];
        if (file && state.variants[index]) {
            state.variants[index].imageFile = file; // File để upload
            state.variants[index].previewUrl = URL.createObjectURL(file); // Url để hiển thị
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

// Logic tính toán variants khi thay đổi thuộc tính
function handleCalcVariants() {
    // Logic này chỉ chạy khi user nhập tay thay đổi thuộc tính
    // Nếu đang fill form edit thì hạn chế gọi cái này tự động để tránh mất ID cũ
    
    // Parse attributes từ DOM
    const attrs = ProductLogic.parseAttributesFromDOM(); // Cần đảm bảo logic.js có hàm này
    const basePrice = parseFloat(document.getElementById("prodPrice").value) || 0;
    
    // Sinh variants mới, cố gắng giữ lại thông tin variants cũ nếu trùng tên
    state.variants = ProductLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}


// === 4. XỬ LÝ LƯU (SAVE) ===
async function handleSave(e) {
    e.preventDefault();

    // 1. Validate
    const prodName = document.getElementById("prodName").value.trim();
    const prodPrice = document.getElementById("prodPrice").value;
    const catId = document.getElementById("prodCate").value;
    const brandId = document.getElementById("prodBrand").value;

    if (!prodName || !prodPrice || !catId || !brandId) {
        await showDialog("error", "Vui lòng nhập đầy đủ thông tin (Tên, Giá, Danh mục, Thương hiệu)");
        return;
    }

    // 2. Chuẩn bị Payload JSON
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: prodName,
            description: document.getElementById("prodDesc").value,
            price: parseFloat(prodPrice),
            originalPrice: parseFloat(document.getElementById("prodOriginalPrice").value) || 0,
            categoryId: catId,
            brandId: brandId,
            // Nếu không có ảnh mới, backend có thể dùng null hoặc giữ nguyên tùy logic của bạn
            // Ở đây ta không gửi imageUrl trong JSON, backend tự xử lý file
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // Parse Attribute từ DOM để lấy ID mới nhất
    const currentAttrs = ProductLogic.parseAttributesFromDOM();
    
    currentAttrs.forEach(attr => {
        // Attribute ID: Nếu là mới (không có ID sẵn) -> null
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

    // Map Variants
    state.variants.forEach((v, index) => {
        // Variant ID
        const varId = (v.id && !v.id.toString().startsWith("new_")) ? v.id : null;
        
        // Key ảnh cho variant này (để backend map file)
        const imageKey = v.imageFile ? `image_variant_${index}` : null; 

        payload.variants.push({
            variantId: varId,
            price: parseFloat(v.price) || 0,
            originalPrice: parseFloat(v.priceOriginal) || 0,
            stock: parseInt(v.stock) || 0,
            imageName: imageKey // Backend sẽ dùng key này để tìm file trong request
        });

        // Map Variant Values (Dựa vào tên comboValues "Màu đỏ", "XL" để tìm ID)
        if (v.comboValues) {
            v.comboValues.forEach(valName => {
                // Tìm attribute nào chứa value này
                const parentAttr = currentAttrs.find(a => a.values.includes(valName));
                if (parentAttr) {
                    const valId = parentAttr.valueIdMap?.[valName];
                    // Chỉ gửi nếu có ID (nếu null backend tự tạo liên kết sau)
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

    // 3. Chuẩn bị FormData
    const formData = new FormData();
    
    // Ảnh chính
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage"; // Cờ hiệu
        formData.append("productImage", state.mainImageFile);
    }
    
    // Ảnh biến thể
    state.variants.forEach((v, index) => {
        if (v.imageFile) {
            formData.append(`image_variant_${index}`, v.imageFile);
        }
    });

    // JSON Blob
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // 4. Gửi API
    try {
        const res = await ProductService.saveProduct(formData); // Hàm save chung (tự check create/update bên trong hoặc tách ra)
        
        if (res && res.success) {
            await showDialog("success", state.isEdit ? "Cập nhật thành công!" : "Thêm mới thành công!");
            // Quay về trang list
            setTimeout(() => window.location.href = "index.html", 1000);
        } else {
            await showDialog("error", res?.message || "Lỗi lưu sản phẩm");
        }
    } catch (e) {
        console.error(e);
        await showDialog("error", "Lỗi kết nối: " + e.message);
    }
}