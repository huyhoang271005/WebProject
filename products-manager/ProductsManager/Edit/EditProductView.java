// File: EditProductView.java
package org.example.Feature.ProductsManager.Edit;

import org.example.Feature.CatalogManager.DTO.BrandDTO;
import org.example.Feature.CatalogManager.DTO.CategoryDTO;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionListener;
import java.util.List;
import java.util.UUID;

public class EditProductView extends JFrame {
    // Search Panel
    private JTextField txtProductId;
    private JButton btnSearch;

    // Product Info Panel
    private JTextField txtShowId;
    private JTextField txtProductName;
    private JComboBox<CategoryDTO> cbCategory;
    private JComboBox<BrandDTO> cbBrand;
    private JTextField txtOriginalPrice;
    private JTextField txtPrice;
    private JButton btnUploadImage;
    private JTextArea txtDescription;

    // Variants Panel
    private JTable tblVariants;
    private DefaultTableModel variantTableModel;
    private JButton btnUpdateVariant;

    // Action Buttons
    private JButton btnSave;
    private JButton btnAddVariant; // New Button
    private JButton btnDeleteProduct;

    private JPanel mainPanel;
    private JLabel lblImagePreview;

    public JLabel getImagePreviewLabel() {
        return lblImagePreview;
    }

    public EditProductView() {
        initComponents();
        layoutComponents();

        this.setTitle("Sửa sản phẩm");
        this.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        this.setSize(900, 700);
        this.setLocationRelativeTo(null);
    }

