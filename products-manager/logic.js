// logic.js
export const VariantLogic = {
    /**
     * Quét DOM để lấy danh sách thuộc tính người dùng đã nhập
     * Trả về: Array [{ id, name, values: [], valueIdMap: {} }]
     */
    parseAttributesFromDOM: () => {
        const rows = document.querySelectorAll(".attr-row");
        const attributes = [];
        
        rows.forEach(row => {
            const selectEl = row.querySelector(".inp-attr-select");
            const inputEl = row.querySelector(".inp-attr-vals");
            
            // Lấy ID và Tên thuộc tính
            let attrId = null;
            let attrName = "";
            
            if (selectEl && selectEl.value) {
                attrId = selectEl.value;
                attrName = selectEl.options[selectEl.selectedIndex].text;
            }
            
            // Lấy các giá trị (VD: Đỏ, Xanh)
            const valsStr = inputEl ? inputEl.value.trim() : "";
            
            if (attrId && attrName && valsStr) {
                const values = valsStr.split(",").map(v => v.trim()).filter(v => v !== "");
                
                if (values.length > 0) {
                    // Lấy map ID của value nếu có sẵn (từ dataset)
                    const valueIdMap = row.dataset.valueIdMap ? JSON.parse(row.dataset.valueIdMap) : {};
                    
                    attributes.push({ 
                        id: attrId,
                        name: attrName,
                        values: values,
                        valueIdMap: valueIdMap
                    });
                }
            }
        });
        
        return attributes;
    },

    /**
     * Tạo tổ hợp biến thể (Cartesian Product)
     * attributes: Input từ hàm parse
     * basePrice: Giá bán chung
     * baseOriginalPrice: Giá gốc chung
     */
    generateVariants: (attributes, basePrice, baseOriginalPrice, existingVariants = []) => {
        if (!attributes.length) return [];

        // Hàm đệ quy tạo tổ hợp
        const cartesian = (attrs) => {
            if (attrs.length === 0) return [];
            if (attrs.length === 1) return attrs[0].values.map(v => [v]);
            
            const [first, ...rest] = attrs;
            const restCombos = cartesian(rest);
            const result = [];
            
            first.values.forEach(v => {
                if (!restCombos.length) {
                    result.push([v]);
                } else {
                    restCombos.forEach(c => result.push([v, ...c]));
                }
            });
            return result;
        };

        const combinations = cartesian(attributes);

        // Map tổ hợp thành object variant
        return combinations.map((combo, idx) => {
            const comboName = combo.join(" - ");
            // Giữ lại thông tin nếu variant này đã tồn tại (người dùng đã sửa giá/kho)
            const existing = existingVariants.find(v => v.name === comboName);
            
            return {
                tempId: existing?.tempId || `new_${Date.now()}_${idx}`, // ID tạm để UI dùng
                name: comboName,
                comboValues: combo, // Mảng giá trị ["Đỏ", "L"]
                
                // Các trường dữ liệu gửi lên server
                price: existing?.price || basePrice || 0,
                priceOriginal: existing?.priceOriginal || baseOriginalPrice || 0,
                stock: existing?.stock || 0,
                
                // Xử lý ảnh
                imageName: existing?.imageName || null,
                previewUrl: existing?.previewUrl || null,
                rawFile: existing?.rawFile || null
            };
        });
    }
};