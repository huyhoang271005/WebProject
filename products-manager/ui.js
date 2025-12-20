// ui.js
export const UI = {
    // Cache sẵn các Element để không phải getElementById nhiều lần
    els: {
        list: document.getElementById("view-list"),
        form: document.getElementById("view-form"),
        tableBody: document.querySelector("#productTable tbody"),
        cateSelect: document.getElementById("prodCate"),
        brandSelect: document.getElementById("prodBrand"),
        attrContainer: document.getElementById("attributes-container"),
        variantWrapper: document.getElementById("variants-wrapper"),
        variantList: document.getElementById("variant-list"),
        formTitle: document.getElementById("formTitle"),
        mainImgPreview: document.getElementById("mainImgPreview"),
        mainImgPlaceholder: document.getElementById("mainImgPlaceholder"),
        mainImgInput: document.getElementById("mainImgInput")
    },

    // Hàm chuyển đổi quan trọng nhất
    switchView: (viewName) => {
        if (viewName === 'list') {
            if(UI.els.list) UI.els.list.classList.remove('hidden');
            if(UI.els.form) UI.els.form.classList.add('hidden');
        } else {
            if(UI.els.list) UI.els.list.classList.add('hidden');
            if(UI.els.form) UI.els.form.classList.remove('hidden');
        }
    },

    renderTable: (products) => {
        if (!UI.els.tableBody) return;

        if (!products || !products.length) {
            UI.els.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 20px;">
                        Không có dữ liệu
                    </td>
                </tr>`;
            return;
        }

        const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

        UI.els.tableBody.innerHTML = products.map(p => {
            // Xử lý ảnh (ưu tiên ảnh cloud, sau đó đến ảnh local)
            let imgUrl = "https://via.placeholder.com/50";
            if (p.imageUrl) imgUrl = p.imageUrl;
            else if (p.imageName) imgUrl = `http://localhost:8080/images/${p.imageName}`;

            return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px">
                        <img src="${imgUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:4px">
                        <strong>${p.productName}</strong>
                    </div>
                </td>
                <td>
                    ${p.categoryName || '-'} <br>
                    <small>${p.brandName || '-'}</small>
                </td>
                <td style="color:red; font-weight:bold">${fmt.format(p.price)}</td>
                <td><span class="badge">${p.variants ? p.variants.length : 0} loại</span></td>
                <td>
                    <button onclick="window.editProduct('${p.productId}')" style="margin-right:5px">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="window.deleteProduct('${p.productId}')" style="color:red">
                        <i class="fa-solid fa-trash"></i>
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

    // Hàm hiển thị ảnh preview
    renderMainImage: (src) => {
        if (!UI.els.mainImgPreview) return;
        
        if (src) {
            UI.els.mainImgPreview.src = src;
            UI.els.mainImgPreview.classList.remove("hidden");
            if(UI.els.mainImgPlaceholder) UI.els.mainImgPlaceholder.classList.add("hidden");
        } else {
            UI.els.mainImgPreview.src = "";
            UI.els.mainImgPreview.classList.add("hidden");
            if(UI.els.mainImgPlaceholder) UI.els.mainImgPlaceholder.classList.remove("hidden");
        }
    },

    // Hàm thêm dòng thuộc tính
    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        if (!UI.els.attrContainer) return;

        const div = document.createElement("div");
        div.className = "attr-row";
        if (attrId) div.dataset.attrId = attrId;
        if (Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);
        
        // Tạo options cho select
        const attrOptions = allAttributes.map(attr => 
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');

        div.innerHTML = `
            <div style="flex: 0 0 200px;">
                <select class="inp-attr-select" style="width:100%; padding:10px;">
                    <option value="">-- Chọn thuộc tính --</option>
                    ${attrOptions}
                </select>
            </div>
            <div style="flex: 1;">
                <input type="text" class="inp-attr-vals" value="${valuesVal}" placeholder="Nhập giá trị (ngăn cách phẩy)..." style="width:100%; padding:10px;">
            </div>
            <button type="button" class="btn-remove"><i class="fa-solid fa-xmark"></i></button>
        `;

        // Gắn sự kiện
        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");
        
        selectEl.onchange = (e) => {
            const selectedAttr = allAttributes.find(a => a.attributeId === e.target.value);
            if(selectedAttr) {
                 div.dataset.attrId = selectedAttr.attributeId;
                 // Nếu thuộc tính có sẵn giá trị định trước (VD: Size S, M, L)
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
        if (!UI.els.variantWrapper || !UI.els.variantList) return;

        if (!variants.length) {
            UI.els.variantWrapper.classList.add("hidden");
            return;
        }
        UI.els.variantWrapper.classList.remove("hidden");
        
        UI.els.variantList.innerHTML = variants.map((v, i) => {
            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl || "");
            return `
            <div class="variant-item">
                <div class="v-img-box" onclick="document.getElementById('v_file_${i}').click()">
                    ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover">` : `<i class="fa-solid fa-camera"></i>`}
                    <input type="file" id="v_file_${i}" hidden onchange="window.handleSelectVariantImage(${i}, this)">
                </div>
                <div class="v-name" style="flex:1; font-weight:bold">${v.name}</div>
                <div class="v-inputs">
                    <input type="number" placeholder="Giá" value="${v.price}" onchange="window.updateVar(${i},'price',this.value)">
                    <input type="number" placeholder="Kho" value="${v.stock}" onchange="window.updateVar(${i},'stock',this.value)">
                    <button onclick="window.removeVariant(${i})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    resetForm: (isEdit) => {
        document.getElementById("productForm").reset();
        if(UI.els.attrContainer) UI.els.attrContainer.innerHTML = "";
        if(UI.els.variantWrapper) UI.els.variantWrapper.classList.add("hidden");
        if(UI.els.formTitle) UI.els.formTitle.innerText = isEdit ? "Cập nhật sản phẩm" : "Thêm sản phẩm";
        UI.renderMainImage(null);
    }
};