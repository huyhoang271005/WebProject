import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { ProductLogic } from "./logic.js";
import { ProductUI } from "./ui.js";

let state = {
    products: [],
    categories: [],
    brands: [],
    attributes: [],
    variants: [],
    selectedAttributes: [],
    mainImageFile: null
};

// --- API LOAD DANH SÁCH ---
async function loadProductList() {
    // Hiển thị loading
    const tbody = document.getElementById('productTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5">Đang tải dữ liệu... <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    }
    
    try {
        // Gọi hàm getProducts (đã sửa thành POST bên service)
        const products = await ProductService.getProducts();
        state.products = products;
        
        // Render
        ProductUI.renderProductList(state.products, state.categories, state.brands);
    } catch (error) {
        console.error("Lỗi tải danh sách:", error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Không thể tải dữ liệu.</td></tr>';
        }
    }
}

// --- HANDLER SAVE (GIỮ NGUYÊN LOGIC CỦA BẠN) ---
async function handleSave(e) {
    e.preventDefault();

    // 1. VALIDATION
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }
    
    // Validate Variants
    const validation = ProductLogic.validateProduct({
        productName, price, priceOriginal, variants: ProductUI.state.variants
    });

    if (!validation.isValid) {
        await showDialog("error", validation.errors.join('\n'));
        return;
    }

    // 2. PAYLOAD
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description: document.getElementById("description").value.trim() || "",
            price, priceOriginal, categoryId, brandId
        },
        ProductUI.state.selectedAttributes,
        ProductUI.state.variants
    );

    const formData = new FormData();
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage"; 
        formData.append("productImage", state.mainImageFile);
    } else {
        await showDialog("error", "Vui lòng chọn ảnh chính!");
        return;
    }
    
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const variantKey = `image_variant_${index}`;
            payload.variants[index].imageName = variantKey;
            formData.append(variantKey, v.imageFile);
        }
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // 3. SUBMIT
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        const res = await ProductService.createProduct(formData);
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
            // Quay về danh sách và load lại
            ProductUI.toggleView('list');
            await loadProductList();
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
        }
    } catch (error) {
        await showDialog("error", "Lỗi: " + error.message);
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add("d-none");
    }
}

function resetForm() {
    state.variants = [];
    state.mainImageFile = null;
    state.selectedAttributes = [];
    ProductUI.state.selectedAttributes = [];
    ProductUI.state.variants = [];
    ProductUI.state.mainImageFile = null;
    
    document.getElementById("productForm").reset();
    document.getElementById("selectedAttributesList").innerHTML = "";
    document.getElementById("variantsContainer").innerHTML = "";
    document.getElementById("mainImagePreview").innerHTML = "";
}

function setupEventListeners() {
    document.getElementById("productForm").onsubmit = handleSave;
    document.getElementById("resetBtn").onclick = resetForm;
    
    // Nút chuyển view
    const btnCreate = document.getElementById("btnOpenCreate");
    if(btnCreate) btnCreate.onclick = () => ProductUI.toggleView('create');

    const btnBack = document.getElementById("btnBackToList");
    if(btnBack) btnBack.onclick = () => ProductUI.toggleView('list');
    
    document.getElementById("mainImage").onchange = (e) => {
        if(e.target.files[0]) { state.mainImageFile = e.target.files[0]; ProductUI.handleMainImageUpload(e.target.files[0]); }
    };

    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        if(!categoryId) return;

        const filtered = state.brands.filter(b => b.categoryId == categoryId);
        if (filtered.length === 0) {
            brandSelect.innerHTML += '<option disabled>Không có thương hiệu</option>';
        } else {
            filtered.forEach(b => {
                brandSelect.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
            });
        }
    };
}

// [SỬA QUAN TRỌNG] Hàm load data tuần tự để tránh lỗi token
async function loadInitialData() {
    try {
        // BƯỚC 1: Gọi Categories trước (Mồi refresh token)
        const cats = await ProductService.getCategories();
        state.categories = cats || [];
        ProductUI.state.categories = state.categories;

        // BƯỚC 2: Sau khi bước 1 xong (token đã ngon), gọi các cái còn lại
        const [brands, attrs] = await Promise.all([
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);
        
        state.brands = brands || [];
        state.attributes = attrs || [];
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        // Render UI Dropdowns
        const categorySelect = document.getElementById("categoryId");
        if(categorySelect) {
            categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
            state.categories.forEach(c => {
                categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
            });
        }

        ProductUI.renderAttributeSelector();
        
        // BƯỚC 3: Load danh sách sản phẩm
        await loadProductList();

    } catch (error) {
        console.error("Error loading initial data:", error);
    }
}

(async function init() {
    await loadInitialData();
    setupEventListeners();
})();