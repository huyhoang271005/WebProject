// variantLogic.js
import { Utils } from "./utils.js";

export const VariantLogic = {
    parseAttributesFromDOM: () => {
        const rows = document.querySelectorAll(".attr-row");
        const attributes = [];

        rows.forEach(row => {
            const selectEl = row.querySelector(".inp-attr-select");
            const inputEl = row.querySelector(".inp-attr-vals");

            const name = selectEl && selectEl.options[selectEl.selectedIndex]
                ? selectEl.options[selectEl.selectedIndex].text
                : "";

            const valsStr = inputEl ? inputEl.value : "";
            const attrId = row.dataset.attrId;
            const valueIdMap = row.dataset.valueIdMap ? JSON.parse(row.dataset.valueIdMap) : {};

            if (name && name !== "-- Chọn thuộc tính --" && valsStr) {
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
            const existing = existingVariants.find(v => v.name === comboName);

            const variantId = existing?.id || Utils.generateUUID();

            return {
                id: variantId,
                name: comboName,
                comboValues: combo,
                price: existing?.price || basePrice,
                priceOriginal: existing?.priceOriginal || basePriceOriginal || basePrice,
                stock: existing?.stock || 10,
                imageName: existing?.imageName || variantId,
                previewUrl: existing?.previewUrl || "",
                rawFile: existing?.rawFile || null
            };
        });
    }
};
