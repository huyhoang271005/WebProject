export const MOCK_DATA = {
    // 1. DANH MỤC
    categories: [
        { id: "cat-noodle", name: "Mì ăn liền & Phở" },
        { id: "cat-snack", name: "Bánh kẹo & Ăn vặt" },
        { id: "cat-drink", name: "Nước giải khát" },
        { id: "cat-spice", name: "Gia vị & Nấu ăn" }
    ],

    // 2. THƯƠNG HIỆU (Có cateId để lọc)
    brands: [
        // Mì
        { id: "b-haohao", name: "Hảo Hảo", cateId: "cat-noodle" },
        { id: "b-omachi", name: "Omachi", cateId: "cat-noodle" },
        { id: "b-kokomi", name: "Kokomi", cateId: "cat-noodle" },
        // Snack
        { id: "b-lays", name: "Lay's", cateId: "cat-snack" },
        { id: "b-oishi", name: "Oishi", cateId: "cat-snack" },
        // Nước
        { id: "b-pepsi", name: "Pepsi", cateId: "cat-drink" },
        { id: "b-coca", name: "Coca-Cola", cateId: "cat-drink" },
        // Gia vị
        { id: "b-chinsu", name: "Chin-su", cateId: "cat-spice" }
    ],

    // 3. SẢN PHẨM MẪU
    products: [
        {
            id: "P01",
            name: "Mì Hảo Hảo Tôm Chua Cay",
            cateId: "cat-noodle", brandId: "b-haohao",
            cateName: "Mì ăn liền & Phở", brandName: "Hảo Hảo",
            price: 4500,
            originalPrice: 5000,
            // Biến thể mẫu
            variants: [
                { id: "v1", name: "Thùng 30 gói", price: 135000, stock: 50 },
                { id: "v2", name: "Lẻ 1 gói", price: 4500, stock: 500 }
            ],
            attributes: [
                { name: "Quy cách", values: ["Thùng 30 gói", "Lẻ 1 gói"] }
            ]
        }
    ]
};