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
                    valueId: value.id, // ID tạm để map
                    valueName: value.name
                }]);
            }

            const newCombinations = [];
            acc.forEach(combo => {
                attribute.values.forEach(value => {
                    newCombinations.push([...combo, {
                        attributeId: attribute.attributeId,
                        attributeName: attribute.attributeName,
                        valueId: value.id, // ID tạm để map
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

        // Format attributes - chỉ gửi attributeId nếu đã tồn tại
        const attributes = selectedAttributes.map(attr => ({
            attributeId: attr.attributeId || null,
            attributeName: attr.attributeName,
            attributeValues: attr.values.map(v => ({
                attributeValueId: null, // Luôn null để backend tạo mới
                attributeValueName: v.name
            }))
        }));

        // Format variants
        const formattedVariants = variants.map((variant, index) => {
            let variantImageName = null;
            if (variant.imageFile) {
                const fileName = variant.imageFile.name;
                // Lấy tên file không có extension
                variantImageName = fileName.includes('.')
                    ? fileName.substring(0, fileName.lastIndexOf('.'))
                    : fileName;
            }

            return {
                variantId: `variant_${index}`, // ID tạm để map với variantValues
                imageName: variantImageName,
                imageUrl: null,
                priceOriginal: parseFloat(variant.priceOriginal) || parseFloat(formData.priceOriginal),
                price: parseFloat(variant.price) || parseFloat(formData.price),
                stock: parseInt(variant.stock) || 0,
                sold: 0,
                active: true
            };
        });

        // Format variantValues - QUAN TRỌNG: phải map đúng
        // attributeValueId ở đây là ID tạm từ UI (value.id), backend sẽ xử lý mapping
        const variantValues = [];
        variants.forEach((variant, variantIndex) => {
            if (variant.combination && variant.combination.length > 0) {
                variant.combination.forEach(combo => {
                    // Tìm attribute value tương ứng trong attributes array
                    const attr = attributes.find(a => a.attributeId === combo.attributeId || a.attributeName === combo.attributeName);
                    if (attr) {
                        const attrValue = attr.attributeValues.find(av => av.attributeValueName === combo.valueName);
                        if (attrValue) {
                            variantValues.push({
                                variantId: `variant_${variantIndex}`,
                                attributeValueId: combo.valueId // Sử dụng ID tạm từ combo
                            });
                        }
                    }
                });
            }
        });

        return {
            productDetailDTO,
            attributes,
            variants: formattedVariants,
            variantValues
        };
    }
};