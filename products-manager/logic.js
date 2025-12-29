// logic.js
export const VariantLogic = {
    // Parse attributes từ DOM
    parseAttributesFromDOM: () => {
        const rows = document.querySelectorAll(".attr-row");
        const attributes = [];
        
        rows.forEach(row => {
            const selectEl = row.querySelector(".inp-attr-select");
            const inputEl = row.querySelector(".inp-attr-vals");
            
            // Lấy attribute name từ select
            let attrId = null;
            let attrName = "";
            
            if (selectEl && selectEl.value !== "") {
                attrId = selectEl.value;
                attrName = selectEl.options[selectEl.selectedIndex].text;
            }
            
            // Lấy values từ input
            const valsStr = inputEl ? inputEl.value.trim() : "";
            
            if (attrId && attrName && valsStr) {
                const values = valsStr.split(",").map(v => v.trim()).filter(v => v !== "");
                
                if (values.length > 0) {
                    // Lấy valueIdMap từ dataset (nếu có sẵn)
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

    // Generate tất cả variants từ attributes
    generateVariants: (attributes, basePrice, existingVariants = [], basePriceOriginal = 0) => {
        if (!attributes.length) return [];

        // Tạo cartesian product
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

        return combinations.map((combo, idx) => {
            const comboName = combo.join(" - ");
            const existing = existingVariants.find(v => v.name === comboName);
            
            return {
                id: existing?.id || `new_${Date.now()}_${idx}`,
                name: comboName,
                comboValues: combo,
                attributeIds: attributes.map(a => a.id),
                price: existing?.price || basePrice || 0,
                priceOriginal: existing?.priceOriginal || basePriceOriginal || basePrice || 0,
                stock: existing?.stock || 10,
                imageName: existing?.imageName || null,
                previewUrl: existing?.previewUrl || null,
                rawFile: existing?.rawFile || null
            };
        });
    }
};