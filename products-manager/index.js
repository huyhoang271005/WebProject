import { showDialog } from "../dialog/index.js";
import { ProductService } from "./service.js";
import { VariantLogic } from "./variantLogic.js";
import { PayloadBuilder } from "./payloadBuilder.js";
import { UI } from "./ui.js";
import { loadNavbar } from "../navbar/navbar.js";

// --- STATE MANAGEMENT ---
const state = {
    categories: [],
    brands: [],
    attributes: [],      // All available attributes for dropdown
    currentAttrs: [],   // Attributes for generating variants
    variants: [],       // Generated variants

    // Edit Mode State
    isEdit: false,
    currentId: null,
    currentMainImageUrl: null,
    mainImageFile: null,

    // Edit View State
    currentPage: 0,
    searchKeyword: null
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Load Navbar
        await loadNavbar();

        // 2. Load Metadata (Categories, Brands, Attributes)
        const info = await ProductService.getInfo();
        if (info) {
            state.categories = info.categories || [];
            state.brands = info.brands || [];
            state.attributes = info.attributes || [];
        } else {
            state.categories = await ProductService.getCategories();
        }

        // 3. Render Categories
        UI.renderCategories(state.categories);

        // 4. Override UI.addAttrRow to use state.attributes
        const originalAddAttr = UI.addAttrRow;
        UI.addAttrRow = (n, v, cb, id, vids, map) => {
            originalAddAttr(n, v, cb, id, vids, map, state.attributes || []);
        };

        // 5. Setup Global Window Helpers
        setupWindowHelpers();

        // 6. Setup Event Listeners
        setupEventListeners();

        // 7. Default to Add view
        UI.switchView('add');
    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
        alert("Lỗi khởi tạo ứng dụng. Vui lòng tải lại trang.");
    }
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // TAB SWITCHING
    if (UI.els.btnTabAdd) {
        UI.els.btnTabAdd.onclick = () => {
            resetFormState();
            UI.switchView('add');
        };
    }

    if (UI.els.btnTabEdit) {
        UI.els.btnTabEdit.onclick = () => {
            UI.switchView('edit');
            // Clear search result when switching to edit view
            const searchResult = document.getElementById('searchResult');
            if (searchResult) {
                searchResult.innerHTML = '';
            }
            if (UI.els.searchProductInput) {
                UI.els.searchProductInput.value = '';
            }
        };
    }

    // FORM: Category Change -> Load Brands
    if (UI.els.categoryId) {
        UI.els.categoryId.onchange = async (e) => {
            const cateId = e.target.value;
            if (!cateId) {
                UI.renderBrands([], null);
                return;
            }
            const brands = await ProductService.getBrandsByCategory(cateId);
            state.brands = brands || [];
            UI.renderBrands(state.brands, cateId);
        };
    }

    // FORM: Add Attribute
    if (UI.els.btnAddAttr) {
        UI.els.btnAddAttr.onclick = () => {
            UI.addAttrRow(null, null, null, null, [], {}, state.attributes || []);
        };
    }

    // FORM: Generate Variants
    if (UI.els.btnGenerateVariants) {
        UI.els.btnGenerateVariants.onclick = () => {
            const attrs = VariantLogic.parseAttributesFromDOM();
            state.currentAttrs = attrs;

            const basePrice = parseFloat(UI.els.price.value) || 0;
            const basePriceOriginal = parseFloat(UI.els.priceOriginal.value) || 0;

            const newVariants = VariantLogic.generateVariants(attrs, basePrice, state.variants, basePriceOriginal);
            state.variants = newVariants;
            UI.renderVariants(state.variants);
        };
    }

    // FORM: Submit
    if (UI.els.form) {
        UI.els.form.onsubmit = handleSave;
    }

    // FORM: Reset
    if (UI.els.btnReset) {
        UI.els.btnReset.onclick = resetFormState;
    }

    // FORM: Delete (Edit Mode Only)
    const btnDelete = document.getElementById('btnDelete');
    if (btnDelete) {
        btnDelete.onclick = async () => {
            if (state.currentId) {
                await deleteProductById(state.currentId);
            }
        };
    }

    // FORM: Image Preview
    if (UI.els.mainImageInput) {
        UI.els.mainImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                state.mainImageFile = file;
                UI.renderMainImage(URL.createObjectURL(file));
            } else {
                state.mainImageFile = null;
                UI.renderMainImage(null);
            }
        };
    }

    // EDIT VIEW: Search by ID
    const searchForm = document.getElementById('searchProductForm');
    if (searchForm) {
        searchForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = UI.els.searchProductInput?.value.trim();
            if (!id) {
                alert("Vui lòng nhập ID sản phẩm!");
                return;
            }
            await loadProductForEdit(id);
        };
    }
}


