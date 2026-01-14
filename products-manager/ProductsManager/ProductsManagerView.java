package org.example.Feature.ProductsManager;

import org.example.Feature.CatalogManager.DTO.BrandDTO;
import org.example.Feature.CatalogManager.DTO.CategoryDTO;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionListener;
import java.util.List;

public class ProductsManagerView extends JFrame {
    private JPanel panel1;
    // Khởi tạo thủ công thay vì dùng .form
    private JPanel plnBasicInfo;
    private JPanel pnlVariants;
    private JTextField txtProductName;
    private JComboBox<CategoryDTO> cbCategory;
    private JComboBox<BrandDTO> cbBrand;
    private JTextField txtOriginalPrice;
    private JTextField txtPrice;
    private JButton btnUploadImage;
    private JLabel lblImagePreview; // Added preview label
    private JTextArea txtDescription;
    private JTable tblVariants;
    private JButton btnSave;
    private JButton btnAddVariants;
    private JButton btnBack; // Declare btnBack

    public ProductsManagerView() {
        initComponents(); // Khởi tạo giao diện
        this.setContentPane(panel1);
        this.setTitle("Quản lý sản phẩm");
        this.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);

        setupTable();
        setupTableContextMenu();

        this.pack();
        this.setLocationRelativeTo(null);
    }

    private void initComponents() {
        panel1 = new JPanel(new BorderLayout(10, 10));
        panel1.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Header
        JLabel lblHeader = new JLabel("Thêm sản phẩm mới", SwingConstants.CENTER);
        lblHeader.setFont(lblHeader.getFont().deriveFont(Font.BOLD, 16f));
        panel1.add(lblHeader, BorderLayout.NORTH);

        // --- LEFT PANEL: Basic Info ---
        plnBasicInfo = new JPanel(new GridBagLayout());
        // plnBasicInfo.setPreferredSize(new Dimension(350, 400));
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.anchor = GridBagConstraints.WEST;

        // Row 0: Tên sản phẩm
        gbc.gridx = 0;
        gbc.gridy = 0;
        plnBasicInfo.add(new JLabel("Tên sản phẩm:"), gbc);
        txtProductName = new JTextField(20);
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        plnBasicInfo.add(txtProductName, gbc);

        // Row 1: Danh mục
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.weightx = 0;
        plnBasicInfo.add(new JLabel("Danh mục:"), gbc);
        cbCategory = new JComboBox<>();
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        plnBasicInfo.add(cbCategory, gbc);

        // Row 2: Thương hiệu
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.weightx = 0;
        plnBasicInfo.add(new JLabel("Thương hiệu:"), gbc);
        cbBrand = new JComboBox<>();
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        plnBasicInfo.add(cbBrand, gbc);

        // Row 3: Giá gốc
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.weightx = 0;
        plnBasicInfo.add(new JLabel("Giá gốc:"), gbc);
        txtOriginalPrice = new JTextField();
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        plnBasicInfo.add(txtOriginalPrice, gbc);

        // Row 4: Giá bán
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.weightx = 0;
        plnBasicInfo.add(new JLabel("Giá bán:"), gbc);
        txtPrice = new JTextField();
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        plnBasicInfo.add(txtPrice, gbc);

        // Row 5: Avatar
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.weightx = 0;
        plnBasicInfo.add(new JLabel("Ảnh đại diện:"), gbc);

        JPanel pnlImage = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
        btnUploadImage = new JButton("Chọn ảnh");
        lblImagePreview = new JLabel();
        lblImagePreview.setPreferredSize(new Dimension(50, 50));
        lblImagePreview.setBorder(BorderFactory.createLineBorder(Color.GRAY));

        pnlImage.add(btnUploadImage);
        pnlImage.add(Box.createHorizontalStrut(10));
        pnlImage.add(lblImagePreview);

        gbc.gridx = 1;
        gbc.weightx = 1.0;
        plnBasicInfo.add(pnlImage, gbc);

        // Row 6: Description
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.weightx = 0; // reset
        gbc.anchor = GridBagConstraints.NORTHWEST;
        plnBasicInfo.add(new JLabel("Mô tả:"), gbc);
        txtDescription = new JTextArea(5, 20);
        txtDescription.setLineWrap(true);
        txtDescription.setWrapStyleWord(true);
        gbc.gridx = 1;
        gbc.weightx = 1.0;
        gbc.fill = GridBagConstraints.BOTH;
        plnBasicInfo.add(new JScrollPane(txtDescription), gbc);

        // Row 7: Save Button
        gbc.gridx = 0;
        gbc.gridy++;
        gbc.gridwidth = 2;
        gbc.weightx = 0;
        gbc.fill = GridBagConstraints.NONE;
        gbc.anchor = GridBagConstraints.CENTER;
        btnSave = new JButton("Lưu sản phẩm");
        btnSave.setPreferredSize(new Dimension(150, 30));

        btnBack = new JButton("Quay lại");

        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        buttonPanel.add(btnBack);
        buttonPanel.add(btnSave);

        plnBasicInfo.add(buttonPanel, gbc);

        // --- RIGHT PANEL: Variants ---
        pnlVariants = new JPanel(new BorderLayout(5, 5));
        pnlVariants.setBorder(BorderFactory.createTitledBorder("Danh sách biến thể"));

        btnAddVariants = new JButton("Thêm biến thể");
        pnlVariants.add(btnAddVariants, BorderLayout.NORTH);

        tblVariants = new JTable();
        pnlVariants.add(new JScrollPane(tblVariants), BorderLayout.CENTER);

        // Split Pane to divide Basic Info and Variants
        JSplitPane splitPane = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, plnBasicInfo, pnlVariants);
        splitPane.setResizeWeight(0.4); // Basic info takes 40%

        panel1.add(splitPane, BorderLayout.CENTER);
    }

    private void setupTable() {
        String[] columns = { "Tên biến thể", "Giá gốc", "Giá bán", "Tồn kho", "Đường dẫn ảnh" };
        DefaultTableModel model = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return column == 1 || column == 2 || column == 3;
            }
        };
        tblVariants.setModel(model);
        tblVariants.setRowHeight(25);
    }

    private void setupTableContextMenu() {
        JPopupMenu contextMenu = new JPopupMenu();
        JMenuItem deleteItem = new JMenuItem("Xóa dòng này");
        JMenuItem deleteAllItem = new JMenuItem("Xóa tất cả");

        contextMenu.add(deleteItem);
        contextMenu.add(deleteAllItem);

        tblVariants.setComponentPopupMenu(contextMenu);
        tblVariants.putClientProperty("deleteMenuItem", deleteItem);
        tblVariants.putClientProperty("deleteAllMenuItem", deleteAllItem);
    }

    // --- GETTERS ---
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
        return (DefaultTableModel) tblVariants.getModel();
    }

    // --- SETTERS ---
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

    // Fix: Add method to set image preview
    public void setImagePreview(Icon icon) {
        lblImagePreview.setIcon(icon);
        if (icon != null) {
            lblImagePreview.setText("");
        }
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

    // --- LISTENERS ---
    public void addUploadImageListener(ActionListener listener) {
        btnUploadImage.addActionListener(listener);
    }

    public void addSaveListener(ActionListener listener) {
        btnSave.addActionListener(listener);
    }

    public void addGenerateVariantsListener(ActionListener listener) {
        btnAddVariants.addActionListener(listener);
    }

    public void addRemoveVariantListener(ActionListener listener) {
        JMenuItem deleteItem = (JMenuItem) tblVariants.getClientProperty("deleteMenuItem");
        if (deleteItem != null)
            deleteItem.addActionListener(listener);
    }

    public void addRemoveAllVariantsListener(ActionListener listener) {
        JMenuItem deleteAllItem = (JMenuItem) tblVariants.getClientProperty("deleteAllMenuItem");
        if (deleteAllItem != null)
            deleteAllItem.addActionListener(listener);
    }

    // --- UTILS ---
    public void showMessage(String msg) {
        JOptionPane.showMessageDialog(this, msg);
    }

    public void showError(String msg) {
        JOptionPane.showMessageDialog(this, msg, "Lỗi", JOptionPane.ERROR_MESSAGE);
    }

    public void setSaveButtonEnabled(boolean enabled, String text) {
        btnSave.setEnabled(enabled);
        btnSave.setText(text);
    }

    public void addBackListener(ActionListener listener) {
        if (btnBack != null)
            btnBack.addActionListener(listener);
    }
}