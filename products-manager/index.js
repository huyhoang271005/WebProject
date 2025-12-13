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

// === HANDLER SAVE ===
async function handleSave(e) {
    e.preventDefault();

    // VALIDATION
    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    // Validate prices
    const validation = ProductLogic.validateProduct({
        productName,
        price,
        priceOriginal,
        variants: ProductUI.state.variants
    });

    if (!validation.isValid) {
        await showDialog("error", validation.errors.join('\n'));
        return;
    }

    // BUILD PAYLOAD
    const payload = ProductLogic.formatProductData(
        {
            productName,
            description: document.getElementById("description").value.trim() || "",
            price,
            priceOriginal,
            categoryId,
            brandId
        },
        ProductUI.state.selectedAttributes,
        ProductUI.state.variants
    );

    // Set main image name nếu có
    if (state.mainImageFile) {
        const fileName = state.mainImageFile.name;
        payload.productDetailDTO.imageName = fileName.includes('.')
            ? fileName.substring(0, fileName.lastIndexOf('.'))
            : fileName;
    }

    // BUILD FORMDATA
    const formData = new FormData();
    formData.append("productDTO", JSON.stringify(payload));
    
    // Add main image
    if (state.mainImageFile) {
        formData.append("images", state.mainImageFile);
    }
    
    // Add variant images - QUAN TRỌNG: thứ tự phải khớp với thứ tự trong variants array
    ProductUI.state.variants.forEach((v) => {
        if (v.imageFile) {
            formData.append("images", v.imageFile);
        }
    });

    // DEBUG LOG
    console.log("=== PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("\n=== FORMDATA ===");
    for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `File(${value.name})` : value);
    }

    // Disable submit button
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        // Send request
        const res = await ProductService.createProduct(formData);
        console.log("=== RESPONSE ===", res);
        
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
        } else {
            await showDialog("error", res?.message || "Có lỗi xảy ra");
        }
    } catch (error) {
        console.error("Error:", error);
        await showDialog("error", "Có lỗi xảy ra khi tạo sản phẩm");
    } finally {
        // Re-enable submit button
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
    // Form submit
    document.getElementById("productForm").onsubmit = handleSave;
    
    // Reset button
    document.getElementById("resetBtn").onclick = resetForm;
    
    // Main image upload
    document.getElementById("mainImage").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            ProductUI.handleMainImageUpload(file);
        }
    };

    // Category change - update brands
    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        if (!categoryId) {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
            return;
        }

        // Filter brands by category
        const filteredBrands = state.brands.filter(b => b.categoryId === categoryId);
        brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        filteredBrands.forEach(brand => {
            brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
        });
    };
}

async function loadInitialData() {
    try {
        const [cats, brands, attrs] = await Promise.all([
            ProductService.getCategories(),
            ProductService.getBrands(),
            ProductService.getAttributes()
        ]);

        state.categories = cats || [];
        state.brands = brands || [];
        state.attributes = attrs || [];

        // Update UI state
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        // Populate category dropdown
        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        // Initialize brand dropdown (empty until category selected)
        const brandSelect = document.getElementById("brandId");
        brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';

        // Render attribute selector
        ProductUI.renderAttributeSelector();

    } catch (error) {
        console.error("Error loading data:", error);
        await showDialog("error", "Không thể tải dữ liệu. Vui lòng thử lại!");
    }
}

// Initialize
(async function init() {
    await loadInitialData();
    setupEventListeners();
})();