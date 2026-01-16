import { showDialog } from "/dialog/index.js";
import { loadNavbar } from "/navbar/navbar.js";
import { fetchCategories, fetchBrands, getProduct, updateProduct, deleteProduct, updateVariant, deleteVariant } from "/products-manager/services.js";

let currentProductId = null;
let categories = [];
let brands = [];

// Initialize
async function init() {
    console.log("edit.js: init() called");

    // Load Navbar
    await loadNavbar({ centerHTML: "" });

    // Load dropdown data
    await loadCategories();
    await loadBrands();

    // Setup events
    setupEvents();
}

// Load dropdown data
async function loadCategories() {
    try {
        const res = await fetchCategories();
        categories = getListData(res);

        const sel = document.getElementById("categoryId");
        sel.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        categories.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.categoryId;
            opt.textContent = c.categoryName;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading categories", e);
    }
}

async function loadBrands() {
    try {
        const res = await fetchBrands();
        brands = getListData(res);

        const sel = document.getElementById("brandId");
        sel.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';
        brands.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.brandId;
            opt.textContent = b.brandName;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading brands", e);
    }
}

function getListData(res) {
    if (!res) return [];
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.listData)) return res.data.listData;
    if (Array.isArray(res)) return res;
    return [];
}

// Setup events
function setupEvents() {
    const btnSearch = document.getElementById("btnSearch");
    const searchInput = document.getElementById("searchProductId");
    const btnSave = document.getElementById("btnSave");
    const btnCancel = document.getElementById("btnCancel");

    // Search
    btnSearch.onclick = async () => {
        const productId = searchInput.value.trim();
        if (!productId) {
            showDialog("error", "Vui lòng nhập Product ID");
            return;
        }
        await searchProduct(productId);
    };

    // Enter to search
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            btnSearch.click();
        }
    });

    // Save (Update)
    btnSave.onclick = async () => {
        if (!currentProductId) {
            showDialog("error", "Chưa tìm thấy sản phẩm");
            return;
        }
        await updateProductHandler();
    };

    // Cancel
    btnCancel.onclick = () => {
        if (confirm("Hủy bỏ và quay lại?")) {
            window.location.href = "/products-manager/index.html";
        }
    };

    // Main image upload
    const mainImgArea = document.getElementById("mainImageArea");
    const mainImgInput = document.getElementById("mainImageInput");
    const mainImgPrev = document.getElementById("mainImagePreview");
    const mainImgPlace = document.getElementById("mainImagePlaceholder");

    mainImgArea.onclick = () => mainImgInput.click();

    mainImgInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            mainImgPrev.src = URL.createObjectURL(file);
            mainImgPrev.style.display = "block";
            mainImgPlace.style.display = "none";
        }
    };
}

// Search product
async function searchProduct(productId) {
    try {
        const res = await getProduct(productId);

        if (res.success && res.data) {
            currentProductId = productId;
            showSearchResult(`Tìm thấy: ${res.data.productDetailDTO.productName}`, "success");
            loadProductData(res.data);

            // Show form and buttons
            document.getElementById("productFormSection").style.display = "block";
            document.getElementById("btnSave").style.display = "inline-flex";

            // Add delete button
            addDeleteButton();
        } else {
            showSearchResult("Không tìm thấy sản phẩm", "error");
        }
    } catch (e) {
        console.error("Search error:", e);
        showSearchResult("Lỗi khi tìm kiếm sản phẩm", "error");
    }
}

function showSearchResult(text, type) {
    const resultDiv = document.getElementById("searchResult");
    const resultText = document.getElementById("searchResultText");

    resultText.textContent = text;
    resultDiv.style.display = "block";
    resultDiv.style.background = type === "success" ? "#d1fae5" : "#fee2e2";
    resultDiv.style.color = type === "success" ? "#065f46" : "#991b1b";
}

