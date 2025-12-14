export const ProductLogic = {
    // Generate all variant combinations from attributes
    generateVariants: (selectedAttributes) => {
        if (!selectedAttributes || selectedAttributes.length === 0) {
            return [];
        }

        // Filter out attributes without values
        const validAttributes = selectedAttributes.filter(attr => 
            attr.values && attr.values.length > 0
        );

        if (validAttributes.length === 0) {
            return [];
        }

        // Create cartesian product
        const combinations = validAttributes.reduce((acc, attribute) => {
            if (acc.length === 0) {
                return attribute.values.map(value => [{
                    attributeId: attribute.attributeId,
                    attributeName: attribute.attributeName,
                    valueId: value.id, // ID tạm từ UI
                    valueName: value.name
                }]);
            }

            const newCombinations = [];
            acc.forEach(combo => {
                attribute.values.forEach(value => {
                    newCombinations.push([...combo, {
                        attributeId: attribute.attributeId,
                        attributeName: attribute.attributeName,
                        valueId: value.id, // ID tạm từ UI
                        valueName: value.name
                    }]);
                });
            });
            return newCombinations;
        }, []);

        // Convert to variant format
        return combinations.map((combo, index) => ({
            id: `variant_${Date.now()}_${index}`,
            variantId: null,
            combination: combo,
            displayName: combo.map(c => c.valueName).join(' - '),
            imageName: null,
            imageUrl: null,
            imageFile: null,
            priceOriginal: 0,
            price: 0,
            stock: 0,
            sold: 0,
            active: true
        }));
    },

    // Validate product data before submission
    validateProduct: (productData) => {
        const errors = [];

        if (!productData.productName || productData.productName.trim() === '') {
            errors.push('Tên sản phẩm không được để trống');
        }

        if (!productData.price || productData.price <= 0) {
            errors.push('Giá bán phải lớn hơn 0');
        }

        if (!productData.priceOriginal || productData.priceOriginal <= 0) {
            errors.push('Giá gốc phải lớn hơn 0');
        }

        if (productData.price > productData.priceOriginal) {
            errors.push('Giá bán không được lớn hơn giá gốc');
        }

        // Validate variants if present
        if (productData.variants && productData.variants.length > 0) {
            productData.variants.forEach((variant, index) => {
                if (!variant.price || variant.price <= 0) {
                    errors.push(`Biến thể ${index + 1} (${variant.displayName}): Giá bán phải lớn hơn 0`);
                }
                if (!variant.priceOriginal || variant.priceOriginal <= 0) {
                    errors.push(`Biến thể ${index + 1} (${variant.displayName}): Giá gốc phải lớn hơn 0`);
                }
                if (variant.price > variant.priceOriginal) {
                    errors.push(`Biến thể ${index + 1} (${variant.displayName}): Giá bán không được lớn hơn giá gốc`);
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // Format product data to send to server
    formatProductData: (formData, selectedAttributes, variants) => {
        const productDetailDTO = {
            productId: null,
            productName: formData.productName,
            description: formData.description || "",
            imageName: null,
            imageUrl: null,
            priceOriginal: parseFloat(formData.priceOriginal),
            price: parseFloat(formData.price),
            categoryId: formData.categoryId,
            brandId: formData.brandId,
            totalSales: 0,
            ratingAvg: 0.0,
            ratingCount: 0,
            createdAt: null,
            updatedAt: null
        };

        // Format attributes
        const attributes = selectedAttributes.map(attr => {
            if (!attr.values || attr.values.length === 0) {
                return null;
            }

            return {
                attributeId: attr.attributeId || null,
                attributeName: attr.attributeName,
                attributeValues: attr.values.map(v => ({
                    // FIX: Gửi luôn ID tạm (v.id) thay vì null
                    // Để backend có thể khớp nó với ID trong bảng variantValues
                    attributeValueId: v.id, 
                    attributeValueName: v.name || v.valueName || v
                }))
            };
        }).filter(a => a !== null);

        // Format variants
        const formattedVariants = variants.map((variant, index) => {
            return {
                variantId: `variant_${index}`, // ID string để map
                imageName: variant.imageName, // Đã được set bên index.js
                imageUrl: null,
                priceOriginal: parseFloat(variant.priceOriginal) || parseFloat(formData.priceOriginal),
                price: parseFloat(variant.price) || parseFloat(formData.price),
                stock: parseInt(variant.stock) || 0,
                sold: 0,
                active: true
            };
        });

        // Format variantValues
        const variantValues = [];
        
        variants.forEach((variant, variantIndex) => {
            if (variant.combination && variant.combination.length > 0) {
                variant.combination.forEach(combo => {
                    variantValues.push({
                        variantId: `variant_${variantIndex}`,
                        // ID này sẽ khớp với attributeValueId ở mảng attributes phía trên
                        attributeValueId: combo.valueId 
                    });
                });
            }
        });

        console.log('=== FORMAT DATA DEBUG ===');
        console.log('Formatted Attributes:', attributes);
        console.log('Formatted Variants:', formattedVariants);
        console.log('Variant Values:', variantValues);

        return {
            productDetailDTO,
            attributes,
            variants: formattedVariants,
            variantValues
        };
    }
};