    private void initComponents() {
        // Search components
        txtProductId = new JTextField(20);
        btnSearch = new JButton("Tìm kiếm");

        // Product info components
        txtShowId = new JTextField(20);
        txtShowId.setEditable(false);
        txtShowId.setBackground(Color.LIGHT_GRAY);

        txtProductName = new JTextField(20);
        cbCategory = new JComboBox<>();
        cbBrand = new JComboBox<>();
        txtOriginalPrice = new JTextField(10);
        txtPrice = new JTextField(10);
        btnUploadImage = new JButton("Chọn ảnh chính");
        txtDescription = new JTextArea(4, 20);
        txtDescription.setLineWrap(true);
        txtDescription.setWrapStyleWord(true);

        lblImagePreview = new JLabel("Chưa có ảnh");
        lblImagePreview.setHorizontalAlignment(SwingConstants.CENTER);
        lblImagePreview.setBorder(BorderFactory.createLineBorder(Color.GRAY));
        lblImagePreview.setPreferredSize(new Dimension(150, 150));

        // Variants table
        String[] columns = { "Variant ID", "Tên biến thể", "Giá gốc", "Giá bán", "Tồn kho", "Đường dẫn ảnh" };
        variantTableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return column >= 2; // Chỉ cho sửa từ cột Giá gốc trở đi
            }
        };
        tblVariants = new JTable(variantTableModel);
        tblVariants.getColumnModel().getColumn(0).setPreferredWidth(50);
        tblVariants.getColumnModel().getColumn(0).setMinWidth(0);
        tblVariants.getColumnModel().getColumn(0).setMaxWidth(0);

        // Action buttons
        btnUpdateVariant = new JButton("Lưu thay đổi Variants");
        btnAddVariant = new JButton("Thêm biến thể");
        btnSave = new JButton("Lưu sản phẩm");
        btnDeleteProduct = new JButton("Xóa sản phẩm");
        btnDeleteProduct.setForeground(Color.RED);
        btnBack = new JButton("Quay lại Home"); // Init back button

        mainPanel = new JPanel();
    }

    private void layoutComponents() {
        mainPanel.setLayout(new BorderLayout(10, 10));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // === SEARCH PANEL ===
        JPanel searchPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        searchPanel.setBorder(BorderFactory.createTitledBorder("Tìm kiếm sản phẩm"));
        searchPanel.add(new JLabel("Nhập ID:"));
        searchPanel.add(txtProductId);
        searchPanel.add(btnSearch);

        // === PRODUCT INFO PANEL ===
        JPanel infoPanel = new JPanel(new BorderLayout(10, 10));
        infoPanel.setBorder(BorderFactory.createTitledBorder("Thông tin sản phẩm"));

        JPanel leftInfoPanel = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.anchor = GridBagConstraints.WEST;

        // Row 0: ID (read-only)
        gbc.gridx = 0;
        gbc.gridy = 0;
        leftInfoPanel.add(new JLabel("ID:"), gbc);
        gbc.gridx = 1;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1;
        leftInfoPanel.add(txtShowId, gbc);

        // Row 1: Tên sản phẩm
        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.fill = GridBagConstraints.NONE;
        gbc.weightx = 0;
        leftInfoPanel.add(new JLabel("Tên sản phẩm:"), gbc);
        gbc.gridx = 1;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1;
        leftInfoPanel.add(txtProductName, gbc);

        // Row 2: Danh mục & Thương hiệu
        gbc.gridx = 0;
        gbc.gridy = 2;
        gbc.fill = GridBagConstraints.NONE;
        gbc.weightx = 0;
        leftInfoPanel.add(new JLabel("Danh mục:"), gbc);
        gbc.gridx = 1;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 0.5;
        leftInfoPanel.add(cbCategory, gbc);

        gbc.gridx = 2;
        gbc.fill = GridBagConstraints.NONE;
        gbc.weightx = 0;
        leftInfoPanel.add(new JLabel("Thương hiệu:"), gbc);
        gbc.gridx = 3;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 0.5;
        leftInfoPanel.add(cbBrand, gbc);

        // Row 3: Giá gốc & Giá bán
        gbc.gridx = 0;
        gbc.gridy = 3;
        gbc.fill = GridBagConstraints.NONE;
        gbc.weightx = 0;
        leftInfoPanel.add(new JLabel("Giá gốc:"), gbc);
        gbc.gridx = 1;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 0.5;
        leftInfoPanel.add(txtOriginalPrice, gbc);

        gbc.gridx = 2;
        gbc.fill = GridBagConstraints.NONE;
        gbc.weightx = 0;
        leftInfoPanel.add(new JLabel("Giá bán:"), gbc);
        gbc.gridx = 3;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 0.5;
        leftInfoPanel.add(txtPrice, gbc);

        // Row 4: Upload image button
        gbc.gridx = 0;
        gbc.gridy = 4;
        gbc.gridwidth = 2;
        leftInfoPanel.add(btnUploadImage, gbc);

        // Row 5: Mô tả
        gbc.gridx = 0;
        gbc.gridy = 5;
        gbc.gridwidth = 1;
        gbc.fill = GridBagConstraints.NONE;
        gbc.weightx = 0;
        leftInfoPanel.add(new JLabel("Mô tả:"), gbc);
        gbc.gridx = 1;
        gbc.gridwidth = 3;
        gbc.fill = GridBagConstraints.BOTH;
        gbc.weightx = 1;
        gbc.weighty = 1;
        leftInfoPanel.add(new JScrollPane(txtDescription), gbc);

        // Right panel: Image preview
        JPanel rightInfoPanel = new JPanel(new BorderLayout());
        rightInfoPanel.add(new JLabel("Ảnh chính:", SwingConstants.CENTER), BorderLayout.NORTH);
        rightInfoPanel.add(lblImagePreview, BorderLayout.CENTER);

        infoPanel.add(leftInfoPanel, BorderLayout.CENTER);
        infoPanel.add(rightInfoPanel, BorderLayout.EAST);

        // === VARIANTS PANEL ===
        JPanel variantsPanel = new JPanel(new BorderLayout(5, 5));
        variantsPanel.setBorder(BorderFactory.createTitledBorder("Sửa biến thể"));

        JScrollPane scrollPane = new JScrollPane(tblVariants);
        variantsPanel.add(scrollPane, BorderLayout.CENTER);

        JPanel variantButtonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        variantButtonPanel.add(btnAddVariant); // Add to panel
        variantButtonPanel.add(btnUpdateVariant);
        variantsPanel.add(variantButtonPanel, BorderLayout.SOUTH);

        // === BOTTOM PANEL ===
        JPanel bottomPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottomPanel.add(btnBack); // Add to layout
        bottomPanel.add(btnDeleteProduct);
        bottomPanel.add(btnSave);

        // === ADD TO MAIN ===
        JPanel topPanel = new JPanel(new BorderLayout());
        topPanel.add(searchPanel, BorderLayout.NORTH);
        topPanel.add(infoPanel, BorderLayout.CENTER);

        mainPanel.add(topPanel, BorderLayout.NORTH);
        mainPanel.add(variantsPanel, BorderLayout.CENTER);
        mainPanel.add(bottomPanel, BorderLayout.SOUTH);

        this.setContentPane(mainPanel);

        setupTableContextMenu();
    }

    private void setupTableContextMenu() {
        JPopupMenu contextMenu = new JPopupMenu();
        JMenuItem deleteItem = new JMenuItem("Xóa biến thể này");

        // Removed internal listener to let Controller handle it
        tblVariants.putClientProperty("deleteMenuItem", deleteItem);

        contextMenu.add(deleteItem);
        tblVariants.setComponentPopupMenu(contextMenu);
    }

    // === GETTERS ===
    public String getProductId() {
        return txtProductId.getText().trim();
    }

    public String getProductName() {
        return txtProductName.getText().trim();
    }

    public String getDescription() {
        return txtDescription.getText();
    }

    public String getOriginalPrice() {
        return txtOriginalPrice.getText().trim();
    }

    public String getPrice() {
        return txtPrice.getText().trim();
    }

    public CategoryDTO getSelectedCategory() {
        return (CategoryDTO) cbCategory.getSelectedItem();
    }

    public BrandDTO getSelectedBrand() {
        return (BrandDTO) cbBrand.getSelectedItem();
    }

    public JTable getTblVariants() {
        return tblVariants;
    }

    public DefaultTableModel getVariantTableModel() {
        return variantTableModel;
    }

    public String getShowId() {
        return txtShowId.getText();
    }

    // === SETTERS ===
    public void setProductId(String id) {
        txtProductId.setText(id); // Add this!
        txtShowId.setText(id);
    }

    public void setProductName(String name) {
        txtProductName.setText(name);
    }

    public void setDescription(String desc) {
        txtDescription.setText(desc);
    }

    public void setOriginalPrice(String price) {
        txtOriginalPrice.setText(price);
    }

    public void setPrice(String price) {
        txtPrice.setText(price);
    }

    public void setCategories(List<CategoryDTO> list) {
        cbCategory.removeAllItems();
        if (list != null)
            list.forEach(cbCategory::addItem);
    }

    public void setBrands(List<BrandDTO> list) {
        cbBrand.removeAllItems();
        if (list != null)
            list.forEach(cbBrand::addItem);
    }

    public void setSelectedCategory(String categoryId) {
        for (int i = 0; i < cbCategory.getItemCount(); i++) {
            CategoryDTO cat = cbCategory.getItemAt(i);
            if (cat.getCategoryId().toString().equals(categoryId)) {
                cbCategory.setSelectedIndex(i);
                break;
            }
        }
    }

    public void setSelectedBrand(String brandId) {
        for (int i = 0; i < cbBrand.getItemCount(); i++) {
            BrandDTO brand = cbBrand.getItemAt(i);
            if (brand.getBrandId().toString().equals(brandId)) {
                cbBrand.setSelectedIndex(i);
                break;
            }
        }
    }

    public void setImagePreview(ImageIcon icon) {
        if (icon != null) {
            Image scaledImage = icon.getImage().getScaledInstance(150, 150, Image.SCALE_SMOOTH);
            lblImagePreview.setIcon(new ImageIcon(scaledImage));
            lblImagePreview.setText("");
        } else {
            lblImagePreview.setIcon(null);
            lblImagePreview.setText("Chưa có ảnh");
        }
    }

    // === LISTENERS ===
    public void addSearchListener(ActionListener listener) {
        btnSearch.addActionListener(listener);
    }

    public void addUploadImageListener(ActionListener listener) {
        btnUploadImage.addActionListener(listener);
    }

    public void addUpdateVariantListener(ActionListener listener) {
        btnUpdateVariant.addActionListener(listener);
    }

    public void addSaveListener(ActionListener listener) {
        btnSave.addActionListener(listener);
    }

    public void addDeleteProductListener(ActionListener listener) {
        btnDeleteProduct.addActionListener(listener);
    }

    public void addDeleteVariantListener(ActionListener listener) {
        JMenuItem deleteItem = (JMenuItem) tblVariants.getClientProperty("deleteMenuItem");
        if (deleteItem != null)
            deleteItem.addActionListener(listener);
    }

    public void addAddVariantListener(ActionListener listener) {
        btnAddVariant.addActionListener(listener);
    }

    // === UTILS ===
    public void showMessage(String msg) {
        JOptionPane.showMessageDialog(this, msg);
    }

    public void showError(String msg) {
        JOptionPane.showMessageDialog(this, msg, "Lỗi", JOptionPane.ERROR_MESSAGE);
    }

    public void clearForm() {
        txtProductId.setText("");
        txtShowId.setText("");
        txtProductName.setText("");
        txtDescription.setText("");
        txtOriginalPrice.setText("");
        txtPrice.setText("");
        variantTableModel.setRowCount(0);
        setImagePreview(null);
    }

    public void setFormEnabled(boolean enabled) {
        txtProductName.setEnabled(enabled);
        cbCategory.setEnabled(enabled);
        cbBrand.setEnabled(enabled);
        txtOriginalPrice.setEnabled(enabled);
        txtPrice.setEnabled(enabled);
        btnUploadImage.setEnabled(enabled);
        txtDescription.setEnabled(enabled);
        tblVariants.setEnabled(enabled);
        tblVariants.setEnabled(enabled);
        btnUpdateVariant.setEnabled(enabled);
        btnSave.setEnabled(enabled);
    }

    public void setSearchEnabled(boolean enabled) {
        txtProductId.setEnabled(enabled);
        btnSearch.setEnabled(enabled);
    }

    // New Back Button
    private JButton btnBack;

    public void addBackListener(ActionListener listener) {
        if (btnBack != null)
            btnBack.addActionListener(listener);
    }

    // Init Back Button in initComponents (you'll need to manually locate where to
    // modify init/layout,
    // but since I'm replacing the end of file, I can't inject into initComponents
    // easily without viewing full file.
    // I will assume I need to modify initComponents and layoutComponents as well.
    // Wait, replace_file_content needs contiguous block. I should probably use
    // multi_replace.
    // Let me switch to multi_replace for this file to be safe.
}