export const ProductLogic = {
    // Tạo tổ hợp biến thể
    generateVariants: (selectedAttributes) => {
        if (!selectedAttributes || selectedAttributes.length === 0) return [];
        const validAttributes = selectedAttributes.filter(attr => attr.values && attr.values.length > 0);
        if (validAttributes.length === 0) return [];

        const combinations = validAttributes.reduce((acc, attribute) => {
            if (acc.length === 0) {
                return attribute.values.map(value => [{
                    attributeId: attribute.attributeId, attributeName: attribute.attributeName,
                    valueId: value.id, valueName: value.name
                }]);
            }
            const newCombinations = [];
            acc.forEach(combo => {
                attribute.values.forEach(value => {
                    newCombinations.push([...combo, {
                        attributeId: attribute.attributeId, attributeName: attribute.attributeName,
                        valueId: value.id, valueName: value.name
                    }]);
                });
            });
            return newCombinations;
        }, []);

        return combinations.map((combo, index) => ({
            id: `variant_gen_${Date.now()}_${index}`,
            variantId: null,
            combination: combo,
            displayName: combo.map(c => c.valueName).join(' - '),
            imageName: null, imageUrl: null, imageFile: null,
            priceOriginal: 0, price: 0, stock: 0, sold: 0, active: true
        }));
    },

    // Validate
    validateProduct: (productData) => {
        const errors = [];
        if (!productData.productName || productData.productName.trim() === '') errors.push('Tên sản phẩm không được để trống');
        if (!productData.price || productData.price <= 0) errors.push('Giá bán phải lớn hơn 0');
        if (!productData.priceOriginal || productData.priceOriginal <= 0) errors.push('Giá gốc phải lớn hơn 0');
        if (Number(productData.price) > Number(productData.priceOriginal)) errors.push('Giá bán không được lớn hơn giá gốc');
        
        if (productData.variants && productData.variants.length > 0) {
            productData.variants.forEach((variant, index) => {
                if (!variant.price || variant.price < 0) errors.push(`Biến thể ${index + 1}: Giá bán không hợp lệ`);
            });
        }
        return { isValid: errors.length === 0, errors: errors };
    },

    // [FIXED] Format Data: Đảm bảo không có null key trong attributeValues
    formatProductData: (formData, selectedAttributes, variants) => {
        const productDetailDTO = {
            productId: null,
            productName: formData.productName,
            description: formData.description || "",
            imageName: null, imageUrl: null,
            originalPrice: parseFloat(formData.priceOriginal), 
            price: parseFloat(formData.price),
            categoryId: formData.categoryId,
            brandId: formData.brandId,
            totalSales: 0, ratingAvg: 0.0, ratingCount: 0,
            createdAt: null, updatedAt: null
        };

        // Attributes - Chỉ gửi những attribute có giá trị hợp lệ
        const attributes = selectedAttributes.map(attr => {
            if (!attr.values || attr.values.length === 0) return null;
            return {
                attributeId: attr.attributeId || null,
                attributeName: attr.attributeName,
                attributeValues: attr.values.map(v => ({
                    attributeValueId: (v.id && String(v.id).indexOf('_') === -1) ? v.id : null, 
                    attributeValueName: v.name
                }))
            };
        }).filter(a => a !== null);

        // Variants - KEY FIX: Đảm bảo attributeValues luôn có đủ attributeId
        const formattedVariants = variants.map((variant, index) => {
            // Tạo Map để nhóm values theo attributeId
            const valuesByAttribute = {};
            
            if (variant.combination && variant.combination.length > 0) {
                variant.combination.forEach(combo => {
                    const attrId = combo.attributeId;
                    if (!attrId) return; // Bỏ qua nếu không có attributeId
                    
                    if (!valuesByAttribute[attrId]) {
                        valuesByAttribute[attrId] = {
                            attributeId: attrId,
                            values: []
                        };
                    }
                    
                    // Chỉ thêm value nếu có ID hợp lệ hoặc có name
                    const valueId = (combo.valueId && String(combo.valueId).indexOf('_') === -1) ? combo.valueId : null;
                    if (valueId || combo.valueName) {
                        valuesByAttribute[attrId].values.push({
                            attributeValueId: valueId,
                            attributeValueName: combo.valueName
                        });
                    }
                });
            }

            // Chuyển Map thành Array và đảm bảo format đúng
            const attributeValues = Object.values(valuesByAttribute)
                .filter(group => group.values.length > 0) // Chỉ lấy nhóm có values
                .map(group => ({
                    attributeId: group.attributeId,
                    attributeValues: group.values
                }));

            return {
                variantId: (variant.variantId && String(variant.variantId).indexOf('variant_gen') === -1) ? variant.variantId : null,
                imageName: variant.imageName,
                imageUrl: null,
                originalPrice: parseFloat(variant.priceOriginal) || parseFloat(formData.priceOriginal),
                price: parseFloat(variant.price) || parseFloat(formData.price),
                stock: parseInt(variant.stock) || 0,
                sold: 0, 
                active: true,
                attributeValues: attributeValues
            };
        });

        // Variant Values - Giữ để tương thích ngược
        const variantValues = [];
        variants.forEach((variant) => {
            if (variant.combination && variant.combination.length > 0) {
                variant.combination.forEach(combo => {
                    if (combo.attributeId) { // Chỉ thêm nếu có attributeId hợp lệ
                        variantValues.push({
                            variantId: variant.variantId || null,
                            attributeId: combo.attributeId,
                            attributeValueId: (combo.valueId && String(combo.valueId).indexOf('_') === -1) ? combo.valueId : null,
                            attributeValueName: combo.valueName
                        });
                    }
                });
            }
        });

        return { productDetailDTO, attributes, variants: formattedVariants, variantValues };
    }
};