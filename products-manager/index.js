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
    // 1. Load dữ liệu ban đầu
    await reloadData();
    
    // 2. Gắn sự kiện (Click, Submit...)
    setupEventListeners();
    
    // 3. Khai báo các hàm Global để HTML gọi được (onclick="...")
    setupGlobalFunctions();
})();

async function reloadData() {
    try {
        // ID của sản phẩm bạn muốn hiển thị (lấy từ file JSON bạn gửi)
        const targetId = "0af4a625-3409-4539-9121-cb811ec4bf32";

        // Thay đổi: Gọi getProductById thay vì getAll
        const [productData, cats, brands, attrs] = await Promise.all([
            ProductService.getProductById(targetId), // Sử dụng hàm có sẵn trong service
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        // --- XỬ LÝ DỮ LIỆU ĐỂ UI HIỂU ---
        let productList = [];
        
        // Kiểm tra nếu có dữ liệu trả về đúng cấu trúc JSON backend
        if (productData && productData.productDetailDTO) {
            const detail = productData.productDetailDTO;
            
            // Tạo ra object phẳng mà UI.js cần (gộp detail và variants)
            const uiItem = {
                productId: detail.productId,
                productName: detail.productName,
                price: detail.price,
                // Các trường hiển thị khác
                imageName: detail.imageName,
                imageUrl: detail.imageUrl,
                // UI cần variants để đếm số lượng (variants.length)
                variants: productData.variants || [], 
                // Tên danh mục/thương hiệu (hiện tại backend trả về null trong JSON mẫu, 
                // nên tạm thời để trống hoặc map từ list categories nếu cần)
                categoryName: "-", 
                brandName: "-"
            };

            // Quan trọng: Bỏ vào mảng [] vì renderTable dùng .map()
            productList = [uiItem]; 
        }

        // Gán vào state
        state.products = productList;
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Render ra bảng
        UI.renderTable(state.products);
        
        // Render danh mục vào select (giữ nguyên logic cũ)
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
    // Nút mở form thêm mới
    const btnAdd = document.getElementById("btnOpenAdd");
    if (btnAdd) {
        btnAdd.onclick = () => {
            state.isEdit = false;
            state.currentId = null;
            state.variants = [];
            state.mainImageFile = null;
            
            UI.resetForm(false);
            // Thêm 1 dòng thuộc tính mặc định
            UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
            UI.switchView('form');
        };
    }

    // Nút Quay lại (ở header form)
    const btnBack = document.getElementById("btnBack");
    if (btnBack) {
        btnBack.onclick = () => {
            UI.switchView('list');
            reloadData(); // Load lại dữ liệu mới nhất
        };
    }

    // Nút Thêm thuộc tính
    const btnAddAttr = document.getElementById("btnAddAttr");
    if (btnAddAttr) {
        btnAddAttr.onclick = () => UI.addAttrRow("", "", handleCalcVariants, null, [], {}, state.attributes);
    }

    // Sự kiện chọn danh mục -> load thương hiệu
    if (UI.els.cateSelect) {
        UI.els.cateSelect.onchange = (e) => UI.renderBrands(state.brands, e.target.value);
    }

    // Sự kiện chọn ảnh chính
    if (UI.els.mainImgInput) {
        UI.els.mainImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            }
        };
    }

    // Submit Form
    const form = document.getElementById("productForm");
    if (form) form.onsubmit = handleSave;
}

// === CÁC HÀM XỬ LÝ ===

function setupGlobalFunctions() {
    // Hàm XÓA (Fix lỗi ReferenceError)
    window.deleteProduct = async (id) => {
        await showDialog("question", "Bạn có chắc muốn xóa?", async () => {
            const res = await ProductService.delete(id); // Đảm bảo service.js có hàm delete (hoặc deleteProduct)
            // Nếu service chưa có delete, thay bằng callAPI delete
            if (res && res.success) {
                await showDialog("success", "Đã xóa thành công");
                reloadData();
            } else {
                await showDialog("error", "Lỗi khi xóa: " + (res?.message || "Unknown"));
            }
        });
    };

    // Hàm SỬA
    window.editProduct = async (id) => {
        // Gọi API lấy chi tiết (nếu có) hoặc tìm trong danh sách state
        // Ở đây demo tìm trong state
        const product = state.products.find(p => p.productId === id);
        if (!product) return;

        state.isEdit = true;
        state.currentId = id;
        state.variants = []; 
        state.mainImageFile = null;

        UI.resetForm(true);
        UI.switchView('form');
        
        // Fill data cơ bản
        document.getElementById("prodName").value = product.productName;
        document.getElementById("prodPrice").value = product.price;
        // ... (điền thêm các trường khác)

        // Nếu muốn chuẩn chỉnh, nên gọi API getDetail ở đây để lấy attributes/variants đầy đủ
        // const detail = await ProductService.getProductDetail(id);
        // UI.fillForm(detail...);
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
}

function handleCalcVariants() {
    const attrs = VariantLogic.parseAttributesFromDOM();
    const basePrice = parseFloat(document.getElementById("prodPrice").value) || 0;
    state.variants = VariantLogic.generateVariants(attrs, basePrice, state.variants);
    UI.renderVariants(state.variants);
}

async function handleSave(e) {
    e.preventDefault();
    
    // 1. Payload
    const payload = {
        productDetailDTO: {
            productId: state.isEdit ? state.currentId : null,
            productName: document.getElementById("prodName").value,
            description: document.getElementById("prodDesc").value,
            price: parseFloat(document.getElementById("prodPrice").value) || 0,
            originalPrice: parseFloat(document.getElementById("prodOriginalPrice").value) || 0,
            categoryId: document.getElementById("prodCate").value,
            brandId: document.getElementById("prodBrand").value,
            imageName: state.currentMainImageUrl || "" 
        },
        attributes: [], variants: [], variantValues: []
    };

    // Logic build attributes & variants (giữ nguyên logic bạn đã có)
    const currentAttrs = VariantLogic.parseAttributesFromDOM();
    // ... code map attributes vào payload ...
    currentAttrs.forEach(attr => {
        const attrValues = attr.values.map(v => ({ attributeValueName: v }));
        payload.attributes.push({ 
            attributeName: attr.name, 
            attributeValues: attrValues,
            attributeId: attr.id // Nếu edit
        });
    });

    state.variants.forEach((v, idx) => {
        const imgKey = v.rawFile ? `image_variant_${idx}` : null;
        payload.variants.push({
            price: v.price,
            stock: v.stock,
            imageName: imgKey,
            // Logic map variant values...
        });
    });

    // 2. FormData
    const formData = new FormData();
    if(state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage";
        formData.append("productImage", state.mainImageFile);
    }
    state.variants.forEach((v, idx) => {
        if(v.rawFile) formData.append(`image_variant_${idx}`, v.rawFile);
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // 3. Send
    try {
        const res = await ProductService.save(formData);
        if(res && res.success) {
            await showDialog("success", "Thành công!");
            UI.switchView('list');
            reloadData();
        } else {
            await showDialog("error", res?.message || "Lỗi");
        }
    } catch(err) {
        console.error(err);
        await showDialog("error", "Lỗi: " + err.message);
    }
}