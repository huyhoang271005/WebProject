package org.example.Feature.ProductsManager.Edit;

import javax.swing.*;

public class EditProductMain {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception ignored) {}

            EditProductView view = new EditProductView();
            new EditProductController(view);
            view.setVisible(true);
        });
    }
}