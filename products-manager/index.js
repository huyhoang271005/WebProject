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

// --- HÀM LOAD DANH SÁCH TỪ API ---
async function loadProductList() {
    document.getElementById('productTableBody').innerHTML = '<tr><td colspan="5" class="text-center py-5">Đang tải dữ liệu... <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    
    try {
        // Gọi API GET /auth/admin/products (như bạn yêu cầu)
        const products = await ProductService.getProducts();
        state.products = products;
        ProductUI.renderProductList(state.products, state.categories, state.brands);
    } catch (error) {
        console.error("Lỗi tải danh sách:", error);
        document.getElementById('productTableBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Lỗi kết nối hoặc API chưa hỗ trợ GET.</td></tr>';
    }
}

// --- XỬ LÝ LƯU SẢN PHẨM ---
async function handleSave(e) {
    e.preventDefault();
    // 1. Validation
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!"); return;
    }
    const validation = ProductLogic.validateProduct({ productName, price, priceOriginal, variants: ProductUI.state.variants });
    if (!validation.isValid) { await showDialog("error", validation.errors.join('\n')); return; }

    // 2. Payload
    const payload = ProductLogic.formatProductData(
        { productName, description: document.getElementById("description").value.trim() || "", price, priceOriginal, categoryId, brandId },
        ProductUI.state.selectedAttributes, ProductUI.state.variants
    );

    const formData = new FormData();
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage"; 
        formData.append("productImage", state.mainImageFile);
    } else { await showDialog("error", "Thiếu ảnh chính!"); return; }
    
    ProductUI.state.variants.forEach((v, i) => {
        if (v.imageFile) {
            payload.variants[i].imageName = `image_variant_${i}`;
            formData.append(`image_variant_${i}`, v.imageFile);
        }
    });
    
    formData.append("productDTO", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    // 3. Submit
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true; spinner.classList.remove("d-none");

    try {
        const res = await ProductService.createProduct(formData);
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
            // Quay về danh sách và load lại
            ProductUI.toggleView('list');
            await loadProductList();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra");
        }
    } catch (error) {
        await showDialog("error", "Lỗi: " + error.message);
    } finally {
        submitBtn.disabled = false; spinner.classList.add("d-none");
    }
}

function resetForm() {
    state.mainImageFile = null;
    ProductUI.state.variants = [];
    ProductUI.state.selectedAttributes = [];
    ProductUI.state.mainImageFile = null;
    document.getElementById("productForm").reset();
    document.getElementById("selectedAttributesList").innerHTML = "";
    document.getElementById("variantsContainer").innerHTML = "";
    document.getElementById("mainImagePreview").innerHTML = "";
}

function setupEventListeners() {
    document.getElementById("productForm").onsubmit = handleSave;
    document.getElementById("resetBtn").onclick = resetForm;
    
    // Nút chuyển màn hình
    document.getElementById("btnOpenCreate").onclick = () => ProductUI.toggleView('create');
    document.getElementById("btnBackToList").onclick = () => ProductUI.toggleView('list');
    
    document.getElementById("mainImage").onchange = (e) => {
        if(e.target.files[0]) { state.mainImageFile = e.target.files[0]; ProductUI.handleMainImageUpload(e.target.files[0]); }
    };

    document.getElementById("categoryId").onchange = (e) => {
        const catId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        if(!catId) return;
        state.brands.filter(b => b.categoryId == catId).forEach(b => {
            brandSelect.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
        });
    };
}

async function loadInitialData() {
    try {
        // Gọi "mồi" API Categories trước để xử lý Refresh Token (tránh race condition)
        const cats = await ProductService.getCategories();

        const [brands, attrs] = await Promise.all([
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);
        
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];
        
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`);

        ProductUI.renderAttributeSelector();
        
        // Load danh sách sản phẩm ngay khi vào trang
        await loadProductList();

    } catch (e) { console.error(e); }
}

(async function init() { await loadInitialData(); setupEventListeners(); })();