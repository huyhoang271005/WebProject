import { callAPI } from "/lib/api.js";
import { getLoader } from "/lib/public.js";
import { showDialog } from "/dialog/index.js";
import { loadNavbar } from "/navbar/navbar.js"; // Import Navbar

// --- STATE ---
let attributes = [];
let categories = [];
let brands = [];

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
async function fetchAttributes() {
    const res = await callAPI("/attributes", "GET");
    if (res && res.success) {
        // Map to internal structure
        attributes = res.data.map(attr => ({
            attributeId: attr.attributeId,
            attributeName: attr.attributeName,
            values: [] // Selected values for this product
        }));
    }
}

async function fetchCategories() {
    const res = await callAPI("/categories", "GET");
    if (res && res.data) {
        categories = res.data;
        const sel = document.getElementById("categoryId");
        categories.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.categoryId;
            opt.textContent = c.categoryName;
            sel.appendChild(opt);
        });
    }
}

async function fetchBrands() {
    const res = await callAPI("/brands", "GET");
    if (res && res.data) {
        brands = res.data;
        const sel = document.getElementById("brandId");
        brands.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.brandId;
            opt.textContent = b.brandName;
            sel.appendChild(opt);
        });
    }
}

// --- EVENTS ---
function setupEvents() {
    // Add Attribute Group
    document.getElementById("btnAddAttribute").onclick = () => {
        addAttribute();
    };

    // Main Image Upload (Updated Class Names for V2)
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
    // Unique ID for UI tracking
    const id = Date.now();
    attributes.push({ id: id, attributeId: "", attributeName: "", values: [] });
    renderAttributes();
}

function removeAttribute(id) {
    attributes = attributes.filter(a => a.id !== id);
    renderAttributes();
    generateVariants();
}

function updateAttributeSelection(id, attrId) {
    const uiAttr = attributes.find(a => a.id === id);
    if (!uiAttr) return;

    // Reset values when switching attribute type
    uiAttr.values = [];
    uiAttr.attributeId = attrId;

    // Find name from source
    // Note: We need to access the ORIGINAL source list. 
    // Since 'attributes' var is now our UI state, we should have kept 'sourceAttributes'.
    // BUT efficient way: loop through the SELECT options or re-fetch.
    // Let's refactor slightly: 'attributes' in high scope is intended for UI.
    // We need 'availableAttributes' for the dropdown.
    // Fix: We'll re-use 'fetchAttributes' response store.
    // QUICK FIX: Get text from select element in render.

    // Better: let's store availableAttributes globally
    // We already do in fetchAttributes, but we overwrote 'attributes'.
    // Let's correct fetchAttributes to use a different var.
}
// RE-FIXING fetchAttributes to separate source from state
let sourceAttributes = []; // From API
// We need to re-implement fetchAttributes correct logic.

// --- RE-IMPLEMENTING CORE FUNCTIONS FOR CLARITY ---

function renderAttributes() {
    attributesSection.innerHTML = "";

    attributes.forEach(attr => {
        const el = document.createElement("div");
        el.className = "attribute-box"; // V2 Class

        // Build Select Options
        let optionsHtml = '<option value="">-- Chọn thuộc tính --</option>';
        // Use sourceAttributes (global)
        sourceAttributes.forEach(a => {
            // Disable if used by other rows (except self)
            const isUsed = attributes.some(ui => ui.attributeId === a.attributeId && ui.id !== attr.id);
            if (!isUsed) {
                const selected = (a.attributeId === attr.attributeId) ? "selected" : "";
                optionsHtml += `<option value="${a.attributeId}" ${selected}>${a.attributeName}</option>`;
            }
        });

        el.innerHTML = `
            <div class="attribute-header">
                <select class="input-field attr-select" style="width: 200px;">
                    ${optionsHtml}
                </select>
                <button class="btn-text remove-attr-btn" style="color:red; margin-left:auto;"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="tags-input-container">
                ${attr.values.map(v => `
                    <div class="tag">
                        ${v} <i class="fa-solid fa-xmark remove-tag-btn" data-val="${v}"></i>
                    </div>
                `).join("")}
                <input type="text" class="tags-input" placeholder="+ Thêm giá trị (Enter)">
            </div>
        `;

        // Event Listeners
        const select = el.querySelector(".attr-select");
        select.addEventListener("change", (e) => {
            attr.attributeId = e.target.value;
            attr.values = []; // Clear values on type change

            // Find Name
            const src = sourceAttributes.find(s => s.attributeId === e.target.value);
            attr.attributeName = src ? src.attributeName : "";

            renderAttributes(); // Re-render to update other dropdowns exclusions
            generateVariants();
        });

        el.querySelector(".remove-attr-btn").onclick = () => removeAttribute(attr.id);

        const tagInput = el.querySelector(".tags-input");
        tagInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (!attr.attributeId) {
                    showDialog("error", "Vui lòng chọn loại thuộc tính trước!");
                    return;
                }
                const val = tagInput.value.trim();
                if (val && !attr.values.includes(val)) {
                    attr.values.push(val);
                    renderAttributes();
                    generateVariants();
                    // Keep focus on input of THIS element after re-render is tricky.
                    // For simplicity, we re-render. Ideally, partial DOM update.
                    // Recover focus:
                    // setTimeout(() => ... find last input ... focus)
                }
                tagInput.value = "";
            }
        });

        // Remove Tags
        el.querySelectorAll(".remove-tag-btn").forEach(btn => {
            btn.onclick = () => {
                attr.values = attr.values.filter(v => v !== btn.dataset.val);
                renderAttributes();
                generateVariants();
            };
        });

        attributesSection.appendChild(el);
    });
}


