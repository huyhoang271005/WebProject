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

    // 1. VALIDATION CƠ BẢN
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
    if (ProductUI.state.selectedAttributes.length === 0 && ProductUI.state.variants.length > 0) {
        await showDialog("error", "Lỗi: Có variants nhưng không có attributes!");
        return;
    }
    if (ProductUI.state.selectedAttributes.length > 0 && ProductUI.state.variants.length === 0) {
        await showDialog("error", "Vui lòng tạo variants từ attributes!");
        return;
    }

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

    // 2. CHUẨN BỊ PAYLOAD (JSON)
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

    // 3. CHUẨN BỊ FORM DATA
    const formData = new FormData();
    
    // --- XỬ LÝ ẢNH CHÍNH (MAIN IMAGE) ---
    if (state.mainImageFile) {
        // [QUAN TRỌNG]: Dùng tên Key đơn giản, không dấu, không ký tự lạ
        const mainImageKey = "productImage"; 
        
        // Map vào JSON
        payload.productDetailDTO.imageName = mainImageKey;
        
        // Append vào FormData đúng Key đó
        formData.append(mainImageKey, state.mainImageFile);
        
        console.log(`✅ Main Image: Key="${mainImageKey}" | Filename="${state.mainImageFile.name}"`);
    } else {
        await showDialog("error", "Vui lòng chọn ảnh chính cho sản phẩm!");
        return;
    }
    
    // --- XỬ LÝ ẢNH BIẾN THỂ (VARIANT IMAGES) ---
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            // [QUAN TRỌNG]: Key đơn giản theo index
            const variantKey = `image_variant_${index}`;
            
            // Map vào JSON của variant đó
            payload.variants[index].imageName = variantKey;
            
            // Append vào FormData
            formData.append(variantKey, v.imageFile);
            
            console.log(`✅ Variant [${index}]: Key="${variantKey}" | Filename="${v.imageFile.name}"`);
        }
    });
    
    // --- DEBUG PAYLOAD TRƯỚC KHI GỬI ---
    console.log("=== FINAL PAYLOAD (Check imageName matches keys above) ===");
    console.log(JSON.stringify(payload, null, 2));

    // 4. APPEND JSON VÀO FORMDATA (Giữ fix Blob application/json)
    const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    formData.append("productDTO", jsonBlob);

    // UI Loading
    const submitBtn = document.getElementById("submitBtn");
    const spinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    spinner.classList.remove("d-none");

    try {
        // Gửi request
        const res = await ProductService.createProduct(formData);
        
        if (res && res.success) {
            await showDialog("success", "Tạo sản phẩm thành công!");
            resetForm();
        } else {
            // Lấy lỗi chi tiết
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
            console.error("❌ Server Error Details:", res);
        }
    } catch (error) {
        console.error("❌ Network/Client Error:", error);
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
    
    document.getElementById("mainImage").onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            state.mainImageFile = file;
            ProductUI.handleMainImageUpload(file);
        }
    };

    // ... (Giữ nguyên phần xử lý Category/Brand cũ của bạn) ...
    document.getElementById("categoryId").onchange = (e) => {
        const categoryId = e.target.value;
        const brandSelect = document.getElementById("brandId");
        
        if (!categoryId) {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
            return;
        }
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
        ProductUI.state.categories = state.categories;
        ProductUI.state.brands = state.brands;
        ProductUI.state.attributes = state.attributes;

        const categorySelect = document.getElementById("categoryId");
        categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        state.categories.forEach(c => {
            categorySelect.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });

        const brandSelect = document.getElementById("brandId");
        if (state.brands.length > 0 && state.brands[0].categoryId === undefined) {
            brandSelect.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
            state.brands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.brandId}">${brand.brandName}</option>`;
            });
        } else {
            brandSelect.innerHTML = '<option value="">-- Chọn danh mục trước --</option>';
        }
        ProductUI.renderAttributeSelector();
    } catch (error) {
        console.error("Error loading data:", error);
        await showDialog("error", "Không thể tải dữ liệu.");
    }
}

(async function init() {
    await loadInitialData();
    setupEventListeners();
})();