// --- LOGIC: LOAD PRODUCT FOR EDIT ---
async function loadProductForEdit(id) {
    resetFormState();
    UI.setLoading(true);

    try {
        const response = await ProductService.getProductById(id);
        if (!response) {
            alert("Không tìm thấy sản phẩm! Vui lòng kiểm tra lại ID.");
            UI.setLoading(false);
            return;
        }

        // Debug: Log response to see structure
        console.log("Product API Response:", response);

        // Handle different response structures
        // API might return: { productDetailDTO, productVariantsDTO, attributeDTOList }
        // or direct product object
        const productDetail = response.productDetailDTO || response;
        const variants = response.productVariantsDTO || response.variants || [];
        const attributes = response.attributeDTOList || response.attributes || [];

        if (!productDetail) {
            alert("Dữ liệu sản phẩm không hợp lệ!");
            UI.setLoading(false);
            return;
        }

        // Get productId - try multiple possible fields
        const productId = productDetail.productId || productDetail.id || id;
        if (!productId) {
            alert("Không tìm thấy ID sản phẩm!");
            UI.setLoading(false);
            return;
        }

        // Set State
        state.isEdit = true;
        state.currentId = productId;
        
        // Handle image - try multiple possible fields
        const imageName = productDetail.imageName || productDetail.imageUrl || "";
        state.currentMainImageUrl = imageName ? (imageName.startsWith('/') ? imageName : `/images/${imageName}`) : "";

        // Fill Form
        UI.els.productName.value = productDetail.productName || "";
        UI.els.description.value = productDetail.description || "";
        
        // Handle price - might be in productDetail or variants
        const basePrice = productDetail.price || 0;
        const baseOriginalPrice = productDetail.originalPrice || 0;
        UI.els.price.value = basePrice;
        UI.els.priceOriginal.value = baseOriginalPrice;

        // Category & Brand
        const categoryId = productDetail.categoryId || "";
        const brandId = productDetail.brandId || "";
        
        // Set category first
        if (UI.els.categoryId) {
            UI.els.categoryId.value = categoryId;
        }
        
        // Load and render brands
        if (categoryId) {
            try {
                const brands = await ProductService.getBrandsByCategory(categoryId);
                state.brands = brands || [];
                console.log("Loaded brands:", state.brands, "for category:", categoryId, "selected brandId:", brandId);
                UI.renderBrands(state.brands, categoryId, brandId);
                
                // Set brandId after brands are loaded
                if (brandId && UI.els.brandId) {
                    // Small delay to ensure options are rendered
                    setTimeout(() => {
                        UI.els.brandId.value = brandId;
                        console.log("Set brandId to:", brandId);
                    }, 100);
                }
            } catch (error) {
                console.error("Error loading brands:", error);
            }
        } else {
            // Clear brands if no category
            UI.renderBrands([], null);
        }

        // Load attributes if available
        if (attributes && attributes.length > 0) {
            // Reconstruct attribute rows from API data
            state.currentAttrs = attributes.map(attr => {
                const values = (attr.attributeValues || []).map(v => v.attributeValueName || v);
                return {
                    id: attr.attributeId,
                    name: attr.attributeName,
                    values: values,
                    valueIdMap: {}
                };
            });
            
            // Render attribute rows
            UI.els.attrContainer.innerHTML = "";
            state.currentAttrs.forEach(attr => {
                const valuesStr = attr.values.join(", ");
                UI.addAttrRow(attr.name, valuesStr, null, attr.id, [], {}, state.attributes || []);
            });
        }

        // Variants - handle different structures
        state.variants = variants.map(v => {
            // Try to get variant name from attributes if available
            let variantName = v.variantName || v.variantId || "";
            let comboValues = v.comboValues || [];
            
            // If no comboValues, try to reconstruct from variant attributes
            if (!comboValues.length && v.attributeValues) {
                comboValues = v.attributeValues.map(av => av.attributeValueName || av);
                variantName = comboValues.join(" - ");
            }
            
            return {
                id: v.variantId || v.id,
                name: variantName,
                comboValues: comboValues,
                price: v.price || basePrice,
                priceOriginal: v.originalPrice || v.originalPrice || baseOriginalPrice,
                stock: v.stock || 0,
                imageName: v.imageName || "",
                previewUrl: v.imageName ? `/images/${v.imageName}` : (v.imageUrl || ""),
                rawFile: null
            };
        });

        UI.renderMainImage(state.currentMainImageUrl);
        UI.renderVariants(state.variants);
        UI.els.submitBtnText.innerText = "Cập Nhật";

        // Show delete button
        const btnDelete = document.getElementById('btnDelete');
        if (btnDelete) {
            btnDelete.classList.remove('d-none');
        }

        // Show success message in search result
        const searchResult = document.getElementById('searchResult');
        if (searchResult) {
            searchResult.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    Đã tìm thấy sản phẩm! Vui lòng chuyển sang tab "Thêm Sản Phẩm" để chỉnh sửa.
                </div>`;
        }

        // Switch to Add view (form is there)
        UI.switchView('add');

    } catch (e) {
        console.error("Lỗi khi tải sản phẩm:", e);
        console.error("Response data:", e);
        alert("Lỗi khi tải dữ liệu: " + (e.message || "Không xác định"));
    } finally {
        UI.setLoading(false);
    }
}

// --- LOGIC: SAVE PRODUCT ---
async function handleSave(e) {
    e.preventDefault();

    // Validation
    const name = UI.els.productName.value.trim();
    if (!name) {
        alert("Tên sản phẩm là bắt buộc!");
        return;
    }

    const categoryId = UI.els.categoryId.value;
    if (!categoryId) {
        alert("Vui lòng chọn danh mục!");
        return;
    }

    const brandId = UI.els.brandId.value;
    if (!brandId) {
        alert("Vui lòng chọn thương hiệu!");
        return;
    }

    UI.setLoading(true);

    try {
        // Build Payload
        const buildData = {
            isEdit: state.isEdit,
            currentId: state.currentId,
            productName: name,
            description: UI.els.description.value.trim(),
            price: parseFloat(UI.els.price.value) || 0,
            originalPrice: parseFloat(UI.els.priceOriginal.value) || 0,
            categoryId: categoryId,
            brandId: brandId,
            currentMainImageUrl: state.currentMainImageUrl,
            attributes: state.currentAttrs,
            variants: state.variants,
            mainImageFile: state.mainImageFile
        };

        const formData = PayloadBuilder.buildProductPayload(buildData);

        // Call Service
        let res;
        if (state.isEdit) {
            res = await ProductService.updateProduct(formData);
        } else {
            res = await ProductService.createProduct(formData);
        }

        if (res && res.success) {
            alert("Thành công!");
            if (!state.isEdit) {
                resetFormState();
            } else {
                // After successful update, stay in add view with updated data
                alert("Cập nhật sản phẩm thành công!");
            }
        } else {
            alert("Lỗi: " + (res?.message || "Không xác định"));
        }
    } catch (err) {
        console.error("Lỗi khi lưu:", err);
        alert("Lỗi hệ thống: " + (err.message || "Không xác định"));
    } finally {
        UI.setLoading(false);
    }
}

// --- LOGIC: DELETE PRODUCT ---
async function deleteProductById(id) {
    if (!confirm(`Bạn chắc chắn muốn xóa sản phẩm ${id}? Hành động này không thể hoàn tác!`)) {
        return;
    }

    try {
        const res = await ProductService.deleteProduct(id, "");
        if (res && res.success) {
            alert("Đã xóa thành công!");
            // Clear form and switch back to edit view
            resetFormState();
            UI.switchView('edit');
            const searchResult = document.getElementById('searchResult');
            if (searchResult) {
                searchResult.innerHTML = '';
            }
        } else {
            alert("Lỗi xóa: " + (res?.message || "Không xác định"));
        }
    } catch (e) {
        console.error("Lỗi khi xóa:", e);
        alert("Lỗi hệ thống khi xóa: " + (e.message || "Không xác định"));
    }
}

// --- HELPER: RESET FORM STATE ---
function resetFormState() {
    state.isEdit = false;
    state.currentId = null;
    state.currentMainImageUrl = null;
    state.mainImageFile = null;
    state.variants = [];
    state.currentAttrs = [];

    UI.resetForm();
    
    // Hide delete button
    const btnDelete = document.getElementById('btnDelete');
    if (btnDelete) {
        btnDelete.classList.add('d-none');
    }
}

// --- WINDOW HELPERS (For onclick="" in HTML strings) ---
function setupWindowHelpers() {
    // Handle variant image selection
    window.handleSelectVariantImage = (index, input) => {
        const file = input.files[0];
        if (!file || !state.variants[index]) return;

        state.variants[index].rawFile = file;
        state.variants[index].previewUrl = URL.createObjectURL(file);
        UI.renderVariants(state.variants);
    };

    // Update variant field
    window.updateVar = (index, field, value) => {
        if (!state.variants[index]) return;
        const numValue = parseFloat(value);
        if (field === 'price' || field === 'priceOriginal' || field === 'stock') {
            state.variants[index][field] = isNaN(numValue) ? 0 : numValue;
        } else {
            state.variants[index][field] = value;
        }
    };

    // Remove variant
    window.removeVariant = (index) => {
        if (confirm("Bạn có chắc muốn xóa biến thể này?")) {
            state.variants.splice(index, 1);
            UI.renderVariants(state.variants);
        }
    };

}
