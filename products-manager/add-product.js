import { callAPI } from "/lib/api.js";
import { getLoader } from "/lib/public.js";
import { showDialog } from "/dialog/index.js";
import { loadNavbar } from "/navbar/navbar.js"; // Import Navbar

// --- STATE ---
let attributes = [];
let categories = [];
let brands = [];
let sourceAttributes = []; // Global source attributes to keep sync
let selectedAttributeRows = []; // State for UI rows

const variantsTableBody = document.getElementById("variantsTableBody");
const attributesSection = document.getElementById("attributesSection");

// --- INIT ---
export async function initAddProduct() {
    console.log("initAddProduct called");

    // 1. Load Navbar
    await loadNavbar({ centerHTML: "" }); // Optional center content

    // 2. Load Data
    await Promise.all([
        fetchAttributes(),
        fetchCategories(),
        fetchBrands()
    ]);

    // 3. Setup Events
    setupEvents();
}

// --- FETCH DATA ---
function getListData(res) {
    if (!res) return [];
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.listData)) return res.data.listData;
    if (Array.isArray(res)) return res;
    return [];
}

async function fetchAttributes() {
    try {
        const res = await callAPI("/attributes", "GET");
        const list = getListData(res);
        sourceAttributes = list;
        // Note: we don't init 'attributes' state here anymore, it's dynamic
    } catch (e) {
        console.error("Error fetching attributes", e);
    }
}

async function fetchCategories() {
    try {
        const res = await callAPI("/categories", "GET");
        categories = getListData(res);

        const sel = document.getElementById("categoryId");
        sel.innerHTML = '<option value="">-- Chọn --</option>';

        categories.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.categoryId;
            opt.textContent = c.categoryName;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error("Error fetching categories", e);
    }
}

async function fetchBrands() {
    try {
        const res = await callAPI("/brands", "GET");
        brands = getListData(res);

        const sel = document.getElementById("brandId");
        sel.innerHTML = '<option value="">-- Chọn --</option>';

        brands.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.brandId;
            opt.textContent = b.brandName;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error("Error fetching brands", e);
    }
}

// --- EVENTS ---
function setupEvents() {
    // Add Attribute Group
    document.getElementById("btnAddAttribute").onclick = () => {
        addAttribute();
    };

    // Main Image Upload
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

    // Save
    document.getElementById("btnSave").onclick = saveProduct;

    // Cancel
    document.getElementById("btnCancel").onclick = () => {
        if (confirm("Hủy bỏ và làm mới?")) {
            window.location.reload();
        }
    };
}

// --- ATTRIBUTE LOGIC ---
function addAttribute() {
    const id = Date.now() + Math.random();
    selectedAttributeRows.push({ id: id, attributeId: "", values: [] });
    renderAttributes();
}

function removeAttribute(id) {
    selectedAttributeRows = selectedAttributeRows.filter(r => r.id !== id);
    renderAttributes();
    generateVariants();
}

