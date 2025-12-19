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

// --- HÀM LOAD DANH SÁCH (API) ---
async function loadProductList() {
    // Hiển thị loading trong bảng
    document.getElementById('productTableBody').innerHTML = 
        '<tr><td colspan="5" class="text-center py-5">Đang tải dữ liệu... <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    
    try {
        // Gọi API lấy danh sách
        const products = await ProductService.getProducts();
        state.products = products;
        
        // Render ra bảng (ProductUI đã bỏ cột rating)
        ProductUI.renderProductList(state.products, state.categories, state.brands);
    } catch (error) {
        console.error("Lỗi tải danh sách:", error);
        document.getElementById('productTableBody').innerHTML = 
            '<tr><td colspan="5" class="text-center text-danger py-4">Không thể tải dữ liệu. Vui lòng thử lại sau.</td></tr>';
    }
}

// --- XỬ LÝ LƯU (CREATE) ---
async function handleSave(e) {
    e.preventDefault();

    // 1. Validation cơ bản
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }
    
    // Validate logic Variants
    const validation = ProductLogic.validateProduct({
        productName, price, priceOriginal, variants: ProductUI.state.variants
    });

    if (!validation.isValid) {
        await showDialog("error", validation.errors.join('\n'));
        return;
    }

    // 2. Chuẩn bị Payload JSON
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description: document.getElementById("description").value.trim() || "",
            price, priceOriginal, categoryId, brandId
        },
        ProductUI.state.selectedAttributes,
        ProductUI.state.variants
    );

    // 3. Chuẩn bị FormData (Multipart)
    const formData = new FormData();
    
    // Ảnh chính
    if (state.mainImageFile) {
        payload.productDetailDTO.imageName = "productImage"; 
        formData.append("productImage", state.mainImageFile);
    } else {
        await showDialog("error", "Vui lòng chọn ảnh chính cho sản phẩm!");
        return;
    }
    
    // Ảnh biến thể
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const variantKey = `image_variant_${index}`;
            payload.variants[index].imageName = variantKey;
            formData.append(variantKey, v.imageFile);
        }
    });
    
    // Append JSON blob
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
            
            // Reset form
            resetForm();
            
            // Quay về danh sách và load lại
            ProductUI.toggleView('list');
            await loadProductList(); 
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
        }
    } catch (error) {
        console.error("Lỗi:", error);
        await showDialog("error", "Lỗi kết nối: " + error.message);
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
    
    // Nút chuyển đổi View
    document.getElementById("btnOpenCreate").onclick = () => ProductUI.toggleView('create');
    document.getElementById("btnBackToList").onclick = () => ProductUI.toggleView('list');
    
    // Upload ảnh chính
    document.getElementById("mainImage").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            ProductUI.handleMainImageUpload(file);
        }
    };

    // Filter Brands theo Category
    document.getElementById("categoryId").onchange = (e) => {
        const catId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        if (!catId) return;

        // Dùng == so sánh lỏng để tránh lỗi string/number
        const filtered = state.brands.filter(b => b.categoryId == catId);
        
        if (filtered.length === 0) {
            brandSelect.innerHTML += '<option disabled>Không có thương hiệu</option>';
        } else {
            filtered.forEach(b => {
                brandSelect.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
            });
        }
    };
}

async function loadInitialData() {
    try {
        // --- BƯỚC 1: GỌI "MỒI" 1 API TRƯỚC ---
        // Mục đích: Nếu token hết hạn, chỉ API này chịu trách nhiệm refresh.
        // Các API sau sẽ chờ API này xong mới chạy nên sẽ dùng token mới.
        const cats = await ProductService.getCategories();

        // --- BƯỚC 2: GỌI CÁC API CÒN LẠI SONG SONG ---
        // Lúc này token đã an toàn, có thể gọi Promise.all thoải mái
        const [brands, attrs, products] = await Promise.all([
            ProductService.getBrands(),
            ProductService.getAttributes(),
            ProductService.getProducts()
        ]);

        // Gán dữ liệu vào State
        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];
        state.products = products || []; // Nhớ gán products vào state
        
        // Cập nhật UI State
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        // Render Dropdown Category
        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        // Render Attribute Selector
        ProductUI.renderAttributeSelector();

        // Render Danh sách sản phẩm
        ProductUI.renderProductList(state.products, state.categories, state.brands);

    } catch (error) {
        console.error("Error loading initial data:", error);
        await showDialog("error", "Không thể tải dữ liệu ban đầu.");
    }
}

(async function init() {
    await loadInitialData();
    setupEventListeners();
})();