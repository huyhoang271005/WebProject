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
        div.className = "mb-3";
        if (attrId) div.dataset.attrId = attrId;
        if (Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);
        
        const attrOptions = allAttributes.map(attr => 
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');

        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-md-3">
                    <select class="inp-attr-select form-select">
                        <option value="">-- Chọn thuộc tính --</option>
                        ${attrOptions}
                    </select>
                </div>
                <div class="col-md-8">
                    <input type="text" class="inp-attr-vals form-control" value="${valuesVal}" placeholder="Nhập giá trị (ngăn cách phẩy). VD: Đỏ, Xanh, Vàng">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn-remove btn btn-outline-danger w-100">
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

    // Thay thế hàm renderVariants trong file ui.js
renderVariants: (variants) => {
    if (!UI.els.variantWrapper) return;

    if (!variants.length) {
        UI.els.variantWrapper.innerHTML = "";
        return;
    }

    // Phần HTML cho thanh "Áp dụng cho tất cả"
    const bulkActionHTML = `
        <div class="card bg-light mb-3 border-primary border-opacity-25">
            <div class="card-body py-2">
                <div class="row g-2 align-items-end">
                    <div class="col-auto"><strong class="text-primary small">Thiết lập hàng loạt:</strong></div>
                    <div class="col"><input type="number" id="bulk_price_org" class="form-control form-control-sm" placeholder="Giá gốc chung"></div>
                    <div class="col"><input type="number" id="bulk_price" class="form-control form-control-sm" placeholder="Giá bán chung"></div>
                    <div class="col"><input type="number" id="bulk_stock" class="form-control form-control-sm" placeholder="Kho chung"></div>
                    <div class="col-auto">
                        <button type="button" class="btn btn-sm btn-primary" onclick="window.applyBulkInfo()">Áp dụng</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Phần HTML cho Bảng biến thể
    const tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover align-middle">
                <thead class="table-light text-center small text-muted">
                    <tr>
                        <th style="width: 80px;">Ảnh</th>
                        <th class="text-start">Tên biến thể</th>
                        <th style="width: 150px;">Giá gốc</th>
                        <th style="width: 150px;">Giá bán</th>
                        <th style="width: 100px;">Kho</th>
                        <th style="width: 50px;">Xóa</th>
                    </tr>
                </thead>
                <tbody>
                    ${variants.map((v, i) => {
                        const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl || "");
                        return `
                        <tr>
                            <td class="text-center">
                                <div style="width: 48px; height: 48px; margin: 0 auto; cursor: pointer; border: 1px dashed #ccc; border-radius: 4px; overflow: hidden; position: relative;"
                                     onclick="document.getElementById('v_file_${i}').click()"
                                     class="bg-white hover-shadow">
                                    
                                    ${imgSrc 
                                        ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">` 
                                        : `<div class="d-flex align-items-center justify-content-center h-100 text-muted"><i class="bi bi-camera"></i></div>`
                                    }
                                </div>
                                <input type="file" id="v_file_${i}" hidden onchange="window.handleSelectVariantImage(${i}, this)" accept="image/*">
                            </td>

                            <td>
                                <strong>${v.name}</strong>
                                <div class="small text-muted">${v.comboValues.join(" / ")}</div>
                            </td>

                            <td>
                                <input type="number" class="form-control form-control-sm" 
                                    value="${v.priceOriginal}" 
                                    onchange="window.updateVar(${i},'priceOriginal',this.value)" placeholder="0">
                            </td>

                            <td>
                                <input type="number" class="form-control form-control-sm fw-bold text-danger" 
                                    value="${v.price}" 
                                    onchange="window.updateVar(${i},'price',this.value)" placeholder="0">
                            </td>

                            <td>
                                <input type="number" class="form-control form-control-sm text-center" 
                                    value="${v.stock}" 
                                    onchange="window.updateVar(${i},'stock',this.value)" placeholder="0">
                            </td>

                            <td class="text-center">
                                <button type="button" onclick="window.removeVariant(${i})" class="btn btn-sm btn-outline-danger border-0">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    UI.els.variantWrapper.innerHTML = `
        <h6 class="fw-bold mb-3">Danh sách biến thể (${variants.length})</h6>
        ${bulkActionHTML}
        ${tableHTML}
    `;
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