// ui.js
export const UI = {
    els: {
        cateSelect: document.getElementById("categoryId"),
        brandSelect: document.getElementById("brandId"),
        attrContainer: document.getElementById("attributesContainer"),
        variantWrapper: document.getElementById("variantsContainer"),
        mainImgPreview: document.getElementById("mainImagePreview")
    },

    switchView: (viewName) => {
        const listEl = document.getElementById("listView");
        const formEl = document.getElementById("createView");
        if (viewName === 'list') {
            listEl?.classList.remove('d-none');
            formEl?.classList.add('d-none');
        } else {
            listEl?.classList.add('d-none');
            formEl?.classList.remove('d-none');
        }
    },

    renderCategories: (categories) => {
        const el = document.getElementById("categoryId");
        if (!el) return;
        el.innerHTML = `<option value="">-- Chọn danh mục --</option>` + 
            categories.map(c => `<option value="${c.categoryId}">${c.categoryName}</option>`).join('');
    },

    renderBrands: (allBrands, selectedCateId = "") => {
        const el = document.getElementById("brandId");
        if (!el) return;
        
        // Lọc brand theo categoryId (nếu brand có trường categoryId)
        let filtered = allBrands;
        if (selectedCateId) {
            filtered = allBrands.filter(b => !b.categoryId || String(b.categoryId) === String(selectedCateId));
        }

        el.innerHTML = `<option value="">-- Chọn thương hiệu --</option>` + 
            filtered.map(b => `<option value="${b.brandId}">${b.brandName}</option>`).join('');
    },

    renderMainImage: (src) => {
        const el = document.getElementById("mainImagePreview");
        if (el) el.innerHTML = src ? `<img src="${src}" class="img-fluid rounded shadow-sm" style="max-height: 200px;">` : ``;
    },

    addAttrRow: (allAttributes = []) => {
        const container = document.getElementById("attributesContainer");
        const div = document.createElement("div");
        div.className = "mb-3 attr-row border-bottom pb-3";
        
        const options = allAttributes.map(a => `<option value="${a.attributeId}">${a.attributeName}</option>`).join('');

        div.innerHTML = `
            <div class="row g-2 align-items-center">
                <div class="col-md-3">
                    <select class="inp-attr-select form-select">
                        <option value="">-- Chọn thuộc tính --</option>
                        ${options}
                    </select>
                </div>
                <div class="col-md-8">
                    <input type="text" class="inp-attr-vals form-control" 
                           placeholder="Nhập giá trị ngăn cách dấu phẩy (VD: Đỏ, Xanh)">
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn-remove btn btn-outline-danger w-100"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;

        // Sự kiện khi chọn attribute: tự động điền value gợi ý
        const selectEl = div.querySelector(".inp-attr-select");
        selectEl.onchange = (e) => {
            const attr = allAttributes.find(a => a.attributeId === e.target.value);
            if (attr) {
                // Lưu map ID của values vào dataset để Logic đọc
                const valueIdMap = {};
                attr.attributeValues?.forEach(v => valueIdMap[v.attributeValueName] = v.attributeValueId);
                div.dataset.valueIdMap = JSON.stringify(valueIdMap);
                
                // Gợi ý values vào input (nếu muốn)
                // const inputEl = div.querySelector(".inp-attr-vals");
                // if (!inputEl.value) inputEl.value = attr.attributeValues.map(v => v.attributeValueName).join(", ");
            }
        };

        div.querySelector(".btn-remove").onclick = () => div.remove();
        container.appendChild(div);
    },

    renderVariants: (variants) => {
        const wrapper = document.getElementById("variantsContainer");
        if (!wrapper) return;

        if (!variants.length) {
            wrapper.innerHTML = "";
            return;
        }

        const header = `
            <div class="d-flex gap-2 mb-3 bg-light p-2 rounded">
                <input type="number" id="bulk_org" class="form-control form-control-sm" placeholder="Giá gốc chung">
                <input type="number" id="bulk_price" class="form-control form-control-sm" placeholder="Giá bán chung">
                <input type="number" id="bulk_stock" class="form-control form-control-sm" placeholder="Kho chung">
                <button type="button" class="btn btn-sm btn-primary text-nowrap" onclick="window.applyBulk()">Áp dụng</button>
            </div>`;

        const rows = variants.map((v, i) => `
            <tr>
                <td class="text-center">
                    <div style="width:40px; height:40px; cursor:pointer; border:1px dashed #ccc; overflow:hidden"
                         onclick="document.getElementById('file_v_${i}').click()">
                        ${v.previewUrl ? `<img src="${v.previewUrl}" class="w-100 h-100 object-fit-cover">` : `<span class="small text-muted">+</span>`}
                    </div>
                    <input type="file" id="file_v_${i}" hidden onchange="window.setVarImg(${i}, this)">
                </td>
                <td><strong>${v.name}</strong></td>
                <td><input type="number" class="form-control form-control-sm" value="${v.priceOriginal}" onchange="window.updateVar(${i}, 'priceOriginal', this.value)"></td>
                <td><input type="number" class="form-control form-control-sm" value="${v.price}" onchange="window.updateVar(${i}, 'price', this.value)"></td>
                <td><input type="number" class="form-control form-control-sm" value="${v.stock}" onchange="window.updateVar(${i}, 'stock', this.value)"></td>
                <td><button type="button" class="btn btn-sm text-danger" onclick="window.removeVar(${i})"><i class="bi bi-trash"></i></button></td>
            </tr>
        `).join('');

        wrapper.innerHTML = `
            <div class="card shadow-sm"><div class="card-body">
                <h5>Danh sách phân loại (${variants.length})</h5>
                ${header}
                <div class="table-responsive">
                    <table class="table table-bordered align-middle">
                        <thead class="table-light"><tr><th>Ảnh</th><th>Tên</th><th>Giá gốc</th><th>Giá bán</th><th>Kho</th><th>#</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div></div>`;
    },

    resetForm: () => {
        document.getElementById("productForm")?.reset();
        document.getElementById("attributesContainer").innerHTML = "";
        document.getElementById("variantsContainer").innerHTML = "";
        document.getElementById("mainImagePreview").innerHTML = "";
        document.querySelector("#createView h2").innerText = "Thêm Sản Phẩm Mới";
    }
};