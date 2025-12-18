export const IMAGE_BASE_URL = ""; 

export const UI = {
    // === 1. XỬ LÝ DANH SÁCH (LIST PAGE) ===
    renderTable: (products) => {
        const tbody = document.querySelector("#productTable tbody");
        const emptyState = document.getElementById("emptyState");
        if (!tbody) return; // Không phải trang list thì bỏ qua

        tbody.innerHTML = "";

        if (!products || products.length === 0) {
            if (emptyState) emptyState.classList.remove("hidden");
            return;
        }
        if (emptyState) emptyState.classList.add("hidden");

        const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

        tbody.innerHTML = products.map(p => {
            // Ưu tiên imageUrl từ API, nếu không có thì fallback
            const imgUrl = p.imageUrl || (p.imageName ? `${IMAGE_BASE_URL}${p.imageName}` : "https://via.placeholder.com/50?text=No+Img");

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${imgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                            <span class="product-name">${p.productName}</span>
                        </div>
                    </td>
                    <td>
                        <div class="category-info">
                            <span>${p.categoryName || '-'}</span>
                            <small>${p.brandName || '-'}</small>
                        </div>
                    </td>
                    <td><span class="price">${fmt.format(p.price)}</span></td>
                    <td>
                        <span class="badge">${p.variants ? p.variants.length : 0} loại</span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn-icon edit" onclick="window.location.href='add_product.html?id=${p.productId}'" title="Sửa">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-icon delete" onclick="window.handleDelete('${p.productId}')" title="Xóa">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // === 2. XỬ LÝ FORM (ADD/EDIT PAGE) ===
    
    // Render Select Thương hiệu
    renderBrands: (brands, cateId, selectedBrandId = null) => {
        const brandSelect = document.getElementById("prodBrand");
        if (!brandSelect) return;

        brandSelect.innerHTML = `<option value="">-- Chọn thương hiệu --</option>`;
        if (!cateId) return;

        const filtered = brands.filter(b => b.categoryId == cateId);
        (filtered.length ? filtered : brands).forEach(b => {
            const isSelected = selectedBrandId && (b.brandId == selectedBrandId) ? 'selected' : '';
            brandSelect.innerHTML += `<option value="${b.brandId}" ${isSelected}>${b.brandName}</option>`;
        });
    },

    // Render ảnh chính (Preview)
    renderMainImage: (src) => {
        const preview = document.getElementById("mainImgPreview");
        const placeholder = document.getElementById("mainImgPlaceholder");
        if (!preview) return;

        if (src) {
            preview.src = src;
            preview.classList.remove("hidden");
            placeholder.classList.add("hidden");
        } else {
            preview.src = "";
            preview.classList.add("hidden");
            placeholder.classList.remove("hidden");
        }
    },

    // Thêm dòng thuộc tính (Dùng cho cả lúc Thêm mới và lúc Fill dữ liệu Edit)
    addAttrRow: (nameVal = "", valuesVal = "", onInputCallback, attrId = null, valueIds = [], valueIdMap = {}, allAttributes = []) => {
        const container = document.getElementById("attributes-container");
        if (!container) return;

        const div = document.createElement("div");
        div.className = "attr-row";
        
        // Lưu metadata vào dataset để logic JS đọc lại sau này
        if (attrId) div.dataset.attrId = attrId;
        if (valueIdMap && Object.keys(valueIdMap).length) div.dataset.valueIdMap = JSON.stringify(valueIdMap);

        // Tạo options cho select
        const attrOptions = allAttributes.map(attr => 
            `<option value="${attr.attributeId}" ${attrId === attr.attributeId ? 'selected' : ''}>${attr.attributeName}</option>`
        ).join('');
        
        div.innerHTML = `
            <div style="flex: 0 0 200px;">
                <select class="inp-attr-select" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="">-- Chọn thuộc tính --</option>
                    ${attrOptions}
                </select>
            </div>
            <div style="flex: 1;">
                <input type="text" class="inp-attr-vals" placeholder="Nhập giá trị (ngăn cách dấu phẩy)..." value="${valuesVal}" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
            </div>
            <button type="button" class="btn-remove" title="Xóa dòng này">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        
        // Sự kiện
        const selectEl = div.querySelector(".inp-attr-select");
        const inputEl = div.querySelector(".inp-attr-vals");
        const btnRemove = div.querySelector(".btn-remove");

        // Logic readonly nếu chọn thuộc tính có sẵn (như code cũ của bạn)
        if (nameVal && valuesVal) {
            // inputEl.readOnly = true; // Tùy chọn: Có muốn khóa không?
        }

        selectEl.addEventListener("change", (e) => {
            const selectedId = e.target.value;
            const selectedAttr = allAttributes.find(a => a.attributeId === selectedId);
            
            if (selectedAttr) {
                div.dataset.attrId = selectedAttr.attributeId;
                // Nếu thuộc tính có sẵn values (Global attributes), điền vào
                if (selectedAttr.attributeValues && selectedAttr.attributeValues.length) {
                    inputEl.value = selectedAttr.attributeValues.map(v => v.attributeValueName).join(", ");
                    // Map lại ID cho values
                    const newMap = {};
                    selectedAttr.attributeValues.forEach(v => newMap[v.attributeValueName] = v.attributeValueId);
                    div.dataset.valueIdMap = JSON.stringify(newMap);
                }
            }
            if (onInputCallback) onInputCallback();
        });

        inputEl.addEventListener("input", () => { if(onInputCallback) onInputCallback(); });
        btnRemove.onclick = () => { div.remove(); if(onInputCallback) onInputCallback(); };

        container.appendChild(div);
    },

    // Render bảng biến thể
    renderVariants: (variants) => {
        const wrapper = document.getElementById("variants-wrapper");
        const list = document.getElementById("variant-list");
        if (!wrapper || !list) return;

        if (!variants.length) {
            wrapper.classList.add("hidden");
            return;
        }
        wrapper.classList.remove("hidden");
        
        list.innerHTML = variants.map((v, i) => {
            // Logic hiển thị ảnh: Ưu tiên ảnh vừa upload (previewUrl) -> Ảnh từ server (imageUrl) -> Placeholder
            const imgSrc = v.previewUrl ? v.previewUrl : (v.imageUrl ? v.imageUrl : "");
            
            return `
            <div class="variant-item">
                <div class="v-img-box" onclick="document.getElementById('v_file_${i}').click()" title="Chọn ảnh">
                    ${imgSrc 
                        ? `<img src="${imgSrc}" class="img-preview" />` 
                        : `<i class="fa-solid fa-camera" style="color:#ccc; font-size:20px;"></i>`
                    }
                    <input type="file" id="v_file_${i}" accept="image/*" style="display: none;" 
                           onchange="window.handleSelectVariantImage(${i}, this)">
                </div>

                <div class="v-name">${v.name}</div>
                
                <div class="v-inputs">
                    <div class="grp">
                        <label>Giá gốc</label>
                        <input type="number" value="${v.priceOriginal || 0}" onchange="window.updateVar(${i},'priceOriginal',this.value)">
                    </div>
                    <div class="grp">
                        <label>Giá bán</label>
                        <input type="number" value="${v.price || 0}" onchange="window.updateVar(${i},'price',this.value)">
                    </div>
                    <div class="grp">
                        <label>Kho</label>
                        <input type="number" value="${v.stock || 0}" onchange="window.updateVar(${i},'stock',this.value)">
                    </div>
                    <button type="button" class="btn-icon delete" onclick="window.removeVariant(${i})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    },

    // === 3. FILL FORM TỪ RESPONSE JSON (QUAN TRỌNG) ===
    fillForm: (data, allAttributes, onVariantChangeCallback) => {
        const product = data.productDetailDTO;
        const attributes = data.attributes || [];
        const variants = data.variants || [];
        const variantValues = data.variantValues || [];

        // 1. Fill thông tin cơ bản
        document.getElementById("prodName").value = product.productName || "";
        document.getElementById("prodDesc").value = product.description || "";
        document.getElementById("prodPrice").value = product.price || 0;
        document.getElementById("prodOriginalPrice").value = product.originalPrice || 0;
        if(product.categoryId) document.getElementById("prodCate").value = product.categoryId;

        if (product.imageUrl) {
            UI.renderMainImage(product.imageUrl);
        }

        // 2. Fill Attributes
        document.getElementById("attributes-container").innerHTML = ""; // Clear cũ
        
        // Map ID -> Tên (để dùng cho bước variants)
        const valueIdToNameMap = {}; 

        attributes.forEach(attr => {
            const valuesStr = attr.attributeValues.map(v => {
                valueIdToNameMap[v.attributeValueId] = v.attributeValueName;
                return v.attributeValueName;
            }).join(", ");

            const valueIdMap = {};
            const valueIds = [];
            attr.attributeValues.forEach(v => {
                valueIdMap[v.attributeValueName] = v.attributeValueId;
                valueIds.push(v.attributeValueId);
            });

            UI.addAttrRow(
                attr.attributeName,
                valuesStr,
                null, // Không trigger tính lại ngay lúc add row
                attr.attributeId,
                valueIds,
                valueIdMap,
                allAttributes
            );
        });

        // 3. Map Variants từ ID sang Object cho State
        const mappedVariants = variants.map(v => {
            // Tìm các value liên quan đến variant này
            const relatedValues = variantValues.filter(vv => vv.variantId === v.variantId);
            
            // Lấy tên từ Map
            const names = relatedValues.map(vv => valueIdToNameMap[vv.attributeValueId]).filter(n => n);
            const comboName = names.join(" - ");

            return {
                id: v.variantId,
                name: comboName || "Mặc định",
                price: v.price,
                priceOriginal: v.originalPrice,
                stock: v.stock,
                imageUrl: v.imageUrl,
                imageFile: null,
                comboValues: names // Lưu lại để dùng cho logic update sau này
            };
        });

        // Render variants
        UI.renderVariants(mappedVariants);
        
        return mappedVariants; 
    }
};