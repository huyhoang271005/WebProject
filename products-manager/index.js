import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { ProductUI } from "./ui.js";

let state = {
    products: [], categories: [], brands: [], attributes: [],
    variants: [], selectedAttributes: [], mainImageFile: null,
    currentProductId: null 
};

// --- LOAD DANH SÁCH ---
async function loadProductList() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5">Đang tải dữ liệu... <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    
    try {
        const testId = "0af4a625-3409-4539-9121-cb811ec4bf32"; // ID từ JSON bạn gửi
        const data = await ProductService.getProductById(testId);

        if (data && data.productDetailDTO) {
            state.products = [data.productDetailDTO];
            state.products[0].fullData = data; 
            ProductUI.renderProductList(state.products, state.categories, state.brands);
            attachEditEvents();
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Không tìm thấy sản phẩm.</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Lỗi kết nối API.</td></tr>';
    }
}

function attachEditEvents() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleEdit(btn.dataset.id);
        });
    });
}

function renderBrandOptions(categoryId, selectedBrandId = null) {
    const brandSelect = document.getElementById("brandId");
    brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';

    let filteredBrands = [];
    if (categoryId) filteredBrands = state.brands.filter(b => b.categoryId == categoryId);
    if (filteredBrands.length === 0 && state.brands.length > 0) filteredBrands = state.brands; 

    if (filteredBrands.length > 0) {
        filteredBrands.forEach(b => {
            brandSelect.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
        });
    } else {
        brandSelect.innerHTML += '<option disabled>Không có dữ liệu thương hiệu</option>';
    }

    if (selectedBrandId) {
        setTimeout(() => { brandSelect.value = selectedBrandId; }, 0);
    }
}

// [HÀM SỬA - ĐÃ CẬP NHẬT LOGIC MAP JSON]
function handleEdit(id) {
    const product = state.products.find(p => p.productId === id);
    if (!product || !product.fullData) return;
    const fullData = product.fullData;

    ProductUI.toggleView('create');
    document.querySelector('#createView h2').textContent = "Cập Nhật Sản Phẩm";
    document.getElementById('submitBtn').innerHTML = '<span class="spinner-border spinner-border-sm d-none" id="submitSpinner"></span> Lưu thay đổi';
    
    state.currentProductId = id;

    // 1. Fill thông tin cơ bản
    document.getElementById("productName").value = product.productName;
    document.getElementById("description").value = product.description || "";
    document.getElementById("price").value = product.price;
    document.getElementById("priceOriginal").value = product.originalPrice;
    
    // 2. Fill Category & Brand
    if(product.categoryId) {
        document.getElementById("categoryId").value = product.categoryId;
    } else {
        document.getElementById("categoryId").value = "";
    }
    renderBrandOptions(product.categoryId, product.brandId);

    if (product.imageUrl) {
        document.getElementById('mainImagePreview').innerHTML = `<img src="${product.imageUrl}" class="img-thumbnail mt-2" style="max-height: 150px;">`;
    }

    // 3. Fill Attributes (Lấy từ fullData.attributes)
    ProductUI.state.isEditingMode = true; 
    document.getElementById('selectedAttributesList').innerHTML = "";
    
    // Map dữ liệu thuộc tính
    const uiAttributes = (fullData.attributes || []).map(attr => ({
        attributeId: attr.attributeId,
        attributeName: attr.attributeName,
        values: attr.attributeValues.map(v => ({ id: v.attributeValueId, name: v.attributeValueName }))
    }));

    uiAttributes.forEach(attr => ProductUI.addAttributeRow(attr));
    ProductUI.state.selectedAttributes = uiAttributes;

    // 4. Fill Variants (Logic KHÓ: Ghép variantValues để tìm tên)
    const apiVariants = fullData.variants || [];
    const apiVariantValues = fullData.variantValues || [];

    const uiVariants = apiVariants.map(v => {
        // Tìm tất cả variantValues khớp với variantId này
        const relatedValues = apiVariantValues.filter(vv => vv.variantId === v.variantId);
        
        // Từ relatedValues -> Tìm tên (VD: X, Xanh)
        // Cần duyệt qua uiAttributes để tìm tên dựa vào attributeValueId
        const names = relatedValues.map(vv => {
            for (const attr of uiAttributes) {
                const foundVal = attr.values.find(val => val.id === vv.attributeValueId);
                if (foundVal) return foundVal.name;
            }
            return "?";
        });

        // Tạo combination giả để logic update hoạt động
        const combination = relatedValues.map(vv => {
            // Tìm attributeId và attributeName
             for (const attr of uiAttributes) {
                const foundVal = attr.values.find(val => val.id === vv.attributeValueId);
                if (foundVal) return {
                    attributeId: attr.attributeId, attributeName: attr.attributeName,
                    valueId: foundVal.id, valueName: foundVal.name
                };
            }
            return {};
        });

        return {
            variantId: v.variantId, 
            displayName: names.length > 0 ? names.join(' - ') : "Biến thể cũ", 
            combination: combination, // Gán combination để khi Save có dữ liệu
            price: v.price,
            priceOriginal: v.originalPrice,
            stock: v.stock,
            imageUrl: v.imageUrl,
            imageFile: null
        };
    });
    
    ProductUI.state.variants = uiVariants;
    ProductUI.renderVariantsTable();
    ProductUI.state.isEditingMode = false;
}