function renderAttributes() {
    attributesSection.innerHTML = "";

    selectedAttributeRows.forEach(row => {
        const el = document.createElement("div");
        el.className = "pm-attribute-box"; // V3 Class

        // Options
        let optionsHtml = '<option value="">-- Chọn thuộc tính --</option>';
        sourceAttributes.forEach(src => {
            const isUsed = selectedAttributeRows.some(r => r.attributeId == src.attributeId && r.id !== row.id);
            if (!isUsed) {
                const selected = (src.attributeId == row.attributeId) ? "selected" : "";
                optionsHtml += `<option value="${src.attributeId}" ${selected}>${src.attributeName}</option>`;
            }
        });

        // V3 Structure
        el.innerHTML = `
            <div class="pm-attribute-header">
                <select class="pm-input pm-select attr-select" style="max-width: 250px;">
                    ${optionsHtml}
                </select>
                <div class="pm-remove-attr-btn"><i class="fa-solid fa-trash"></i></div>
            </div>
            <div class="pm-tags-container">
                ${row.values.map(v => `
                    <div class="pm-tag">
                        ${v} <i class="fa-solid fa-xmark remove-tag-btn" data-val="${v}"></i>
                    </div>
                `).join("")}
                <input type="text" class="pm-tags-input" placeholder="+ Thêm giá trị (Enter)">
            </div>
        `;

        // Events
        const select = el.querySelector(".attr-select");
        select.addEventListener("change", (e) => {
            row.attributeId = e.target.value;
            row.values = [];
            renderAttributes();
            generateVariants();
        });

        el.querySelector(".pm-remove-attr-btn").onclick = () => removeAttribute(row.id);

        const tagInput = el.querySelector(".pm-tags-input");
        tagInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (!row.attributeId) {
                    showDialog("error", "Vui lòng chọn thuộc tính!");
                    return;
                }
                const val = tagInput.value.trim();
                if (val && !row.values.includes(val)) {
                    row.values.push(val);
                    renderAttributes();
                    generateVariants();
                }
            }
        });

        el.querySelectorAll(".remove-tag-btn").forEach(btn => {
            btn.onclick = () => {
                row.values = row.values.filter(v => v !== btn.dataset.val);
                renderAttributes();
                generateVariants();
            };
        });

        attributesSection.appendChild(el);
    });
}

