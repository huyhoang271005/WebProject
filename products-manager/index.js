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

// --- [MỚI] HÀM LOAD DANH SÁCH TỪ API ---
async function loadProductList() {
    // Show loading
    document.getElementById('productTableBody').innerHTML = '<tr><td colspan="6" class="text-center py-5">Đang tải dữ liệu... <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    
    try {
        const products = await ProductService.getProducts();
        state.products = products;
        ProductUI.renderProductList(state.products, state.categories, state.brands);
    } catch (error) {
        console.error("Lỗi tải danh sách:", error);
        document.getElementById('productTableBody').innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Không thể tải dữ liệu.</td></tr>';
    }
}

// --- HANDLER SAVE ---
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
    
    if (ProductUI.state.variants.length > 0 && ProductUI.state.selectedAttributes.length === 0) {
         await showDialog("error", "Lỗi variants không hợp lệ!"); return;
    }

    const validation = ProductLogic.validateProduct({
        productName, price, priceOriginal, variants: ProductUI.state.variants
    });

    if (!validation.isValid) {
        await showDialog("error", validation.errors.join('\n'));
        return;
    }

    // 2. CHUẨN BỊ PAYLOAD
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description: document.getElementById("description").value.trim() || "",
            price, priceOriginal, categoryId, brandId
        },
        ProductUI.state.selectedAttributes,
        ProductUI.state.variants
    );

    // 3. CHUẨN BỊ FORM DATA
    const formData = new FormData();
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage"; 
        formData.append("productImage", state.mainImageFile);
    } else {
        await showDialog("error", "Vui lòng chọn ảnh chính!"); return;
    }
    
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const variantKey = `image_variant_${index}`;
            payload.variants[index].imageName = variantKey;
            formData.append(variantKey, v.imageFile);
        }
    });
    
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob);

    // UI Loading
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        const res = await ProductService.createProduct(formData);
        
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
            
            // [MỚI] Chuyển về trang danh sách và load lại
            ProductUI.toggleView('list');
            await loadProductList();
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
        }
    } catch (error) {
        console.error("Client Error:", error);
        await showDialog("error", "Có lỗi xảy ra: " + error.message);
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
    
    // [MỚI] Event chuyển đổi View
    document.getElementById("btnOpenCreate").onclick = () => ProductUI.toggleView('create');
    document.getElementById("btnBackToList").onclick = () => ProductUI.toggleView('list');
    
    document.getElementById("mainImage").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            ProductUI.handleMainImageUpload(file);
        }
    };

    // Handler chọn danh mục -> lọc thương hiệu
    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        if (!categoryId) {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
            return;
        }
        let filteredBrands = state.brands.filter(b => b.categoryId === categoryId);
        
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        if (filteredBrands.length === 0) {
            brandSelect.innerHTML += '<option value="" disabled>Không có thương hiệu nào</option>';
        } else {
            filteredBrands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
            });
        }
    };
}

async function loadInitialData() {
    try {
        // Load danh mục, thương hiệu, thuộc tính
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];
        
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        // Render Category Select
        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        // Render Brand Select (Init)
        const brandSelect = document.getElementById("brandId");
        brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';

        // Init Attribute UI
        ProductUI.renderAttributeSelector();

        // [MỚI] Load danh sách sản phẩm ngay sau khi có metadata
        await loadProductList();

    } catch (error) {
        console.error("Error loading initial data:", error);
        await showDialog("error", "Không thể tải dữ liệu ban đầu.");
    }
}

(async function init() {
    await loadInitialData();
    setupEventListeners();
})();