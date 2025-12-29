// logic.js
export const VariantLogic = {
    // 1. Quét dữ liệu từ các dòng thuộc tính trên giao diện
    parseAttributesFromDOM: () => {
        // Tìm tất cả các dòng có class .attr-row (được tạo ở ui.js)
        const rows = document.querySelectorAll(".attr-row");
        const attributes = [];
        
        rows.forEach(row => {
            const selectEl = row.querySelector(".inp-attr-select"); 
            const inputEl = row.querySelector(".inp-attr-vals");
            
            // Lấy tên thuộc tính (từ select box hoặc input nếu bạn cho nhập tay)
            let name = "";
            if (selectEl && selectEl.selectedIndex >= 0) {
                // Nếu option đầu tiên là "-- Chọn --" thì bỏ qua hoặc xử lý riêng
                if (selectEl.value !== "") {
                    name = selectEl.options[selectEl.selectedIndex].text;
                }
            }
            // Nếu UI cho phép nhập tên thuộc tính bằng input text thì lấy ở đây (hiện tại code UI dùng Select)
            
            const valsStr = inputEl ? inputEl.value : "";
            
            // Lấy ID ẩn (nếu là thuộc tính cũ)
            const attrId = row.dataset.attrId;
            const valueIdMap = row.dataset.valueIdMap ? JSON.parse(row.dataset.valueIdMap) : {};
            
            // Chỉ lấy dòng nào có tên và có giá trị
            if (name && valsStr) {
                // Tách dấu phẩy: "Đỏ, Xanh" -> ["Đỏ", "Xanh"]
                const values = valsStr.split(",").map(v => v.trim()).filter(v => v !== "");
                if (values.length) {
                    attributes.push({ 
                        name, 
                        values,
                        id: attrId || null,
                        valueIdMap: valueIdMap
                    });
                }
            }
        });
        return attributes;
    },

    // 2. Thuật toán tạo tổ hợp biến thể (Cartesian Product)
    generateVariants: (attributes, basePrice, existingVariants = [], basePriceOriginal = 0) => {
        if (!attributes.length) return [];

        // Hàm đệ quy tạo tổ hợp
        const cartesian = (attrs) => {
            if (attrs.length === 0) return [];
            if (attrs.length === 1) return attrs[0].values.map(v => [v]);
            const [first, ...rest] = attrs;
            const restCombos = cartesian(rest);
            const result = [];
            first.values.forEach(v => {
                if (!restCombos.length) result.push([v]);
                else restCombos.forEach(c => result.push([v, ...c]));
            });
            return result;
        };

        const combinations = cartesian(attributes);

        // Map tổ hợp thành object variant
        return combinations.map((combo, idx) => {
            const comboName = combo.join(" - ");
            
            // Cố gắng giữ lại thông tin cũ nếu tên trùng (để không mất giá/kho đã nhập)
            const existing = existingVariants.find(v => v.name === comboName);
            
            return {
                // Nếu tìm thấy cũ -> giữ ID cũ, nếu không -> tạo ID tạm (new_...)
                id: existing?.id || `new_${Date.now()}_${idx}`,
                
                name: comboName,
                comboValues: combo, // Mảng giá trị [Đỏ, L]
                
                // Giá: Ưu tiên giá đã nhập -> giá base
                price: existing?.price || basePrice || 0,
                priceOriginal: existing?.priceOriginal || basePriceOriginal || basePrice || 0,
                stock: existing?.stock || 10, // Mặc định kho = 10
                
                // Ảnh
                imageName: existing?.imageName || "",
                previewUrl: existing?.previewUrl || "",
                rawFile: existing?.rawFile || null
            };
        });
    }
};