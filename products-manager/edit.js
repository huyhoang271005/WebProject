import { showDialog } from "/dialog/index.js";
import { loadNavbar } from "/navbar/navbar.js";
import { fetchCategories, fetchBrands, getProduct, updateProduct, deleteProduct, updateVariant, deleteVariant } from "/products-manager/services.js";
import { toggleLoading } from "../lib/loader.js";

let currentProductId = null;
let categories = [];
let brands = [];

// Initialize
async function init() {
    toggleLoading(true);
    // Load Navbar
    await loadNavbar({ centerHTML: "" });

    // Load dropdown data
    await loadCategories();
    await loadBrands();

    // Setup events
    setupEvents();

    // Check URL params for product ID (linking from other pages)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (productId) {
        await searchProduct(productId);
    } else {
        showDialog("error", "Không tìm thấy thông tin sản phẩm trên URL", () => {
            window.location.href = "/products-manager/index.html";
        });
    }
    setTimeout(() => toggleLoading(false), 300);
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
    const btnSave = document.getElementById("btnSave");

    // Save (Update)
    btnSave.onclick = async () => {
        if (!currentProductId) {
            showDialog("error", "Chưa tìm thấy sản phẩm");
            return;
        }
        await updateProductHandler();
    };


    // Main image upload
    const mainImgArea = document.getElementById("mainImageArea");
    const mainImgInput = document.getElementById("mainImageInput");
    const mainImgPrev = document.getElementById("mainImagePreview");
    const mainImgPlace = document.getElementById("mainImagePlaceholder");

    mainImgArea.onclick = (e) => {
        if (e.target !== mainImgInput) {
            mainImgInput.click();
        }
    };

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
            loadProductData(res.data);

            // Show form and buttons
            document.getElementById("productFormSection").style.display = "block";
            document.getElementById("btnSave").style.display = "inline-flex";

            // Add delete button
            addDeleteButton();
        } else {
            showDialog("error", "Không tìm thấy sản phẩm này", () => {
                window.location.href = "/products-manager/index.html";
            });
        }
    } catch (e) {
        showDialog("error", "Lỗi khi tải thông tin sản phẩm", () => {
            window.location.href = "/products-manager/index.html";
        });
    }
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

}

