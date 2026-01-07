// ui.js - UI Management for Products Manager
export const UI = {
    // Cache Elements
    els: {
        // Views
        addView: document.getElementById('addView'),
        editView: document.getElementById('editView'),

        // Tabs
        btnTabAdd: document.getElementById('btnTabAdd'),
        btnTabEdit: document.getElementById('btnTabEdit'),

        // Form Inputs
        form: document.getElementById("productForm"),
        productName: document.getElementById("productName"),
        description: document.getElementById("description"),
        price: document.getElementById("price"),
        priceOriginal: document.getElementById("priceOriginal"),
        categoryId: document.getElementById("categoryId"),
        brandId: document.getElementById("brandId"),
        mainImageInput: document.getElementById("mainImage"),
        mainImagePreview: document.getElementById("mainImagePreview"),

        // Form Actions
        btnSubmit: document.getElementById("btnSubmit"),
        submitBtnText: document.getElementById("submitBtnText"),
        submitSpinner: document.getElementById("submitSpinner"),
        btnReset: document.getElementById("btnReset"),

        // Variant Containers
        attrContainer: document.getElementById("attributesContainer"),
        variantContainer: document.getElementById("variantsContainer"),
        btnAddAttr: document.getElementById("btnAddAttr"),
        btnGenerateVariants: document.getElementById("btnGenerateVariants"),

        // Edit View
        searchProductInput: document.getElementById("searchProductInput"),
        btnSearchProduct: document.getElementById("btnSearchProduct")
    },

    // Switch between Add and Edit views
    switchView(viewName) { // 'add' or 'edit'
        if (viewName === 'add') {
            UI.els.addView.classList.remove('d-none');
            UI.els.editView.classList.add('d-none');
            UI.els.btnTabAdd.classList.remove('btn-outline-success');
            UI.els.btnTabAdd.classList.add('btn-success');
            UI.els.btnTabEdit.classList.remove('btn-primary');
            UI.els.btnTabEdit.classList.add('btn-outline-primary');
        } else {
            UI.els.addView.classList.add('d-none');
            UI.els.editView.classList.remove('d-none');
            UI.els.btnTabAdd.classList.remove('btn-success');
            UI.els.btnTabAdd.classList.add('btn-outline-success');
            UI.els.btnTabEdit.classList.remove('btn-outline-primary');
            UI.els.btnTabEdit.classList.add('btn-primary');
        }
    },

    setLoading(isLoading) {
        if (isLoading) {
            UI.els.btnSubmit.disabled = true;
            UI.els.submitSpinner.classList.remove('d-none');
        } else {
            UI.els.btnSubmit.disabled = false;
            UI.els.submitSpinner.classList.add('d-none');
        }
    },

    // FORM HELPERS
    renderBrands: (brands, cateId, selectedBrandId = null) => {
        const sel = UI.els.brandId;
        if (!sel) return;
        sel.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        if (!cateId || !brands || brands.length === 0) {
            console.log("No brands to render. cateId:", cateId, "brands:", brands);
            return;
        }

        // Filter brands by category if needed
        const filtered = brands.filter(b => b.categoryId == cateId);
        const brandsToShow = filtered.length > 0 ? filtered : brands;
        
        console.log("Rendering brands:", brandsToShow, "selectedBrandId:", selectedBrandId);
        
        brandsToShow.forEach(b => {
            const selected = (selectedBrandId && (b.brandId == selectedBrandId || b.brandId === selectedBrandId)) ? 'selected' : '';
            sel.innerHTML += `<option value="${b.brandId}" ${selected}>${b.brandName}</option>`;
        });
        
        // Force set value if selectedBrandId provided
        if (selectedBrandId && sel.value !== selectedBrandId) {
            sel.value = selectedBrandId;
        }
    },

    renderCategories: (cates) => {
        const sel = UI.els.categoryId;
        if (!sel) return;
        sel.innerHTML = `<option value="">-- Chọn danh mục --</option>`;
        cates.forEach(c => {
            sel.innerHTML += `<option value="${c.categoryId}">${c.categoryName}</option>`;
        });
    },

    renderMainImage: (src) => {
        const preview = UI.els.mainImagePreview;
        if (!preview) return;

        if (src) {
            preview.innerHTML = `<img src="${src}" class="img-fluid w-100 h-100" style="object-fit: contain;">`;
        } else {
            preview.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-image fs-1 d-block mb-2"></i>
                    <small>Chưa có ảnh</small>
                </div>`;
        }
    },

    // Attribute Row
    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        if (!UI.els.attrContainer) return;
        const div = document.createElement("div");
        div.className = "mb-3 attr-row border rounded p-3 bg-light";
        if (attrId) div.dataset.attrId = attrId;
        if (Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);

        const attrOptions = allAttributes.map(attr =>
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');

        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-md-4">
                    <select class="inp-attr-select form-select form-select-sm">
                        <option value="">-- Chọn thuộc tính --</option>
                        ${attrOptions}
                    </select>
                </div>
                <div class="col-md-7">
                    <input type="text" class="inp-attr-vals form-control form-control-sm" value="${valuesVal}" placeholder="Giá trị (VD: Đỏ, Xanh)">
                </div>
                <div class="col-md-1 text-end">
                    <button type="button" class="btn-remove btn btn-sm btn-outline-danger"><i class="bi bi-x-lg"></i></button>
                </div>
            </div>`;

        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");

        selectEl.onchange = (e) => {
            const selectedAttr = allAttributes.find(a => a.attributeId === e.target.value);
            if (selectedAttr) {
                div.dataset.attrId = selectedAttr.attributeId;
                if (selectedAttr.attributeValues && selectedAttr.attributeValues.length) {
                    inputEl.value = selectedAttr.attributeValues.map(v => v.attributeValueName).join(", ");
                }
            }
            if (onInputCallback) onInputCallback();
        }
        inputEl.oninput = () => { if (onInputCallback) onInputCallback(); };
        div.querySelector(".btn-remove").onclick = () => { div.remove(); if (onInputCallback) onInputCallback(); };
        UI.els.attrContainer.appendChild(div);
    },

    // Variants Table
    renderVariants: (variants) => {
        if (!UI.els.variantContainer) return;

        if (!variants || !variants.length) {
            UI.els.variantContainer.innerHTML = "";
            return;
        }

        const tableHTML = `
            <div class="table-responsive rounded border">
                <table class="table table-sm align-middle mb-0 bg-white">
                    <thead class="table-light">
                        <tr class="text-center">
                            <th width="50">Ảnh</th>
                            <th class="text-start">Phân loại</th>
                            <th width="100">Giá gốc</th>
                            <th width="100">Giá bán</th>
                            <th width="80">Kho</th>
                            <th width="40"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${variants.map((v, i) => {
            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl || "");
            return `
                            <tr>
                                <td class="text-center p-1">
                                    <div class="ratio ratio-1x1 mx-auto bg-light rounded border position-relative" style="width: 40px; cursor: pointer;"
                                         onclick="document.getElementById('v_file_${i}').click()">
                                         ${imgSrc ? `<img src="${imgSrc}" class="w-100 h-100" style="object-fit: cover;">` : `<i class="bi bi-camera text-muted position-absolute top-50 start-50 translate-middle"></i>`}
                                    </div>
                                    <input type="file" id="v_file_${i}" hidden onchange="window.handleSelectVariantImage(${i}, this)" accept="image/*">
                                </td>
                                <td>
                                    <div class="fw-bold text-dark small">${v.name || ""}</div>
                                    <div class="text-muted" style="font-size: 0.75rem;">${(v.comboValues && v.comboValues.length) ? v.comboValues.join(" - ") : ""}</div>
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-end" value="${v.priceOriginal}" onchange="window.updateVar(${i},'priceOriginal',this.value)">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-end fw-bold text-primary" value="${v.price}" onchange="window.updateVar(${i},'price',this.value)">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm text-center" value="${v.stock}" onchange="window.updateVar(${i},'stock',this.value)">
                                </td>
                                <td class="text-center">
                                    <button type="button" onclick="window.removeVariant(${i})" class="btn btn-link text-danger p-0"><i class="bi bi-trash"></i></button>
                                </td>
                            </tr>`;
        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="form-text mt-1 text-end"><i class="bi bi-info-circle"></i> Nhập giá trị để cập nhật tự động.</div>
        `;

        UI.els.variantContainer.innerHTML = tableHTML;
    },


    resetForm: () => {
        if (!UI.els.form) return;
        UI.els.form.reset();
        UI.els.productName.value = "";
        UI.els.description.value = "";
        UI.els.price.value = "";
        UI.els.priceOriginal.value = "";
        UI.els.categoryId.value = "";
        UI.els.brandId.innerHTML = '<option value="">-- Chọn thương hiệu --</option>';

        UI.els.attrContainer.innerHTML = "";
        UI.els.variantContainer.innerHTML = "";
        UI.renderMainImage(null);
        UI.els.submitBtnText.innerText = "Lưu Sản Phẩm";
    }
};
