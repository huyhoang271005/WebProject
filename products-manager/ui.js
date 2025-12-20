// ui.js
export const UI = {
    // Cache sẵn các Element
    els: {
        list: document.getElementById("listView"),        // ✅ SỬA
        form: document.getElementById("createView"),      // ✅ SỬA
        
        tableBody: document.getElementById("productTableBody"), 
        
        cateSelect: document.getElementById("categoryId"),     // ✅ SỬA
        brandSelect: document.getElementById("brandId"),       // ✅ SỬA
        attrContainer: document.getElementById("attributesContainer"), // ✅ SỬA
        variantWrapper: document.getElementById("variantsContainer"),  // ✅ SỬA
        variantList: document.getElementById("variantsContainer"),     // ✅ SỬA
        formTitle: document.querySelector("#createView h2"),  // ✅ SỬA
        mainImgPreview: document.getElementById("mainImagePreview"),
        mainImgPlaceholder: null,
        mainImgInput: document.getElementById("mainImage")    // ✅ SỬA
    },

    switchView: (viewName) => {
        if (viewName === 'list') {
            if(UI.els.list) UI.els.list.classList.remove('d-none');
            if(UI.els.form) UI.els.form.classList.add('d-none');
        } else {
            if(UI.els.list) UI.els.list.classList.add('d-none');
            if(UI.els.form) UI.els.form.classList.remove('d-none');
        }
    },

    renderTable: (products) => {
        if (!UI.els.tableBody) return;

        if (!products || !products.length) {
            UI.els.tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted">
                        Không có dữ liệu
                    </td>
                </tr>`;
            return;
        }

        const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

        UI.els.tableBody.innerHTML = products.map(p => {
            // Xử lý ảnh
            let imgUrl = "https://via.placeholder.com/50";
            if (p.imageUrl) imgUrl = p.imageUrl;
            else if (p.imageName) imgUrl = `/images/${p.imageName}`;

            // Xử lý giá gốc
            const priceOriginalDisplay = (p.priceOriginal && p.priceOriginal > 0)
                ? fmt.format(p.priceOriginal) 
                : '-';

            // Đếm số loại
            const variantCount = p.variants ? p.variants.length : 0;
            const variantBadge = variantCount > 0 
                ? `<span class="badge bg-info text-white">${variantCount} loại</span>` 
                : `<span class="badge bg-secondary">Đơn thể</span>`;

            return `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${imgUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border: 1px solid #dee2e6;">
                        <strong>${p.productName}</strong>
                    </div>
                </td>
                
                <td>
                    ${p.categoryName || '-'} <br>
                    <small class="text-muted">${p.brandName || '-'}</small>
                </td>
                
                <td style="color: #999; text-decoration: line-through;">
                    ${priceOriginalDisplay}
                </td>

                <td style="color:#d32f2f; font-weight:bold; font-size:1.1em">
                    ${fmt.format(p.price)}
                </td>

                <td>${variantBadge}</td>

                <td class="text-end pe-4">
                    <button onclick="window.editProduct('${p.productId}')" class="btn btn-sm btn-outline-primary" title="Sửa">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button onclick="window.deleteProduct('${p.productId}')" class="btn btn-sm btn-outline-danger" title="Xóa">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    },

    renderBrands: (brands, cateId, selectedBrandId = null) => {
        if (!UI.els.brandSelect) return;
        UI.els.brandSelect.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        
        if (!cateId) return;
        
        const filtered = brands.filter(b => b.categoryId == cateId);
        (filtered.length ? filtered : brands).forEach(b => {
            const selected = (selectedBrandId && b.brandId == selectedBrandId) ? 'selected' : '';
            UI.els.brandSelect.innerHTML += `<option value="${b.brandId}" ${selected}>${b.brandName}</option>`;
        });
    },

    renderMainImage: (src) => {
        const preview = document.getElementById("mainImagePreview");
        if (!preview) return;
        
        if (src) {
            preview.innerHTML = `<img src="${src}" class="img-fluid rounded" style="max-height: 300px;">`;
        } else {
            preview.innerHTML = `<p class="text-muted">Chưa chọn ảnh</p>`;
        }
    },

    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        if (!UI.els.attrContainer) return;

        const div = document.createElement("div");
        div.className = "attr-row mb-3 p-3 border rounded bg-light";
        if (attrId) div.dataset.attrId = attrId;
        if (Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);
        
        const attrOptions = allAttributes.map(attr => 
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');

        div.innerHTML = `
            <div class="row g-2">
                <div class="col-md-4">
                    <select class="inp-attr-select form-select">
                        <option value="">-- Chọn thuộc tính --</option>
                        ${attrOptions}
                    </select>
                </div>
                <div class="col-md-7">
                    <input type="text" class="inp-attr-vals form-control" value="${valuesVal}" placeholder="Nhập giá trị (ngăn cách phẩy)...">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn-remove btn btn-danger w-100">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `;

        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");
        
        selectEl.onchange = (e) => {
            const selectedAttr = allAttributes.find(a => a.attributeId === e.target.value);
            if(selectedAttr) {
                 div.dataset.attrId = selectedAttr.attributeId;
                 if(selectedAttr.attributeValues && selectedAttr.attributeValues.length) {
                     inputEl.value = selectedAttr.attributeValues.map(v => v.attributeValueName).join(", ");
                 }
            }
            if(onInputCallback) onInputCallback();
        }

        inputEl.oninput = () => { if(onInputCallback) onInputCallback(); };
        div.querySelector(".btn-remove").onclick = () => { div.remove(); if(onInputCallback) onInputCallback(); };

        UI.els.attrContainer.appendChild(div);
    },

    renderVariants: (variants) => {
        if (!UI.els.variantWrapper) return;

        if (!variants.length) {
            UI.els.variantWrapper.innerHTML = "";
            return;
        }
        
        const html = `
            <div class="card shadow-sm mb-4">
                <div class="card-body">
                    <h5 class="card-title text-primary mb-3">Danh sách phân loại</h5>
                    <div id="variant-list">
                        ${variants.map((v, i) => {
                            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl || "");
                            return `
                            <div class="variant-item border rounded p-3 mb-3 bg-light">
                                <div class="row align-items-center">
                                    <div class="col-auto">
                                        <div class="v-img-box border rounded" style="width:60px; height:60px; cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center;" onclick="document.getElementById('v_file_${i}').click()">
                                            ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover">` : `<i class="bi bi-camera" style="font-size:20px"></i>`}
                                            <input type="file" id="v_file_${i}" hidden onchange="window.handleSelectVariantImage(${i}, this)" accept="image/*">
                                        </div>
                                    </div>
                                    <div class="col">
                                        <strong>${v.name}</strong>
                                    </div>
                                    <div class="col-auto">
                                        <div class="d-flex gap-2">
                                            <input type="number" class="form-control form-control-sm" style="width:100px" placeholder="Giá" value="${v.price}" onchange="window.updateVar(${i},'price',this.value)">
                                            <input type="number" class="form-control form-control-sm" style="width:100px" placeholder="Kho" value="${v.stock}" onchange="window.updateVar(${i},'stock',this.value)">
                                            <button onclick="window.removeVariant(${i})" class="btn btn-sm btn-danger">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        UI.els.variantWrapper.innerHTML = html;
    },

    resetForm: (isEdit) => {
        const form = document.getElementById("productForm");
        if(form) form.reset();
        if(UI.els.attrContainer) UI.els.attrContainer.innerHTML = "";
        if(UI.els.variantWrapper) UI.els.variantWrapper.innerHTML = "";
        if(UI.els.formTitle) UI.els.formTitle.innerText = isEdit ? "Cập nhật sản phẩm" : "Thêm Sản Phẩm Mới";
        UI.renderMainImage(null);
    }
};