// Load product data into form
function loadProductData(productDTO) {
    const detail = productDTO.productDetailDTO;

    document.getElementById("productName").value = detail.productName || "";
    document.getElementById("description").value = detail.description || "";
    document.getElementById("price").value = detail.price || 0;
    document.getElementById("originalPrice").value = detail.originalPrice || 0;
    document.getElementById("stock").value = detail.stock || 0;
    document.getElementById("categoryId").value = detail.categoryId || "";
    document.getElementById("brandId").value = detail.brandId || "";

    // Load existing image
    if (detail.imageUrl) {
        const mainImgPrev = document.getElementById("mainImagePreview");
        const mainImgPlace = document.getElementById("mainImagePlaceholder");

        mainImgPrev.src = detail.imageUrl;
        mainImgPrev.style.display = "block";
        mainImgPlace.style.display = "none";
    }

    // Load variants if exists
    if (productDTO.variants && productDTO.variants.length > 0) {
        loadVariants(productDTO);
    }

    console.log("Product loaded:", productDTO);
}

// Load variants into table (editable)
function loadVariants(productDTO) {
    const variantsSection = document.getElementById("variantsSection");
    const variantsTableBody = document.getElementById("variantsTableBody");

    variantsSection.style.display = "block";
    variantsTableBody.innerHTML = "";

    productDTO.variants.forEach((variant, index) => {
        // Build variant name from variantValues
        let variantName = `Biến thể ${index + 1}`;

        // Try to build name from attributes
        if (productDTO.variantValues && productDTO.attributes) {
            const variantAttrs = productDTO.variantValues
                .filter(vv => vv.variantId === variant.variantId);

            if (variantAttrs.length > 0) {
                const names = variantAttrs.map(vv => {
                    // Find attribute name
                    const attr = productDTO.attributes.find(a => {
                        return a.attributeValues && a.attributeValues.some(av => av.attributeValueId === vv.attributeValueId);
                    });

                    if (attr) {
                        const attrVal = attr.attributeValues.find(av => av.attributeValueId === vv.attributeValueId);
                        return `${attr.attributeName}: ${attrVal ? attrVal.attributeValueName : ''}`;
                    }
                    return '';
                }).filter(Boolean);

                if (names.length > 0) {
                    variantName = names.join(" - ");
                }
            }
        }

        const tr = document.createElement("tr");
        tr.dataset.variantId = variant.variantId;

        // Image HTML với error handling
        const imageHTML = variant.imageUrl
            ? `<img src="${variant.imageUrl}" alt="Variant" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div style="width: 50px; height: 50px; background: #f3f4f6; border-radius: 4px; display: none; align-items: center; justify-content: center;">
                   <i class="fa-solid fa-image" style="color: #9ca3af;"></i>
               </div>`
            : '<div style="width: 50px; height: 50px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-image" style="color: #9ca3af;"></i></div>';

        tr.innerHTML = `
            <td>${imageHTML}</td>
            <td>${variantName}</td>
            <td><input type="number" class="pm-input" value="${variant.originalPrice || 0}" data-field="originalPrice" style="width: 110px; padding: 6px;"></td>
            <td><input type="number" class="pm-input" value="${variant.price || 0}" data-field="price" style="width: 110px; padding: 6px;"></td>
            <td><input type="number" class="pm-input" value="${variant.stock || 0}" data-field="stock" style="width: 90px; padding: 6px;"></td>
            <td>${variant.sold || 0}</td>
            <td style="display: flex; gap: 4px;">
                <button type="button" class="pm-btn pm-btn-primary" style="padding: 6px 10px; font-size: 13px;" onclick="saveVariant('${variant.variantId}')">
                    <i class="fa-solid fa-save"></i> Lưu
                </button>
                <button type="button" class="pm-btn" style="padding: 6px 10px; font-size: 13px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white;" onclick="deleteVariantHandler('${variant.variantId}')">
                    <i class="fa-solid fa-trash"></i> Xóa
                </button>
            </td>
        `;

        variantsTableBody.appendChild(tr);
    });

    // Calculate and display total stock
    const totalStock = productDTO.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const totalStockEl = document.getElementById("totalStock");
    if (totalStockEl) {
        totalStockEl.textContent = totalStock.toLocaleString();
    }

    // Update main stock field (sum of all variants)
    const stockInput = document.getElementById("stock");
    if (stockInput) {
        stockInput.value = totalStock;
    }
}

