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

    // DEBUG: Kiểm tra state trước khi submit
    console.log('=== STATE BEFORE SUBMIT ===');
    console.log('Selected Attributes:', ProductUI.state.selectedAttributes);
    console.log('Variants:', ProductUI.state.variants);

    // Validate: Phải có attributes và variants nếu tạo sản phẩm có biến thể
    if (ProductUI.state.selectedAttributes.length === 0 && ProductUI.state.variants.length > 0) {
        await showDialog("error", "Lỗi: Có variants nhưng không có attributes!");
        return;
    }

    if (ProductUI.state.selectedAttributes.length > 0 && ProductUI.state.variants.length === 0) {
        await showDialog("error", "Vui lòng tạo variants từ attributes!");
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

    // BUILD FORMDATA
    const formData = new FormData();
    
    // --- SỬA ĐỔI: Append ảnh trực tiếp với key là tên file (không đuôi) ---

    // 1. Main image (nếu có)
    if (state.mainImageFile) {
        const fileName = state.mainImageFile.name;
        const nameWithoutExt = fileName.includes('.')
            ? fileName.substring(0, fileName.lastIndexOf('.'))
            : fileName;
        
        // Set imageName trong payload
        payload.productDetailDTO.imageName = nameWithoutExt;
        // Append file vào formData với key là nameWithoutExt
        formData.append(nameWithoutExt, state.mainImageFile);
    }
    
    // 2. Variant images
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const fileName = v.imageFile.name;
            const nameWithoutExt = fileName.includes('.')
                ? fileName.substring(0, fileName.lastIndexOf('.'))
                : fileName;
            
            // Set imageName trong variant payload
            payload.variants[index].imageName = nameWithoutExt;
            // Append file vào formData với key là nameWithoutExt
            formData.append(nameWithoutExt, v.imageFile);
        }
    });
    
    // Append JSON payload (vẫn giữ nguyên fix Blob)
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob);

    // DEBUG LOG
    console.log("=== PAYLOAD ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("\n=== FORMDATA ENTRIES (Kiểm tra tên key của file) ===");
    for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value instanceof File ? `File(${value.name})` : value);
    }

    // Disable submit button
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        // QUAN TRỌNG: Gửi FormData
        const res = await ProductService.createProduct(formData);
        console.log("=== RESPONSE ===", res);
        
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
            console.error("Error details:", res);
        }
    } catch (error) {
        console.error("Error:", error);
        await showDialog("error", "Có lỗi xảy ra khi tạo sản phẩm: " + error.message);
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
        let filteredBrands = state.brands;
        if (state.brands.length > 0 && state.brands[0].categoryId !== undefined) {
            filteredBrands = state.brands.filter(b => b.categoryId === categoryId);
        }

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

        // Initialize brand dropdown
        const brandSelect = document.getElementById("brandId");
        if (state.brands.length > 0 && state.brands[0].categoryId === undefined) {
            brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
            state.brands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
            });
        } else {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
        }

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