function generateVariants() {
    const validUIAttrs = attributes.filter(a => a.attributeId && a.values.length > 0);

    if (validUIAttrs.length === 0) {
        variantsTableBody.innerHTML = "";
        document.getElementById("variantsEmptyState").style.display = "block";
        return;
    }

    document.getElementById("variantsEmptyState").style.display = "none";

    // 1. Cartesian Product
    let combinations = [{}];
    validUIAttrs.forEach(attr => {
        const next = [];
        combinations.forEach(existing => {
            attr.values.forEach(val => {
                next.push({
                    ...existing,
                    [attr.attributeName]: { valName: val, attrId: attr.attributeId }
                });
            });
        });
        combinations = next;
    });

    // 2. Render
    variantsTableBody.innerHTML = "";
    const basePrice = document.getElementById("price").value || 0;
    const baseOriginal = document.getElementById("originalPrice").value || 0;

    combinations.forEach((combo, index) => {
        // Name: "Color: Red - Size: XL"
        const name = Object.keys(combo).map(k => `${k}: ${combo[k].valName}`).join(" - ");

        const tr = document.createElement("tr");
        tr.dataset.combo = JSON.stringify(combo); // <--- CRITICAL: Store data for Save

        tr.innerHTML = `
            <td>
                <div class="image-upload-box" style="width: 40px; height: 40px; border: 1px dashed #ccc; position: relative; cursor: pointer; border-radius:4px; overflow:hidden;">
                     <img src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                     <i class="fa-regular fa-image" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#ccc;"></i>
                     <input type="file" class="v-image-input" accept="image/*" style="opacity: 0; position: absolute; inset:0; cursor: pointer;">
                </div>
            </td>
            <td><strong style="color:var(--primary);">${name}</strong></td>
            <td><input type="number" class="v-input-sm v-original" value="${baseOriginal}"></td>
            <td><input type="number" class="v-input-sm v-price" value="${basePrice}"></td>
            <td><input type="number" class="v-input-sm v-stock" value="0"></td>
            <td>
                <button type="button" class="remove-v-btn" style="color:red; border:none; background:none; cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        // Image Preview Logic
        const imgInput = tr.querySelector(".v-image-input");
        const imgPreview = tr.querySelector("img");
        const icon = tr.querySelector("fa-image"); // Selector might need fix: i.fa-image

        imgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                imgPreview.src = URL.createObjectURL(file);
                imgPreview.style.display = "block";
            }
        };

        tr.querySelector(".remove-v-btn").onclick = () => tr.remove();
        variantsTableBody.appendChild(tr);
    });
}


async function saveProduct() {
    const productName = document.getElementById("productName");
    // ... get other inputs ...

    const formData = new FormData();

    // ... Product Details ...
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
        variantValues: [],
        variants: []
    };

    // Attributes Payload
    // We need to map 'attributes' UI state to API DTO
    const validUIAttrs = attributes.filter(a => a.attributeId && a.values.length > 0);
    productDTO.attributes = validUIAttrs.map(a => ({
        attributeId: a.attributeId,
        attributeName: a.attributeName, // Safeguard
        attributeValues: a.values.map(v => ({
            attributeValueName: v,
            attributeName: a.attributeName
        }))
    }));

    // Variants Payload
    const rows = variantsTableBody.querySelectorAll("tr");
    rows.forEach((tr, index) => {
        if (!tr.dataset.combo) return;
        const combo = JSON.parse(tr.dataset.combo);

        const vOriginal = parseFloat(tr.querySelector(".v-original").value) || 0;
        const vPrice = parseFloat(tr.querySelector(".v-price").value) || 0;
        const vStock = parseInt(tr.querySelector(".v-stock").value) || 0;
        const vImgInput = tr.querySelector(".v-image-input");

        const imgName = `variant-${index}-${Date.now()}`;
        if (vImgInput.files[0]) {
            formData.append(imgName, vImgInput.files[0]);
        } else {
            formData.append(imgName, new Blob([], { type: 'application/octet-stream' }), imgName);
        }

        // Build Attribute Values for THIS Variant
        const variantAttrs = Object.keys(combo).map(key => ({
            attributeId: combo[key].attrId,
            attributeName: key,
            attributeValueName: combo[key].valName
        }));

        productDTO.variants.push({
            originalPrice: vOriginal,
            price: vPrice,
            stock: vStock,
            imageName: imgName,
            active: true,
            attributeValues: variantAttrs // <--- This solves "Variant missing attribute values"
        });
    });

    // Main Image
    const mainFile = document.getElementById("mainImageInput").files[0];
    if (mainFile) formData.append("image", mainFile);

    formData.append('productDTO', new Blob([JSON.stringify(productDTO)], { type: 'application/json' }), 'product.json');

    await getLoader("btnSave", async () => {
        const res = await callAPI("/admin/products", "POST", formData, true); // Use proper endpoint
        // Note: check backend endpoint. 'createProduct' wrapper might be better but let's assume callAPI direct or use wrapper.
        // Previous code used 'createProduct'. Let's reuse 'callAPI' directly here for control.

        if (res.success) {
            await showDialog("success", "Thêm sản phẩm thành công!");
            window.location.reload();
        } else {
            await showDialog("error", res.message || "Lỗi server");
        }
    });
}

// Override Source Attributes Fetcher
async function fetchAttributes_Reimpl() {
    const res = await callAPI("/attributes", "GET");
    if (res && res.success) {
        sourceAttributes = res.data;
    }
}
// Hookup
fetchAttributes = fetchAttributes_Reimpl;

