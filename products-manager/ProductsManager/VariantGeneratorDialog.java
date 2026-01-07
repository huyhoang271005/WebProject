package org.example.Feature.ProductsManager;

import org.example.Feature.ProductsManager.DTO.AttributeDTO;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

public class VariantGeneratorDialog extends JDialog {
    private JTable tblAttributes;
    private DefaultTableModel attributeTableModel;
    private JButton btnAddAttribute;
    private JButton btnRemoveAttribute;
    private JButton btnOK;
    private JButton btnCancel;

    private List<AttributeDTO> availableAttributes;
    private boolean isConfirmed = false;
    private List<VariantRow> generatedVariants = new ArrayList<>();

    public VariantGeneratorDialog(JFrame parent, List<AttributeDTO> attributes) {
        super(parent, "Tạo biến thể", true);
        this.availableAttributes = attributes != null ? attributes : new ArrayList<>();

        initComponents();
        layoutComponents();
        attachListeners();

        this.setSize(600, 400);
        this.setLocationRelativeTo(parent);
    }

    private void initComponents() {
        // Bảng thuộc tính
        String[] columns = {"Thuộc tính", "Giá trị (cách nhau bởi dấu phẩy)"};
        attributeTableModel = new DefaultTableModel(columns, 0);
        tblAttributes = new JTable(attributeTableModel);
        tblAttributes.getColumnModel().getColumn(1).setPreferredWidth(300);

        btnAddAttribute = new JButton("Thêm thuộc tính");
        btnRemoveAttribute = new JButton("Xóa dòng đã chọn");
        btnOK = new JButton("OK (Sinh biến thể)");
        btnCancel = new JButton("Hủy");
    }

    private void layoutComponents() {
        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // Panel hướng dẫn
        JPanel helpPanel = new JPanel(new BorderLayout());
        JLabel lblHelp = new JLabel("<html><b>Hướng dẫn:</b> Thêm các thuộc tính và giá trị. " +
                "Hệ thống sẽ tự động sinh tổ hợp.<br>" +
                "<i>VD: Màu sắc (Đỏ, Cam) + Khối lượng (Kg) → Đỏ-Kg, Cam-Kg</i></html>");
        helpPanel.add(lblHelp, BorderLayout.CENTER);
        helpPanel.setBorder(BorderFactory.createEmptyBorder(0, 0, 10, 0));
        mainPanel.add(helpPanel, BorderLayout.NORTH);

        // Panel bảng
        JScrollPane scrollPane = new JScrollPane(tblAttributes);
        mainPanel.add(scrollPane, BorderLayout.CENTER);

        // Panel buttons
        JPanel buttonPanel = new JPanel(new BorderLayout());

        // Buttons trái (Thêm/Xóa)
        JPanel leftButtons = new JPanel(new FlowLayout(FlowLayout.LEFT));
        leftButtons.add(btnAddAttribute);
        leftButtons.add(btnRemoveAttribute);
        buttonPanel.add(leftButtons, BorderLayout.WEST);

        // Buttons phải (OK/Hủy)
        JPanel rightButtons = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        rightButtons.add(btnCancel);
        rightButtons.add(btnOK);
        buttonPanel.add(rightButtons, BorderLayout.EAST);

        mainPanel.add(buttonPanel, BorderLayout.SOUTH);

        this.add(mainPanel);
    }

    private void attachListeners() {
        btnAddAttribute.addActionListener(e -> handleAddAttribute());
        btnRemoveAttribute.addActionListener(e -> handleRemoveAttribute());
        btnOK.addActionListener(e -> handleOK());
        btnCancel.addActionListener(e -> handleCancel());
    }

    private void handleAddAttribute() {
        // Dialog chọn thuộc tính
        AttributeDTO[] attrArray = availableAttributes.toArray(new AttributeDTO[0]);
        AttributeDTO selected = (AttributeDTO) JOptionPane.showInputDialog(
                this,
                "Chọn thuộc tính:",
                "Thêm thuộc tính",
                JOptionPane.QUESTION_MESSAGE,
                null,
                attrArray,
                attrArray.length > 0 ? attrArray[0] : null
        );

        if (selected != null) {
            // Kiểm tra đã có chưa
            for (int i = 0; i < attributeTableModel.getRowCount(); i++) {
                if (attributeTableModel.getValueAt(i, 0).toString().equals(selected.getAttributeName())) {
                    JOptionPane.showMessageDialog(this,
                            "Thuộc tính này đã được thêm!",
                            "Thông báo",
                            JOptionPane.WARNING_MESSAGE);
                    return;
                }
            }

            attributeTableModel.addRow(new Object[]{selected.getAttributeName(), ""});
        }
    }

