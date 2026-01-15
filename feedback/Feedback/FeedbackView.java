package org.example.Feature.Feedback;

import lombok.Getter;
import org.example.Feature.Feedback.DTO.FeedbackCandidateDTO;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionListener;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
public class FeedbackView extends JFrame {
    private JPanel mainPanel; // Bound to .form
    private JTextField txtOrderId;
    private JButton btnSearch;
    private JTextField txtUserId;
    private JScrollPane scrollProducts;
    private JPanel pnlProductsContainer; // Custom create
    private JPanel pnlFeedbackForm;
    private JComboBox<Integer> cbRating;
    private JTextArea txtComment;
    private JButton btnSubmit;
    private JButton btnClear;

    private FeedbackCandidateDTO selectedProduct;
    private List<UUID> selectedOrderItemIds;

    public FeedbackView() {
        // $$$setupUI$$$(); // IntelliJ auto-injects this

        // Ensure components are created if not instrumented (partial fallback or just
        // for the custom create)
        if (pnlProductsContainer == null)
            createUIComponents();

        this.setContentPane(mainPanel);
        this.setTitle("Đánh giá sản phẩm");
        this.setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        this.setSize(1000, 700);
        this.setLocationRelativeTo(null);

        initComboBox();
    }

    private void createUIComponents() {
        pnlProductsContainer = new JPanel();
        pnlProductsContainer.setLayout(new BoxLayout(pnlProductsContainer, BoxLayout.Y_AXIS));
    }

    private void initComboBox() {
        if (cbRating != null && cbRating.getItemCount() == 0) {
            cbRating.addItem(1);
            cbRating.addItem(2);
            cbRating.addItem(3);
            cbRating.addItem(4);
            cbRating.addItem(5);
            cbRating.setSelectedItem(5);
        }
    }

    public void setProducts(List<FeedbackCandidateDTO> products) {
        pnlProductsContainer.removeAll();

        if (products == null || products.isEmpty()) {
            JLabel lblEmpty = new JLabel("Không có sản phẩm nào để đánh giá");
            lblEmpty.setHorizontalAlignment(SwingConstants.CENTER);
            pnlProductsContainer.add(lblEmpty);
        } else {
            for (FeedbackCandidateDTO product : products) {
                JPanel productPanel = createProductPanel(product);
                pnlProductsContainer.add(productPanel);
                pnlProductsContainer.add(Box.createVerticalStrut(10));
            }
        }

        pnlProductsContainer.revalidate();
        pnlProductsContainer.repaint();
    }

    private JPanel createProductPanel(FeedbackCandidateDTO product) {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Color.GRAY),
                BorderFactory.createEmptyBorder(10, 10, 10, 10)));

        // Left: Image
        JLabel lblImage = new JLabel();
        lblImage.setPreferredSize(new Dimension(100, 100));
        lblImage.setBorder(BorderFactory.createLineBorder(Color.LIGHT_GRAY));
        if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
            loadImageAsync(lblImage, product.getImageUrl());
        } else {
            lblImage.setText("No Image");
            lblImage.setHorizontalAlignment(SwingConstants.CENTER);
        }

        // Center: Product info
        JPanel infoPanel = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.anchor = GridBagConstraints.WEST;
        gbc.insets = new Insets(2, 5, 2, 5);

        gbc.gridx = 0;
        gbc.gridy = 0;
        infoPanel.add(new JLabel("<html><b>" + product.getProductName() + "</b></html>"), gbc);

        gbc.gridy = 1;
        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            StringBuilder variantText = new StringBuilder("Phân loại: ");
            for (Map<String, String> variant : product.getVariants()) {
                for (Map.Entry<String, String> entry : variant.entrySet()) {
                    variantText.append(entry.getKey()).append(": ").append(entry.getValue()).append("; ");
                }
            }
            infoPanel.add(new JLabel(variantText.toString()), gbc);
        }

        gbc.gridy = 2;
        infoPanel.add(new JLabel("Order Item IDs: " + product.getOrderItemIds().size() + " item(s)"), gbc);

        // Right: Select button
        JButton btnSelect = new JButton("Chọn để đánh giá");
        btnSelect.addActionListener(e -> {
            selectedProduct = product;
            selectedOrderItemIds = product.getOrderItemIds();
            highlightPanel(panel);
            showMessage("Đã chọn sản phẩm: " + product.getProductName());
        });

        panel.add(lblImage, BorderLayout.WEST);
        panel.add(infoPanel, BorderLayout.CENTER);
        panel.add(btnSelect, BorderLayout.EAST);

        return panel;
    }

    private void loadImageAsync(JLabel label, String imageUrl) {
        new Thread(() -> {
            try {
                java.net.URL url = URI.create(imageUrl).toURL();
                ImageIcon icon = new ImageIcon(url);
                Image img = icon.getImage();
                Image scaledImg = img.getScaledInstance(100, 100, Image.SCALE_SMOOTH);
                SwingUtilities.invokeLater(() -> {
                    label.setIcon(new ImageIcon(scaledImg));
                    label.setText("");
                });
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> {
                    label.setText("Load error");
                    label.setHorizontalAlignment(SwingConstants.CENTER);
                });
            }
        }).start();
    }

    private void highlightPanel(JPanel panel) {
        // Reset all panels
        for (Component comp : pnlProductsContainer.getComponents()) {
            if (comp instanceof JPanel) {
                comp.setBackground(null);
            }
        }
        // Highlight selected
        panel.setBackground(new Color(200, 220, 255));
    }

    public String getOrderId() {
        return txtOrderId.getText().trim();
    }

    public void setOrderId(String orderId) {
        if (txtOrderId != null) {
            txtOrderId.setText(orderId);
        }
    }

    public String getUserId() {
        return txtUserId.getText().trim();
    }

    public void setUserId(String userId) {
        if (txtUserId != null) {
            txtUserId.setText(userId);
        }
    }

    public Integer getRating() {
        return (Integer) cbRating.getSelectedItem();
    }

    public String getComment() {
        return txtComment.getText().trim();
    }

    public void clearFeedbackForm() {
        if (cbRating != null)
            cbRating.setSelectedIndex(4);
        if (txtComment != null)
            txtComment.setText("");
        selectedProduct = null;
        selectedOrderItemIds = null;
        // Reset highlight
        if (pnlProductsContainer != null) {
            for (Component comp : pnlProductsContainer.getComponents()) {
                if (comp instanceof JPanel) {
                    comp.setBackground(null);
                }
            }
        }
    }

    public void addSearchListener(ActionListener listener) {
        if (btnSearch != null)
            btnSearch.addActionListener(listener);
    }

    public void addSubmitListener(ActionListener listener) {
        if (btnSubmit != null)
            btnSubmit.addActionListener(listener);
    }

    public void addClearListener(ActionListener listener) {
        if (btnClear != null)
            btnClear.addActionListener(listener);
    }

    public void showMessage(String msg) {
        JOptionPane.showMessageDialog(this, msg);
    }

    public void showError(String msg) {
        JOptionPane.showMessageDialog(this, msg, "Lỗi", JOptionPane.ERROR_MESSAGE);
    }

    public void setFormEnabled(boolean enabled) {
        if (cbRating != null)
            cbRating.setEnabled(enabled);
        if (txtComment != null)
            txtComment.setEnabled(enabled);
        if (btnSubmit != null)
            btnSubmit.setEnabled(enabled);
    }
}
