export const UI = {
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

    switchView: (viewName) => {
        if (viewName === 'list') {
            UI.els.list.classList.remove('hidden');
            UI.els.form.classList.add('hidden');
        } else {
            UI.els.list.classList.add('hidden');
            UI.els.form.classList.remove('hidden');
        }
    },

    renderTable: (products) => {
        if (!products.length) {
            UI.els.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fa-solid fa-box-open"></i>
                        <p>Không có dữ liệu</p>
                    </td>
                </tr>`;
            return;
        }
        UI.els.tableBody.innerHTML = products.map(p => `
            <tr>
                <td>
                    <div class="product-name">${p.productName}</div>
                </td>
                <td>
                    <div class="category-info">
                        <span class="category-name">${p.categoryName || '-'}</span>
                        <span class="brand-name">${p.brandName || '-'}</span>
                    </div>
                </td>
                <td>
                    <span class="price">${new Intl.NumberFormat('vi-VN').format(p.price)}đ</span>
                </td>
                <td>
                    <span class="badge">${p.variants?.length || 0} loại</span>
                </td>
                <td>
                    <div class="actions">
                        <button class="btn-icon edit" onclick="window.editProduct('${p.productId}')" title="Chỉnh sửa">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete" onclick="window.deleteProduct('${p.productId}')" title="Xóa">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderBrands: (brands, cateId, selectedBrandId = null) => {
        UI.els.brandSelect.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        if (!cateId) return;
        const filtered = brands.filter(b => b.categoryId == cateId);
        (filtered.length ? filtered : brands).forEach(b => {
            UI.els.brandSelect.innerHTML += `<option value="${b.brandId}">${b.brandName}</option>`;
        });
        if (selectedBrandId) UI.els.brandSelect.value = selectedBrandId;
    },

    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        const div = document.createElement("div");
        div.className = "attr-row";
        if (attrId) div.dataset.attrId = attrId;
        if (valueIds.length) div.dataset.valueIds = JSON.stringify(valueIds);
        if (Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);
        
        // Tạo options cho dropdown attributes
        const attrOptions = allAttributes.map(attr => 
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');
        
        div.innerHTML = `
            <div style="flex: 0 0 200px;">
                <select class="inp-attr-select" style="width:100%; padding: 14px 18px; border: 2px solid #E5E7EB; border-radius: 10px; font-size: 14px;">
                    <option value="">-- Chọn thuộc tính --</option>
                    ${attrOptions}
                </select>
            </div>
            <div style="flex: 1;">
                <input type="text" class="inp-attr-vals" placeholder="Chọn thuộc tính trước" value="${valuesVal}" style="width:100%" readonly>
            </div>
            <button type="button" class="btn-remove" title="Xóa dòng này">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        
        // Event khi chọn attribute
        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");
        
        selectEl.addEventListener("change", (e) => {
            const selectedAttrId = e.target.value;
            if (selectedAttrId) {
                const selectedAttr = allAttributes.find(a => a.attributeId === selectedAttrId);
                if (selectedAttr && selectedAttr.attributeValues) {
                    // Hiển thị values dạng checkbox/tags
                    div.dataset.attrId = selectedAttrId;
                    const values = selectedAttr.attributeValues.map(v => v.attributeValueName).join(", ");
                    inputEl.value = values;
                    inputEl.readOnly = true;
                    
                    // Lưu valueIdMap
                    const newValueIdMap = {};
                    selectedAttr.attributeValues.forEach(v => {
                        newValueIdMap[v.attributeValueName] = v.attributeValueId;
                    });
                    div.dataset.valueIdMap = JSON.stringify(newValueIdMap);
                }
            } else {
                inputEl.value = "";
                inputEl.placeholder = "Chọn thuộc tính trước";
            }
            onInputCallback();
        });
        
        inputEl.addEventListener("input", onInputCallback);
        
        div.querySelector(".btn-remove").onclick = () => { 
            div.remove(); 
            onInputCallback(); 
        };
        UI.els.attrContainer.appendChild(div);
    },

    renderVariants: (variants) => {
        if (!variants.length) {
            UI.els.variantWrapper.classList.add("hidden");
            return;
        }
        UI.els.variantWrapper.classList.remove("hidden");
        
        UI.els.variantList.innerHTML = variants.map((v, i) => {
            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageName ? v.imageName : "");
            const hasImg = !!imgSrc;

            return `
            <div class="variant-item">
                <div class="v-img-box" onclick="document.getElementById('v_file_${i}').click()" title="Chọn ảnh">
                    ${hasImg 
                        ? `<img src="${imgSrc}" class="img-preview" alt="Variant image" />` 
                        : `<div class="img-placeholder"><i class="fa-solid fa-camera"></i></div>`
                    }
                    <input type="file" id="v_file_${i}" accept="image/*" style="display: none;" 
                           onchange="window.handleSelectVariantImage(${i}, this)">
                </div>

                <div class="v-name"><strong>${v.name}</strong></div>
                
                <div class="v-inputs">
                    <div class="grp">
                        <label>Giá gốc</label>
                        <input type="number" value="${v.priceOriginal || v.price}" onchange="window.updateVarOriginalPrice(${i}, this.value)">
                    </div>
                    <div class="grp">
                        <label>Giá bán</label>
                        <input type="number" value="${v.price}" onchange="window.updateVar(${i},'price',this.value)">
                    </div>
                    <div class="grp">
                        <label>Kho</label>
                        <input type="number" value="${v.stock}" onchange="window.updateVar(${i},'stock',this.value)">
                    </div>
                    <button type="button" class="btn-icon delete" onclick="window.removeVariant(${i})" title="Xóa">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    },
    
    renderMainImage: (previewUrl) => {
        if (previewUrl) {
            UI.els.mainImgPreview.src = previewUrl;
            UI.els.mainImgPreview.classList.remove("hidden");
            UI.els.mainImgPlaceholder.classList.add("hidden");
        } else {
            UI.els.mainImgPreview.src = "";
            UI.els.mainImgPreview.classList.add("hidden");
            UI.els.mainImgPlaceholder.classList.remove("hidden");
        }
    },

    fillForm: (p) => {
        document.getElementById("prodName").value = p.productName;
        document.getElementById("prodDesc").value = p.description || "";
        document.getElementById("prodPrice").value = p.price;
        document.getElementById("prodOriginalPrice").value = p.priceOriginal || "";
        UI.els.cateSelect.value = p.categoryId;
        
        if (p.imageName) UI.renderMainImage(p.imageName); 
    },
    
    resetForm: (isEdit) => {
        document.getElementById("productForm").reset();
        UI.els.attrContainer.innerHTML = "";
        UI.els.variantWrapper.classList.add("hidden");
        UI.els.brandSelect.innerHTML = `<option value="">-- Chọn danh mục trước --</option>`;
        UI.els.formTitle.innerText = isEdit ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới";
        
        UI.renderMainImage(null);
        UI.els.mainImgInput.value = "";
    }
};