async function handleSave(e) {
    e.preventDefault();
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;
    if (!productName || !categoryId || !brandId || !price || !priceOriginal) { await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!"); return; }
    
    const validation = ProductLogic.validateProduct({ productName, price, priceOriginal, variants: ProductUI.state.variants });
    if (!validation.isValid) { await showDialog("error", validation.errors.join('\n')); return; }
    
    const payload = ProductLogic.formatProductData({ productName, description: document.getElementById("description").value.trim() || "", price, priceOriginal, categoryId, brandId }, ProductUI.state.selectedAttributes, ProductUI.state.variants);
    if (state.currentProductId) { payload.productDetailDTO.productId = state.currentProductId; }
    
    const formData = new FormData();
    if (state.mainImageFile) { payload.productDetailDTO.imageName = "productImage"; formData.append("productImage", state.mainImageFile); } else if (!state.currentProductId) { await showDialog("error", "Vui lòng chọn ảnh chính cho sản phẩm!"); return; }
    ProductUI.state.variants.forEach((v, i) => { if (v.imageFile) { payload.variants[i].imageName = `image_variant_${i}`; formData.append(`image_variant_${i}`, v.imageFile); } });
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    
    const submitBtn = document.getElementById("submitBtn"); 
    const spinner = document.getElementById("submitSpinner"); 
    submitBtn.disabled = true; 
    if(spinner) spinner.classList.remove("d-none");

    try { 
        const res = await ProductService.createProduct(formData); 
        if (res && res.success) { 
            await showDialog("success", state.currentProductId ? "Cập nhật thành công!" : "Tạo sản phẩm thành công!"); 
            resetForm(); 
            ProductUI.toggleView('list'); 
            await loadProductList(); 
        } else { 
            await showDialog("error", res?.message || "Có lỗi xảy ra"); 
        } 
    } catch (error) { 
        await showDialog("error", "Lỗi: " + error.message); 
    } finally { 
        submitBtn.disabled = false; 
        if(spinner) spinner.classList.add("d-none"); 
    }
}

function resetForm() {
    state.currentProductId = null; state.mainImageFile = null; ProductUI.state.variants = []; ProductUI.state.selectedAttributes = []; ProductUI.state.mainImageFile = null;
    document.getElementById("productForm").reset(); document.getElementById("selectedAttributesList").innerHTML = ""; document.getElementById("variantsContainer").innerHTML = ""; document.getElementById("mainImagePreview").innerHTML = "";
    document.querySelector('#createView h2').textContent = "Thêm Sản Phẩm Mới"; 
    document.getElementById('submitBtn').innerHTML = '<span class="spinner-border spinner-border-sm d-none" id="submitSpinner"></span> Tạo sản phẩm';
    document.getElementById("brandId").innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
}

function setupEventListeners() {
    document.getElementById("productForm").onsubmit = handleSave; document.getElementById("resetBtn").onclick = resetForm;
    document.getElementById("btnOpenCreate").onclick = () => { resetForm(); ProductUI.toggleView('create'); };
    document.getElementById("btnBackToList").onclick = () => ProductUI.toggleView('list');
    document.getElementById("mainImage").onchange = (e) => { if(e.target.files[0]) { state.mainImageFile = e.target.files[0]; ProductUI.handleMainImageUpload(e.target.files[0]); } };
    document.getElementById("categoryId").onchange = (e) => {
        const catId = e.target.value;
        renderBrandOptions(catId);
    };
}

async function loadInitialData() {
    try {
        const cats = await ProductService.getCategories();
        const [brands, attrs] = await Promise.all([ProductService.getBrands(), ProductService.getAttributes()]);
        state.categories = cats || []; state.brands = brands || []; state.attributes = attrs || [];
        ProductUI.state.categories = state.categories; ProductUI.state.brands = state.brands; ProductUI.state.attributes = state.attributes;

        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`);
        ProductUI.renderAttributeSelector();
        await loadProductList();
    } catch (e) {}
}

(async function init() { await loadInitialData(); setupEventListeners(); })();