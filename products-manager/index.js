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

    const productName = document.getElementById("productName").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const priceOriginal = parseFloat(document.getElementById("priceOriginal").value);
    const categoryId = document.getElementById("categoryId").value;
    const brandId = document.getElementById("brandId").value;

    if (!productName || !categoryId || !brandId || !price || !priceOriginal) {
        await showDialog("error", "Vui lòng điền đầy đủ thông tin bắt buộc!");
        return;
    }

    if (ProductUI.state.selectedAttributes.length === 0 && ProductUI.state.variants.length > 0) {
        await showDialog("error", "Lỗi: Có variants nhưng không có attributes!");
        return;
    }

    if (ProductUI.state.selectedAttributes.length > 0 && ProductUI.state.variants.length === 0) {
        await showDialog("error", "Vui lòng tạo variants từ attributes!");
        return;
    }

    // Validate logic
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

    // Prepare Payload
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

    const formData = new FormData();
    
    // 1. Main Image Handling
    if (state.mainImageFile) {
        const fileName = state.mainImageFile.name;
        const nameWithoutExt = fileName.includes('.') 
            ? fileName.substring(0, fileName.lastIndexOf('.')) 
            : fileName;
        
        // Map imageName in JSON matches FormData Key
        payload.productDetailDTO.imageName = nameWithoutExt;
        formData.append(nameWithoutExt, state.mainImageFile);
    } else {
        await showDialog("error", "Vui lòng chọn ảnh chính cho sản phẩm!");
        return;
    }
    
    // 2. Variant Images Handling
    ProductUI.state.variants.forEach((v, index) => {
        if (v.imageFile) {
            const fileName = v.imageFile.name;
            const nameWithoutExt = fileName.includes('.')
                ? fileName.substring(0, fileName.lastIndexOf('.'))
                : fileName;
            
            payload.variants[index].imageName = nameWithoutExt;
            formData.append(nameWithoutExt, v.imageFile);
        }
    });
    
    // 3. Append JSON as Blob (Fix Content-Type error)
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
        } else {
            const errorMsg = res?.data?.[0]?.error || res?.message || "Có lỗi xảy ra";
            await showDialog("error", errorMsg);
            console.error("Error details:", res);
        }
    } catch (error) {
        console.error("Error:", error);
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