    private void handleRemoveAttribute() {
        int selectedRow = tblAttributes.getSelectedRow();
        if (selectedRow >= 0) {
            attributeTableModel.removeRow(selectedRow);
        } else {
            JOptionPane.showMessageDialog(this,
                    "Vui lòng chọn dòng cần xóa!",
                    "Thông báo",
                    JOptionPane.WARNING_MESSAGE);
        }
    }

    private void handleOK() {
        if (attributeTableModel.getRowCount() == 0) {
            JOptionPane.showMessageDialog(this,
                    "Vui lòng thêm ít nhất 1 thuộc tính!",
                    "Lỗi",
                    JOptionPane.ERROR_MESSAGE);
            return;
        }

        // Parse dữ liệu từ bảng
        List<AttributeData> attributes = new ArrayList<>();

        for (int i = 0; i < attributeTableModel.getRowCount(); i++) {
            String attrName = attributeTableModel.getValueAt(i, 0).toString().trim();
            String rawValues = attributeTableModel.getValueAt(i, 1).toString().trim();

            if (rawValues.isEmpty()) {
                JOptionPane.showMessageDialog(this,
                        "Vui lòng nhập giá trị cho thuộc tính: " + attrName,
                        "Lỗi",
                        JOptionPane.ERROR_MESSAGE);
                return;
            }

            String[] values = rawValues.split(",");
            List<String> cleanValues = new ArrayList<>();
            for (String v : values) {
                String clean = v.trim();
                if (!clean.isEmpty()) {
                    cleanValues.add(clean);
                }
            }

            if (cleanValues.isEmpty()) {
                JOptionPane.showMessageDialog(this,
                        "Không có giá trị hợp lệ cho: " + attrName,
                        "Lỗi",
                        JOptionPane.ERROR_MESSAGE);
                return;
            }

            attributes.add(new AttributeData(attrName, cleanValues));
        }

        // Sinh tổ hợp (Cartesian Product)
        generatedVariants = generateCombinations(attributes);

        if (generatedVariants.isEmpty()) {
            JOptionPane.showMessageDialog(this,
                    "Không sinh được biến thể nào!",
                    "Lỗi",
                    JOptionPane.ERROR_MESSAGE);
            return;
        }

        isConfirmed = true;
        dispose();
    }

    private void handleCancel() {
        isConfirmed = false;
        generatedVariants.clear();
        dispose();
    }

    // Sinh tổ hợp Cartesian Product
    private List<VariantRow> generateCombinations(List<AttributeData> attributes) {
        List<VariantRow> result = new ArrayList<>();
        generateCombinationsRecursive(attributes, 0, new ArrayList<>(), result);
        return result;
    }

    private void generateCombinationsRecursive(
            List<AttributeData> attributes,
            int index,
            List<AttributeValue> current,
            List<VariantRow> result) {

        if (index == attributes.size()) {
            // Đã chọn hết tất cả thuộc tính, tạo variant
            result.add(new VariantRow(new ArrayList<>(current)));
            return;
        }

        AttributeData attr = attributes.get(index);
        for (String value : attr.values) {
            current.add(new AttributeValue(attr.name, value));
            generateCombinationsRecursive(attributes, index + 1, current, result);
            current.remove(current.size() - 1); // Backtrack
        }
    }

    // Getters
    public boolean isConfirmed() {
        return isConfirmed;
    }

    public List<VariantRow> getGeneratedVariants() {
        return generatedVariants;
    }

    // Inner classes
    private static class AttributeData {
        String name;
        List<String> values;

        AttributeData(String name, List<String> values) {
            this.name = name;
            this.values = values;
        }
    }

    public static class AttributeValue {
        private final String attributeName;
        private final String value;

        public AttributeValue(String attributeName, String value) {
            this.attributeName = attributeName;
            this.value = value;
        }

        public String getAttributeName() {
            return attributeName;
        }

        public String getValue() {
            return value;
        }
    }

    // ✅ UPDATED: Thêm field variantId để hỗ trợ Edit
    public static class VariantRow {
        private final List<AttributeValue> attributes;
        private String variantId; // ✅ THÊM FIELD NÀY cho Edit mode

        // Constructor cũ (dùng khi tạo mới)
        public VariantRow(List<AttributeValue> attributes) {
            this.attributes = attributes;
            this.variantId = null; // Mặc định null khi tạo mới
        }

        // ✅ Constructor mới (dùng khi load từ server trong Edit mode)
        public VariantRow(String variantName, List<AttributeValue> attributes) {
            this.attributes = attributes;
            this.variantId = null;
        }

        public List<AttributeValue> getAttributes() {
            return attributes;
        }

        // Tạo tên variant kết hợp (VD: "Đỏ - Kg")
        public String getVariantName() {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < attributes.size(); i++) {
                if (i > 0) sb.append(" - ");
                sb.append(attributes.get(i).getValue());
            }
            return sb.toString();
        }

        public String getVariantId() {
            return variantId;
        }

        public void setVariantId(String variantId) {
            this.variantId = variantId;
        }
    }
}