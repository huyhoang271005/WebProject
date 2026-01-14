package org.example.Feature.ProductsManager.Edit;

import org.example.Feature.ProductsManager.DTO.AttributeDTO;
import org.example.Feature.ProductsManager.DTO.VariantDTO;
import org.example.Feature.ProductsManager.DTO.VariantValueDTO;

import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.*;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AddVariantDialog extends JDialog {
    private final List<AttributeDTO> attributes;
    private final Map<UUID, JTextField> attributeInputs = new HashMap<>();

    private JTextField txtOriginalPrice;
    private JTextField txtPrice;
    private JTextField txtStock;
    private JLabel lblImageName;
    private File selectedImage;

    private boolean isConfirmed = false;
    private VariantDTO createdVariant;
    private List<VariantValueDTO> variantValues; // To hold the attribute values
    private String variantName;

    public AddVariantDialog(JFrame parent, List<AttributeDTO> attributes) {
        super(parent, "Thêm biến thể mới", true);
        this.attributes = attributes != null ? attributes : new ArrayList<>();

        initComponents();
        layoutComponents();

        this.setSize(400, 300 + (this.attributes.size() * 30));
        this.setLocationRelativeTo(parent);
    }

    private void initComponents() {
        txtOriginalPrice = new JTextField(10);
        txtPrice = new JTextField(10);
        txtStock = new JTextField(10);
        lblImageName = new JLabel("Chưa chọn ảnh");

        // Initialize inputs for attributes
        for (AttributeDTO attr : attributes) {
            attributeInputs.put(attr.getAttributeId(), new JTextField(10));
        }
    }

    private void layoutComponents() {
        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        JPanel formPanel = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(5, 5, 5, 5);
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.gridx = 0;
        gbc.gridy = 0;

        // Dynamic Attribute Fields
        for (AttributeDTO attr : attributes) {
            formPanel.add(new JLabel(attr.getAttributeName() + ":"), gbc);
            gbc.gridx = 1;
            formPanel.add(attributeInputs.get(attr.getAttributeId()), gbc);
            gbc.gridx = 0;
            gbc.gridy++;
        }

        // Fixed Fields
        formPanel.add(new JLabel("Giá gốc:"), gbc);
        gbc.gridx = 1;
        formPanel.add(txtOriginalPrice, gbc);
        gbc.gridx = 0;
        gbc.gridy++;

        formPanel.add(new JLabel("Giá bán:"), gbc);
        gbc.gridx = 1;
        formPanel.add(txtPrice, gbc);
        gbc.gridx = 0;
        gbc.gridy++;

        formPanel.add(new JLabel("Tồn kho:"), gbc);
        gbc.gridx = 1;
        formPanel.add(txtStock, gbc);
        gbc.gridx = 0;
        gbc.gridy++;

        JButton btnChooseImage = new JButton("Chọn ảnh");
        btnChooseImage.addActionListener(e -> chooseImage());
        formPanel.add(btnChooseImage, gbc);
        gbc.gridx = 1;
        formPanel.add(lblImageName, gbc);

        // Buttons
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        JButton btnCancel = new JButton("Hủy");
        JButton btnOK = new JButton("Thêm");

        btnCancel.addActionListener(e -> dispose());
        btnOK.addActionListener(e -> handleOK());

        buttonPanel.add(btnCancel);
        buttonPanel.add(btnOK);

        mainPanel.add(formPanel, BorderLayout.CENTER);
        mainPanel.add(buttonPanel, BorderLayout.SOUTH);

        this.setContentPane(mainPanel);
    }

    private void chooseImage() {
        JFileChooser chooser = new JFileChooser();
        chooser.setFileFilter(new FileNameExtensionFilter("Image Files", "jpg", "png", "jpeg"));
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            selectedImage = chooser.getSelectedFile();
            lblImageName.setText(selectedImage.getName());
        }
    }

    private void handleOK() {
        // Validation
        try {
            Double.parseDouble(txtPrice.getText());
            Double.parseDouble(txtOriginalPrice.getText());
            Integer.parseInt(txtStock.getText());
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(this, "Giá và tồn kho phải là số hợp lệ!");
            return;
        }

        // Build VariantValueDTO list and Variant Name
        variantValues = new ArrayList<>();
        List<String> nameParts = new ArrayList<>();

        for (AttributeDTO attr : attributes) {
            String val = attributeInputs.get(attr.getAttributeId()).getText().trim();
            if (val.isEmpty()) {
                JOptionPane.showMessageDialog(this, "Vui lòng nhập " + attr.getAttributeName());
                return;
            }

            nameParts.add(val);
        }

        variantName = String.join(" - ", nameParts);

        createdVariant = VariantDTO.builder()
                .originalPrice(txtOriginalPrice.getText().trim())
                .price(txtPrice.getText().trim())
                .stock(Integer.parseInt(txtStock.getText()))
                .active(true)
                .build();


        isConfirmed = true;
        dispose();
    }

    public boolean isConfirmed() {
        return isConfirmed;
    }

    public VariantDTO getCreatedVariant() {
        return createdVariant;
    }

    public File getSelectedImage() {
        return selectedImage;
    }

    public String getVariantName() {
        return variantName;
    }

    // public List<VariantValueDTO> getVariantValues() { return variantValues; }
    public Map<UUID, String> getAttributeValues() {
        Map<UUID, String> values = new HashMap<>();
        for (AttributeDTO attr : attributes) {
            JTextField field = attributeInputs.get(attr.getAttributeId());
            if (field != null) {
                values.put(attr.getAttributeId(), field.getText().trim());
            }
        }
        return values;
    }
}
