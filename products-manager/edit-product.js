import { callAPI } from "/lib/api.js";
import { showDialog } from "/dialog/index.js";

let currentProductId = null;

// Initialize search functionality
export function initSearch() {
    const btnSearch = document.getElementById("btnSearch");
    const searchInput = document.getElementById("searchProductId");

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
            btnSearch.click();
        }
    });
}

async function searchProduct(productId) {
    try {
        const res = await callAPI(`/admin/products/${productId}`, "GET");

        if (res.success && res.data) {
            currentProductId = productId;
            showSearchResult(`Tìm thấy: ${res.data.productDetailDTO.productName}`, "success");
            loadProductData(res.data);

            // Change header title
            document.querySelector(".pm-title").textContent = "Sửa Sản Phẩm";

            // Add delete button if not exists
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

function loadProductData(productDTO) {
    // Load basic info
    document.getElementById("productName").value = productDTO.productDetailDTO.productName || "";
    document.getElementById("description").value = productDTO.productDetailDTO.description || "";
    document.getElementById("price").value = productDTO.productDetailDTO.price || 0;
    document.getElementById("originalPrice").value = productDTO.productDetailDTO.originalPrice || 0;
    document.getElementById("stock").value = productDTO.productDetailDTO.stock || 0;
    document.getElementById("categoryId").value = productDTO.productDetailDTO.categoryId || "";
    document.getElementById("brandId").value = productDTO.productDetailDTO.brandId || "";

    // TODO: Load variants and attributes
    console.log("Product loaded:", productDTO);
}

function addDeleteButton() {
    const headerActions = document.querySelector(".pm-header-actions");

    // Check if delete button already exists
    if (document.getElementById("btnDelete")) return;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "pm-btn pm-btn-danger";
    deleteBtn.id = "btnDelete";
    deleteBtn.innerHTML = `
        <i class="fa-solid fa-trash"></i>
        Xóa Sản Phẩm
    `;

    deleteBtn.onclick = async () => {
        if (!currentProductId) return;

        if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
            await deleteProduct(currentProductId);
        }
    };

    headerActions.insertBefore(deleteBtn, headerActions.firstChild);
}

async function deleteProduct(productId) {
    try {
        const res = await callAPI(`/admin/products/${productId}`, "DELETE");

        if (res.success) {
            showDialog("success", "Xóa sản phẩm thành công!");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showDialog("error", res.message || "Lỗi khi xóa sản phẩm");
        }
    } catch (e) {
        console.error("Delete error:", e);
        showDialog("error", "Lỗi kết nối server");
    }
}
