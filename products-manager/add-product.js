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
        el.className = "attribute-box";

        // Options
        let optionsHtml = '<option value="">-- Chọn thuộc tính --</option>';
        sourceAttributes.forEach(src => {
            const isUsed = selectedAttributeRows.some(r => r.attributeId == src.attributeId && r.id !== row.id);
            if (!isUsed) {
                const selected = (src.attributeId == row.attributeId) ? "selected" : "";
                optionsHtml += `<option value="${src.attributeId}" ${selected}>${src.attributeName}</option>`;
            }
        });

        el.innerHTML = `
            <div class="attribute-header">
                <select class="input-field attr-select" style="width: 200px;">
                    ${optionsHtml}
                </select>
                <div class="remove-attr-btn"><i class="fa-solid fa-trash"></i></div>
            </div>
            <div class="tags-input-container">
                ${row.values.map(v => `
                    <div class="tag">
                        ${v} <i class="fa-solid fa-xmark remove-tag-btn" data-val="${v}"></i>
                    </div>
                `).join("")}
                <input type="text" class="tags-input" placeholder="+ Thêm giá trị (Enter)">
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

        el.querySelector(".remove-attr-btn").onclick = () => removeAttribute(row.id);

        const tagInput = el.querySelector(".tags-input");
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

        // Variant Image Logic
        const imgInput = tr.querySelector(".v-image-input");
        const imgBox = tr.querySelector(".image-upload-box");
        const imgPreview = tr.querySelector("img");

        // FIX CLICK: Explicit handler
        imgBox.onclick = (e) => {
            // Avoid double trigger if clicking input directly (though it's hidden/0 opacity)
            if (e.target !== imgInput) {
                imgInput.click();
            }
        };

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

function safeParseInt(val) {
    const parsed = parseInt(val);
    return isNaN(parsed) ? null : parsed;
}

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
            attributeId: safeParseInt(row.attributeId), // Force Int
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
        if (vImgInput.files[0]) {
            formData.append(imgName, vImgInput.files[0]);
        } else {
            formData.append(imgName, new Blob([], { type: 'application/octet-stream' }), imgName);
        }

        // FIX: Ensure IDs are Int and Names are populated
        const variantAttrs = Object.keys(combo).map(key => ({
            attributeId: safeParseInt(combo[key].attrId),
            attributeName: key,
            attributeValueName: combo[key].valName
        }));

        productDTO.variants.push({
            originalPrice: vOriginal,
            price: vPrice,
            stock: vStock,
            imageName: imgName,
            active: true,
            attributeValues: variantAttrs
        });
    });

    // Main Image
    const mainFile = document.getElementById("mainImageInput").files[0];
    if (mainFile) formData.append("image", mainFile);

    // Debug Payload
    console.log("Saving Product DTO:", JSON.stringify(productDTO, null, 2));

    formData.append('productDTO', new Blob([JSON.stringify(productDTO)], { type: 'application/json' }), 'product.json');

    await getLoader("btnSave", async () => {
        const res = await callAPI("/admin/products", "POST", formData, true);
        if (res.success) {
            await showDialog("success", "Thêm sản phẩm thành công!");
            window.location.reload();
        } else {
            console.error(res);
            await showDialog("error", res.message || "Lỗi server");
        }
    });
}