// Save variant (global function for onclick)
window.saveVariant = async function (variantId) {
    const tr = document.querySelector(`tr[data-variant-id="${variantId}"]`);
    if (!tr) return;

    const originalPrice = parseFloat(tr.querySelector('[data-field="originalPrice"]').value) || 0;
    const price = parseFloat(tr.querySelector('[data-field="price"]').value) || 0;
    const stock = parseInt(tr.querySelector('[data-field="stock"]').value) || 0;

    const variantDTO = {
        variantId: variantId,
        originalPrice: originalPrice,
        price: price,
        stock: stock
    };

    console.log("Updating Variant:", JSON.stringify(variantDTO, null, 2));

    const formData = new FormData();
    formData.append("variantDTO",
        new Blob([JSON.stringify(variantDTO)], { type: "application/json" }),
        "variant.json"
    );

    try {
        const res = await updateVariant(formData);

        if (res.success) {
            showDialog("success", "Cập nhật biến thể thành công!");

            // Chỉ update sold count nếu backend trả về
            if (res.data && res.data.sold !== undefined) {
                const soldCell = tr.cells[5]; // Cell thứ 6 (index 5)
                soldCell.textContent = res.data.sold;
            }

            console.log("Variant updated successfully, UI refreshed");
        } else {
            showDialog("error", res.message || "Lỗi khi cập nhật biến thể");
        }
    } catch (e) {
        console.error("Update variant error:", e);
        showDialog("error", "Lỗi kết nối server");
    }
};

// Delete variant (global function for onclick)
window.deleteVariantHandler = async function (variantId) {
    const confirmed = confirm(
        "⚠️ XÓA BIẾN THỂ SẢN PHẨM\n\n" +
        "Bạn có chắc chắn muốn xóa biến thể này?\n" +
        "Hành động này không thể hoàn tác.\n\n" +
        "LƯU Ý: Không thể xóa biến thể có trong đơn hàng."
    );

    if (!confirmed) return;

    try {
        const res = await deleteVariant(variantId);

        if (res.success) {
            showDialog("success", "Xóa biến thể thành công!");

            // Reload product data to refresh variants
            if (currentProductId) {
                const productRes = await getProduct(currentProductId);
                if (productRes.success && productRes.data) {
                    loadProductData(productRes.data);
                    console.log("Product data reloaded after variant deletion");
                }
            }
        } else {
            // User-friendly error message
            let errorMsg = "Không thể xóa biến thể này";

            // Check if it's a foreign key constraint error (variant in orders)
            if (res.message && (
                res.message.toLowerCase().includes("reference") ||
                res.message.toLowerCase().includes("constraint") ||
                res.message.toLowerCase().includes("foreign key") ||
                res.message.toLowerCase().includes("order") ||
                res.message.toLowerCase().includes("conflicted")
            )) {
                errorMsg = "❌ Không thể xóa biến thể\n\nBiến thể này đang có trong đơn hàng của khách, không thể xóa để đảm bảo tính toàn vẹn dữ liệu.";
            } else if (res.message && res.message.toLowerCase().includes("xoá")) {
                errorMsg = "❌ Không thể xóa biến thể\n\nBiến thể này đang có trong đơn hàng của khách.";
            } else if (res.data && Array.isArray(res.data) && res.data[0]?.error) {
                errorMsg += ": " + res.data[0].error;
            } else if (res.message) {
                errorMsg += ": " + res.message;
            }

            showDialog("error", errorMsg);
            console.error("Delete variant failed:", res);
        }
    } catch (e) {
        console.error("Delete variant error:", e);
        showDialog("error", "Lỗi kết nối server. Vui lòng thử lại sau.");
    }
};