// Load variants into table (editable)
function loadVariants(productDTO) {
    const variantsSection = document.getElementById("variantsSection");
    const variantsTableBody = document.getElementById("variantsTableBody");

    variantsSection.style.display = "block";
    variantsTableBody.innerHTML = "";

    let attributeValues = productDTO.attributes
        .flatMap(attribute => attribute.attributeValues);

    productDTO.variants.forEach((variant) => {
        // 1. Lấy danh sách ID thuộc về variant này
        let attributeValueIdsV = productDTO.variantValues
            .filter(vv => vv.variantId === variant.variantId)
            .map(vv => vv.attributeValueId);

        // 2. Tìm tên và nối chuỗi
        let variantName = attributeValueIdsV
            .map(id => {
                // Tìm object trong "kho" attributeValues
                const match = attributeValues.find(av => av.attributeValueId === id);
                // Trả về name nếu thấy, nếu không thấy trả về chuỗi rỗng để tránh crash
                return match ? match.attributeValueName : null;
            })
            .filter(name => name !== null) // Loại bỏ các ID không tìm thấy tên
            .join(" - ");

        const tr = document.createElement("tr");
        tr.dataset.variantId = variant.variantId;

        // Image HTML với input file để upload ảnh mới
        const imageHTML = `
            <div style="position: relative; width: 50px; height: 50px;">
                ${variant.imageUrl
                ? `<img src="${variant.imageUrl}" class="variant-img-${variant.variantId}" alt="Variant" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div style="width: 50px; height: 50px; background: #f3f4f6; border-radius: 4px; display: none; align-items: center; justify-content: center;">
                           <i class="fa-solid fa-image" style="color: #9ca3af;"></i>
                       </div>`
                : `<div class="variant-img-${variant.variantId}" style="width: 50px; height: 50px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-image" style="color: #9ca3af;"></i></div>`
            }
                <input type="file" class="variant-file-input" data-variant-id="${variant.variantId}" accept="image/*" 
                       style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" 
                       title="Click để thay đổi ảnh">
            </div>
        `;

        tr.innerHTML = `
            <td data-label="Ảnh">${imageHTML}</td>
            <td data-label="Tên biến thể">${variantName}</td>
            <td data-label="Giá gốc"><input type="number" class="pm-input" value="${variant.originalPrice || 0}" data-field="originalPrice" style="padding: 6px;"></td>
            <td data-label="Giá bán"><input type="number" class="pm-input" value="${variant.price || 0}" data-field="price" style="padding: 6px;"></td>
            <td data-label="Kho"><input type="number" class="pm-input" value="${variant.stock || 0}" data-field="stock" style="padding: 6px;"></td>
            <td data-label="Đã bán">${variant.sold || 0}</td>
            <td data-label="Thao tác" style="display: flex; gap: 4px;">
                <button type="button" class="pm-btn pm-btn-primary" style="padding: 8px; width: 36px; display: block" onclick="saveVariant('${variant.variantId}')" title="Lưu">
                    <i class="fa-solid fa-save"></i>
                </button>
                <button type="button" class="pm-btn" style="padding: 8px; width: 36px; display: block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white;" onclick="deleteVariantHandler('${variant.variantId}')" title="Xóa">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        // Event listener cho input file upload ảnh
        const fileInput = tr.querySelector('.variant-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (file) {
                    const variantId = this.dataset.variantId;
                    const imgElement = document.querySelector(`.variant-img-${variantId}`);

                    // Preview ảnh mới
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        if (imgElement.tagName === 'IMG') {
                            imgElement.src = event.target.result;
                            imgElement.style.display = 'block';
                        } else {
                            // Thay div bằng img
                            const newImg = document.createElement('img');
                            newImg.className = `variant-img-${variantId}`;
                            newImg.src = event.target.result;
                            newImg.style.cssText = 'width: 50px; height: 50px; object-fit: cover; border-radius: 4px;';
                            imgElement.replaceWith(newImg);
                        }
                    };
                    reader.readAsDataURL(file);

                }
            });
        }

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

    // Build variantDTO
    const variantDTO = {
        variantId: variantId,
        originalPrice: parseFloat(tr.querySelector('[data-field="originalPrice"]').value) || 0,
        price: parseFloat(tr.querySelector('[data-field="price"]').value) || 0,
        stock: parseInt(tr.querySelector('[data-field="stock"]').value) || 0
    };

    const formData = new FormData();

    // Lấy file ảnh nếu user đã chọn ảnh mới
    const fileInput = tr.querySelector('.variant-file-input');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const imageFile = fileInput.files[0];

        // Backend expects field name 'image'
        formData.append("image", imageFile);

        console.log("✅ Uploading variant image:", imageFile.name);
    }

    // Append variantDTO sau khi đã thêm imageName (nếu có)
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
        } else {
            await showDialog("error", res.message || "Lỗi khi cập nhật biến thể");
        }
    } catch (e) {
        await showDialog("error", "Lỗi kết nối server");
    }
};

// Delete variant (global function for onclick)
window.deleteVariantHandler = async function (variantId) {
    await showDialog("question", "⚠️ XÓA BIẾN THỂ SẢN PHẨM\n\nBạn có chắc chắn muốn xóa biến thể này?\nHành động này không thể hoàn tác.\n\nLƯU Ý: Không thể xóa biến thể có trong đơn hàng.", async () => {
        try {
            const res = await deleteVariant(variantId);
            await showDialog(res.success ? "success" : "error", res.message);
        } catch (e) {
            showDialog("error", "Lỗi kết nối server. Vui lòng thử lại sau.");
        }
    });
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

        showDialog("question", "⚠️ XÓA TOÀN BỘ SẢN PHẨM\n\nBạn có chắc chắn muốn xóa sản phẩm này?\n- Tất cả variants sẽ bị xóa\n- Hành động này không thể hoàn tác\n\nLƯU Ý: Không thể xóa sản phẩm đã có đơn hàng.", async () => {
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
                }
            } catch (e) {
                showDialog("error", "Lỗi kết nối server. Vui lòng thử lại sau.");
            }
        });
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


        formData.append("productDetailDTO",
            new Blob([JSON.stringify(productDetailDTO)], { type: "application/json" }),
            "product.json"
        );

        // Main image if changed
        const mainFile = document.getElementById("mainImageInput").files[0];
        if (mainFile) {
            // Backend expects field name 'image'
            formData.append("image", mainFile);
            console.log("✅ Uploading main image:", mainFile.name);
        }

        const res = await updateProduct(formData);

        if (res.success) {
            showDialog("success", "Cập nhật sản phẩm thành công!");
        } else {
            showDialog("error", res.message);
        }
    } catch (e) {
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
            showDialog("error", res.message);
        }
    } catch (e) {
        showDialog("error", "Lỗi kết nối server");
    }
}

// Start
init();
