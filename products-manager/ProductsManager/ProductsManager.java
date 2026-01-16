package org.example.Feature.ProductsManager;

import javax.swing.*;

public class ProductsManager {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                // Set giao diện giống hệ điều hành cho đẹp
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception ignored) {}

            // 1. Tạo View
            ProductsManagerView view = new ProductsManagerView();

            // 2. Tạo Controller (Controller sẽ tự gán sự kiện cho View)
            new ProductsManagerController(view);

            // 3. Hiển thị
            view.setVisible(true);
        });
    }
}