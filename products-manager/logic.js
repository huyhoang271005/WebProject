// logic.js
export const VariantLogic = {
    // 1. Đọc dữ liệu từ giao diện (Input các thuộc tính)
    parseAttributesFromDOM: () => {
        const rows = document.querySelectorAll(".attr-row");
        const attributes = [];
        
        rows.forEach(row => {
            const selectEl = row.querySelector(".inp-attr-select"); 
            const inputEl = row.querySelector(".inp-attr-vals");
            
            let name = "";
            let attrId = row.dataset.attrId || null; // ID của thuộc tính (nếu là sửa)

            // Lấy tên thuộc tính từ Select box
            if (selectEl && selectEl.selectedIndex >= 0) {
                // Nếu có value (ID) thì ưu tiên lấy, nếu không lấy text
                if (selectEl.value) attrId = selectEl.value;
                if (selectEl.options[selectEl.selectedIndex].text !== "-- Chon thuoc tinh --") {
                    name = selectEl.options[selectEl.selectedIndex].text;
                }
            }
            
            const valsStr = inputEl ? inputEl.value : "";
            // Lấy Map ID của các giá trị (nếu đang sửa sản phẩm cũ)
            const valueIdMap = row.dataset.valueIdMap ? JSON.parse(row.dataset.valueIdMap) : {};
            
            if (name && valsStr) {
                const values = valsStr.split(",").map(v => v.trim()).filter(v => v !== "");
                if (values.length) {
                    attributes.push({ 
                        name, 
                        values,
                        id: attrId, // ID từ database (nếu có)
                        valueIdMap: valueIdMap
                    });
                }
            }
        });
        return attributes;
    },

    // 2. Tạo tổ hợp biến thể (Cartesian Product)
    generateVariants: (attributes, basePrice, existingVariants = [], basePriceOriginal = 0) => {
        if (!attributes.length) return [];

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

        return combinations.map((combo, idx) => {
            const comboName = combo.join(" - ");
            // Tìm xem biến thể này đã tồn tại chưa để giữ lại ID và thông tin cũ
            const existing = existingVariants.find(v => v.name === comboName);
            
            return {
                id: existing?.id || null, // Giữ ID cũ nếu có
                name: comboName,
                comboValues: combo,
                price: existing?.price || basePrice || 0,
                priceOriginal: existing?.priceOriginal || basePriceOriginal || basePrice || 0,
                stock: existing?.stock || 0,
                imageName: existing?.imageName || "",
                previewUrl: existing?.previewUrl || existing?.imageUrl || "", // Ưu tiên ảnh preview mới, nếu ko có thì lấy ảnh cũ
                rawFile: existing?.rawFile || null
            };
        });
    },

    // 3. (MỚI) Hàm chuyển đổi JSON từ API thành State Frontend
    mapResponseToState: (apiData) => {
        if (!apiData || !apiData.productDetailDTO) return null;

        const { productDetailDTO, attributes, variants, variantValues } = apiData;

        // BƯỚC A: Tạo từ điển (Map) để tra cứu ID -> Tên giá trị
        // Ví dụ: "67c7..." -> "X"
        const valIdToNameMap = {};
        
        // Xử lý attributes để hiển thị lên các dòng nhập liệu
        const parsedAttributes = attributes.map(attr => {
            const valuesNames = [];
            const rowValueMap = {}; // Map local cho dòng này: "X" -> "ID_cua_X"

            attr.attributeValues.forEach(v => {
                valIdToNameMap[v.attributeValueId] = v.attributeValueName; // Lưu vào map tổng
                valuesNames.push(v.attributeValueName);
                rowValueMap[v.attributeValueName] = v.attributeValueId; // Lưu vào map dòng
            });

            return {
                id: attr.attributeId,
                name: attr.attributeName,
                values: valuesNames, // ["X", "L"]
                valueIdMap: rowValueMap 
            };
        });

        // BƯỚC B: Tái tạo danh sách Variants
        const parsedVariants = variants.map(v => {
            // 1. Tìm tất cả attributeValueId liên quan đến variantId này trong bảng variantValues
            const relatedValIds = variantValues
                .filter(vv => vv.variantId === v.variantId)
                .map(vv => vv.attributeValueId);
            
            // 2. Chuyển ID thành tên (VD: [ID1, ID2] -> ["X", "Đỏ"])
            // Cần sort hoặc đảm bảo thứ tự khớp với thứ tự attributes, 
            // nhưng tạm thời map theo map tổng là đủ hiển thị.
            const comboValues = relatedValIds.map(id => valIdToNameMap[id] || "Unknown");
            const name = comboValues.join(" - ");

            return {
                id: v.variantId,
                name: name,
                comboValues: comboValues,
                price: v.price,
                priceOriginal: v.priceOriginal || v.OriginalPrice || 0, // Handle case key API thay đổi
                stock: v.stock,
                imageUrl: v.imageUrl,
                previewUrl: v.imageUrl, // Hiển thị ảnh từ server
                rawFile: null
            };
        });

        return {
            product: productDetailDTO,
            attributes: parsedAttributes,
            variants: parsedVariants
        };
    }
};