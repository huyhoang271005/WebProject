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
        const product = await ProductService.getProductById(id);
        if (!product) {
            alert("Không tìm thấy sản phẩm! Vui lòng kiểm tra lại ID.");
            UI.setLoading(false);
            return;
        }

        // Set State
        state.isEdit = true;
        state.currentId = product.productId;
        state.currentMainImageUrl = product.imageName ? `/images/${product.imageName}` : "";

        // Fill Form
        UI.els.productName.value = product.productName || "";
        UI.els.description.value = product.description || "";
        UI.els.price.value = product.price || 0;
        UI.els.priceOriginal.value = product.originalPrice || 0;

        // Category & Brand
        UI.els.categoryId.value = product.categoryId || "";
        if (product.categoryId) {
            const brands = await ProductService.getBrandsByCategory(product.categoryId);
            state.brands = brands || [];
            UI.renderBrands(state.brands, product.categoryId, product.brandId);
        }

        // Variants
        state.variants = (product.variants || []).map(v => ({
            id: v.variantId,
            name: v.variantName || v.variantId,
            comboValues: v.comboValues || [],
            price: v.price || 0,
            priceOriginal: v.originalPrice || 0,
            stock: v.stock || 0,
            imageName: v.imageName || "",
            previewUrl: v.imageName ? `/images/${v.imageName}` : "",
            rawFile: null
        }));

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