function generateVariants() {
    const validRows = selectedAttributeRows.filter(r => r.attributeId && r.values.length > 0);

    if (validRows.length === 0) {
        variantsTableBody.innerHTML = "";
        document.getElementById("variantsEmptyState").style.display = "block";
        return;
    }
    document.getElementById("variantsEmptyState").style.display = "none";

    let combinations = [{}];
    validRows.forEach(row => {
        const src = sourceAttributes.find(s => s.attributeId == row.attributeId);
        const attrName = src ? src.attributeName : "Unknown";

        const next = [];
        combinations.forEach(existing => {
            row.values.forEach(val => {
                next.push({
                    ...existing,
                    [attrName]: { valName: val, attrId: row.attributeId }
                });
            });
        });
        combinations = next;
    });

    variantsTableBody.innerHTML = "";
    const basePrice = document.getElementById("price").value || 0;
    const baseOriginal = document.getElementById("originalPrice").value || 0;

    combinations.forEach((combo, index) => {
        const name = Object.keys(combo).map(k => `${k}: ${combo[k].valName}`).join(" - ");

        const tr = document.createElement("tr");
        tr.dataset.combo = JSON.stringify(combo);

        tr.innerHTML = `
            <td>
                <img src="" class="pm-variant-img" style="display:none;">
                <div class="pm-variant-img-placeholder" style="width:48px;height:48px;border:1px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                    <i class="fa-solid fa-camera" style="color:#ccc;"></i>
                </div>
                <input type="file" class="v-image-input" accept="image/*" style="display:none;">
            </td>
            <td><strong style="color:#667eea;">${name}</strong></td>
            <td><input type="number" class="pm-variant-input v-original" value="${baseOriginal}"></td>
            <td><input type="number" class="pm-variant-input v-price" value="${basePrice}"></td>
            <td><input type="number" class="pm-variant-input v-stock" value="0"></td>
            <td>
                <button type="button" class="remove-v-btn" style="color:#ef4444; border:none; background:none; cursor:pointer; font-size:16px;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;

        // Variant Image Logic
        const imgInput = tr.querySelector(".v-image-input");
        const imgPreview = tr.querySelector(".pm-variant-img");
        const imgPlaceholder = tr.querySelector(".pm-variant-img-placeholder");

        // Click Trigger
        imgPlaceholder.onclick = () => imgInput.click();
        imgPreview.onclick = () => imgInput.click();

        imgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                imgPreview.src = URL.createObjectURL(file);
                imgPreview.style.display = "block";
                imgPlaceholder.style.display = "none";
            }
        };

        tr.querySelector(".remove-v-btn").onclick = () => tr.remove();
        variantsTableBody.appendChild(tr);
    });
}

// REMOVED safeParseInt - IDs are UUID Strings!

async function saveProduct() {
    const formData = new FormData();

    const productDTO = {
        productDetailDTO: {
            productName: document.getElementById("productName").value.trim(),
            description: document.getElementById("description").value.trim(),
            originalPrice: parseFloat(document.getElementById("originalPrice").value) || 0,
            price: parseFloat(document.getElementById("price").value) || 0,
            stock: parseInt(document.getElementById("stock").value) || 0,
            categoryId: document.getElementById("categoryId").value,
            brandId: document.getElementById("brandId").value,
        },
        attributes: [],
        variants: [],
        variantValues: []
    };

    // Attributes Payload
    /*
       Structure:
       attributes: [
          { attributeId: 1, attributeName: "Color", attributeValues: [{attributeValueName: "Red", attributeName: "Color"}, ...] }
       ]
    */
    const validRows = selectedAttributeRows.filter(r => r.attributeId && r.values.length > 0);
    productDTO.attributes = validRows.map(row => {
        const src = sourceAttributes.find(s => s.attributeId == row.attributeId);
        const attrName = src ? src.attributeName : "Unknown";
        return {
            attributeId: row.attributeId, // UUID String
            attributeName: attrName,
            attributeValues: row.values.map(v => ({
                attributeValueName: v,
                attributeName: attrName
            }))
        };
    });

    // Variants
    const rows = variantsTableBody.querySelectorAll("tr");
    rows.forEach((tr, index) => {
        if (!tr.dataset.combo) return;
        const combo = JSON.parse(tr.dataset.combo);

        const vOriginal = parseFloat(tr.querySelector(".v-original").value) || 0;
        const vPrice = parseFloat(tr.querySelector(".v-price").value) || 0;
        const vStock = parseInt(tr.querySelector(".v-stock").value) || 0;
        const vImgInput = tr.querySelector(".v-image-input");

        const imgName = `variant-${index}-${Date.now()}`;
        // Correctly handle Blob vs File
        if (vImgInput.files[0]) {
            formData.append(imgName, vImgInput.files[0]); // Browser adds filename automatically
        } else {
            // Reverted: No filename needed if backend ignores it
            formData.append(imgName, new Blob([], { type: 'application/octet-stream' }));
        }

        // FIX: Ensure IDs are Strings (UUID)
        const variantAttrs = Object.keys(combo).map(key => ({
            attributeId: combo[key].attrId, // UUID String
            attributeName: key,
            attributeValueName: combo[key].valName
        }));

        productDTO.variants.push({
            originalPrice: vOriginal,
            price: vPrice,
            stock: vStock,
            imageName: imgName,
            active: true,
            attributeValues: variantAttrs,
            variantValues: variantAttrs // Try sending both to cover naming mismatch
        });
    });

    // Main Image
    const mainFile = document.getElementById("mainImageInput").files[0];
    if (mainFile) formData.append("image", mainFile);

    // Debug Payload
    console.log("Saving Product DTO:", JSON.stringify(productDTO, null, 2));

    // Revert key to 'productDTO' and add filename + content-type
    formData.append("productDTO", new Blob([JSON.stringify(productDTO)], { type: "application/json" }), "product.json");

    try {
        // FIX: Must pass `true` for isMultipart argument
        const res = await callAPI('/admin/products', 'POST', formData, true);
        if (res.success) {
            showDialog("success", "Thêm sản phẩm thành công!");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            console.error("API Error Data:", res.data); // Log detailed validation errors
            showDialog("error", res.message || "Lỗi khi lưu sản phẩm");
        }
    } catch (e) {
        console.error("Exception:", e);
        showDialog("error", "Lỗi kết nối server");
    } finally {
        isSubmitting = false;
        hideLoader();
    }
}