// Add delete button
function addDeleteButton() {
    const headerActions = document.querySelector(".pm-header-actions");

    if (document.getElementById("btnDelete")) return;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "pm-btn pm-btn-danger";
    deleteBtn.id = "btnDelete";
    deleteBtn.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
    deleteBtn.style.color = "white";
    deleteBtn.innerHTML = `
        <i class="fa-solid fa-trash"></i>
        Xóa Sản Phẩm
    `;

    deleteBtn.onclick = async () => {
        if (!currentProductId) {
            showDialog("error", "Không tìm thấy Product ID");
            return;
        }

        const confirmed = confirm(
            "⚠️ XÓA TOÀN BỘ SẢN PHẨM\n\n" +
            "Bạn có chắc chắn muốn xóa sản phẩm này?\n" +
            "- Tất cả variants sẽ bị xóa\n" +
            "- Hành động này không thể hoàn tác\n\n" +
            "LƯU Ý: Không thể xóa sản phẩm đã có đơn hàng."
        );

        if (!confirmed) return;

        try {
            const res = await deleteProduct(currentProductId);

            if (res.success) {
                showDialog("success", "Xóa sản phẩm thành công!");
                setTimeout(() => {
                    window.location.href = "/products-manager/edit.html";
                }, 1500);
            } else {
                // User-friendly error message
                let errorMsg = "Không thể xóa sản phẩm này";

                // Check for foreign key constraint error (product has orders)
                if (res.message && (
                    res.message.toLowerCase().includes("reference") ||
                    res.message.toLowerCase().includes("constraint") ||
                    res.message.toLowerCase().includes("foreign key") ||
                    res.message.toLowerCase().includes("order") ||
                    res.message.toLowerCase().includes("delete") ||
                    res.message.toLowerCase().includes("conflicted")
                )) {
                    errorMsg = "❌ Không thể xóa sản phẩm đã có đơn hàng\n\n" +
                        "Sản phẩm này đã được bán, không thể xóa để đảm bảo tính toàn vẹn dữ liệu đơn hàng.\n\n" +
                        "Gợi ý: Bạn có thể set stock = 0 để ẩn sản phẩm khỏi danh sách bán hàng.";
                } else if (res.message) {
                    errorMsg += ": " + res.message;
                }

                showDialog("error", errorMsg);
                console.error("Delete product failed:", res);
            }
        } catch (e) {
            console.error("Delete product error:", e);
            showDialog("error", "Lỗi kết nối server. Vui lòng thử lại sau.");
        }
    };

    headerActions.insertBefore(deleteBtn, headerActions.firstChild);
}

// Update product handler
async function updateProductHandler() {
    try {
        const formData = new FormData();

        // Build productDetailDTO
        const productDetailDTO = {
            productId: currentProductId,
            productName: document.getElementById("productName").value.trim(),
            description: document.getElementById("description").value.trim(),
            originalPrice: parseFloat(document.getElementById("originalPrice").value) || 0,
            price: parseFloat(document.getElementById("price").value) || 0,
            stock: parseInt(document.getElementById("stock").value) || 0,
            categoryId: document.getElementById("categoryId").value,
            brandId: document.getElementById("brandId").value,
        };

        console.log("Updating Product:", JSON.stringify(productDetailDTO, null, 2));

        formData.append("productDetailDTO",
            new Blob([JSON.stringify(productDetailDTO)], { type: "application/json" }),
            "product.json"
        );

        // Main image if changed
        const mainFile = document.getElementById("mainImageInput").files[0];
        if (mainFile) {
            formData.append("productImage", mainFile);
        }

        const res = await updateProduct(formData);

        if (res.success) {
            showDialog("success", "Cập nhật sản phẩm thành công!");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showDialog("error", res.message || "Lỗi khi cập nhật sản phẩm");
        }
    } catch (e) {
        console.error("Update error:", e);
        showDialog("error", "Lỗi kết nối server");
    }
}

// Delete product handler
async function deleteProductHandler(productId) {
    try {
        const res = await deleteProduct(productId);

        if (res.success) {
            showDialog("success", "Xóa sản phẩm thành công!");
            setTimeout(() => window.location.href = "/products-manager/index.html", 1500);
        } else {
            showDialog("error", res.message || "Lỗi khi xóa sản phẩm");
        }
    } catch (e) {
        console.error("Delete error:", e);
        showDialog("error", "Lỗi kết nối server");
    }
}

// Start
console.log("edit.js: Loaded");
init();
