package org.example.Feature.ProductsManager;

import org.example.API.ApiCaller;
import org.example.API.ListResponse;
import org.example.API.MyResponse;
import org.example.Feature.ProductsManager.DTO.*;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.File;
import java.util.*;

public class ProductsManagerController extends BaseProductController {
    private final ProductsManagerView view;
    // productApi is now inherited

    private File selectedMainImage;
    private final Map<String, File> variantImagesMap = new HashMap<>();

    private List<AttributeDTO> serverAttributes = new ArrayList<>();
    private List<VariantGeneratorDialog.VariantRow> cachedVariantStructure = new ArrayList<>();

    // Constructor mặc định - tự tạo View
    public ProductsManagerController() {
        this(new ProductsManagerView());
        this.view.setVisible(true);
    }

    // Constructor với tham số View
    public ProductsManagerController(ProductsManagerView view) {
        super(); // Call BaseProductController constructor
        this.view = view;

        loadInitData();
        attachListeners();

        setupTableImagePicker();
        setupTablePriceEditor();
        setupTableKeyboardDelete();
    }

    private void attachListeners() {
        this.view.addUploadImageListener(e -> handleUploadMainImage());
        this.view.addGenerateVariantsListener(e -> handleGenerateVariants());
        this.view.addRemoveVariantListener(e -> handleRemoveVariant());
        this.view.addRemoveAllVariantsListener(e -> handleRemoveAllVariants());
        this.view.addSaveListener(e -> handleSaveProduct());
        this.view.addBackListener(e -> {
            view.dispose();
            new org.example.Feature.Home.HomeController();
        });
    }

    private void loadInitData() {
        // Use inherited methods
        loadCategories(
                list -> view.setCategories(list),
                error -> view.showError("Lỗi tải danh mục: " + error));

        loadBrands(
                list -> view.setBrands(list),
                error -> view.showError("Lỗi tải thương hiệu: " + error));

        // Attributes specific logic remains here
        ApiCaller.callApi(productApi.getAttributes(), new ApiCaller.Listening<ListResponse<AttributeDTO>>() {
            @Override
            public void onSuccess(MyResponse<ListResponse<AttributeDTO>> res) {
                if (res.getData() != null && res.getData().getListData() != null) {
                    serverAttributes = res.getData().getListData();
                }
            }

            @Override
            public void onError(MyResponse<?> res) {
                System.err.println("Không load được attributes: " + (res != null ? res.getMessage() : "Unknown"));
            }
        });
    }

    private void handleUploadMainImage() {
        File file = chooseImageFile(view); // Use inherited method
        if (file != null) {
            selectedMainImage = file;
            try {
                java.awt.Image image = javax.imageio.ImageIO.read(file);
                if (image != null) {
                    view.setImagePreview(new ImageIcon(image.getScaledInstance(50, 50, java.awt.Image.SCALE_SMOOTH)));
                    view.showMessage("Đã chọn ảnh chính: " + file.getName());
                }
            } catch (Exception e) {
                view.showError("Không thể đọc file ảnh: " + e.getMessage());
            }
        }
    }

    // 3. xu ly sinh bien the tu dong
    private void handleGenerateVariants() {
        VariantGeneratorDialog dialog = new VariantGeneratorDialog(view, serverAttributes);
        dialog.setVisible(true);

        if (dialog.isConfirmed()) {
            // Lấy danh sách tổ hợp biến thể (VD: Màu Đỏ - Size L)
            List<VariantGeneratorDialog.VariantRow> variantRows = dialog.getGeneratedVariants();

            if (variantRows.isEmpty())
                return;

            String defaultOriginalPrice = view.getOriginalPrice().isEmpty() ? "0" : view.getOriginalPrice();
            String defaultPrice = view.getPrice().isEmpty() ? "0" : view.getPrice();
            String defaultStock = "10";

            DefaultTableModel model = view.getVariantTableModel();
            model.setRowCount(0);
            cachedVariantStructure = new ArrayList<>();

            // Duyệt danh sách tổ hợp và đổ vào Table
            for (VariantGeneratorDialog.VariantRow variantRow : variantRows) {
                model.addRow(new Object[] {
                        variantRow.getVariantName(),
                        defaultOriginalPrice,
                        defaultPrice,
                        defaultStock,
                        ""
                });
                cachedVariantStructure.add(variantRow);
            }
            view.showMessage("Đã sinh " + variantRows.size() + " biến thể");
        }
    }

    private void handleRemoveVariant() {
        int selectedRow = view.getTblVariants().getSelectedRow();
        if (selectedRow < 0) {
            view.showError("Vui lòng chọn dòng cần xóa!");
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(view, "Bạn có chắc muốn xóa biến thể này?", "Xác nhận xóa",
                JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            DefaultTableModel model = view.getVariantTableModel();
            model.removeRow(selectedRow);
            if (selectedRow < cachedVariantStructure.size()) {
                cachedVariantStructure.remove(selectedRow);
            }
            view.showMessage("Đã xóa biến thể");
        }
    }

    private void handleRemoveAllVariants() {
        if (view.getVariantTableModel().getRowCount() == 0)
            return;
        int confirm = JOptionPane.showConfirmDialog(view, "Xóa tất cả biến thể?", "Xác nhận",
                JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            view.getVariantTableModel().setRowCount(0);
            cachedVariantStructure.clear();
            variantImagesMap.clear();
        }
    }

    private void setupTableKeyboardDelete() {
        view.getTblVariants().addKeyListener(new java.awt.event.KeyAdapter() {
            @Override
            public void keyPressed(java.awt.event.KeyEvent e) {
                if (e.getKeyCode() == java.awt.event.KeyEvent.VK_DELETE)
                    handleRemoveVariant();
            }
        });
    }

    private void setupTableImagePicker() {
        view.getTblVariants().addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                int row = view.getTblVariants().getSelectedRow();
                int col = view.getTblVariants().getSelectedColumn();
                if (col == 4) {
                    File file = chooseImageFile(view); // Use inherited method
                    if (file != null) {
                        view.getVariantTableModel().setValueAt(file.getAbsolutePath(), row, col);
                        view.showMessage("Đã chọn ảnh cho dòng " + (row + 1));
                    }
                }
            }
        });
    }

    private void setupTablePriceEditor() {
        // Handled by View
    }

    private void handleSaveProduct() {
        if (view.getProductName().isEmpty()) {
            view.showError("Tên sản phẩm trống!");
            return;
        }
        if (view.getSelectedCategory() == null || view.getSelectedBrand() == null) {
            view.showError("Chưa chọn Danh mục/Thương hiệu!");
            return;
        }

        // Validate prices are entered but valid number check is deferred to
        // backend/logic if needed,
        // but since we just pass string, we just check empty
        if (view.getOriginalPrice().isEmpty() || view.getPrice().isEmpty()) {
            view.showError("Giá tiền không được để trống!");
            return;
        }

        try {
            double orgP = Double.parseDouble(view.getOriginalPrice());
            double p = Double.parseDouble(view.getPrice());
            if (orgP < 0 || p < 0) {
                view.showError("Giá tiền không được nhỏ hơn 0!");
                return;
            }
        } catch (NumberFormatException e) {
            view.showError("Giá tiền phải là số hợp lệ!");
            return;
        }

        ProductDetailDTO detailDTO = ProductDetailDTO.builder()
                .productName(view.getProductName())
                .description(view.getDescription())
                .categoryId(view.getSelectedCategory().getCategoryId())
                .brandId(view.getSelectedBrand().getBrandId())
                .originalPrice(view.getOriginalPrice())
                .price(view.getPrice())
                .build();

        Map<String, List<?>> complexData = buildDataFromTable(view.getOriginalPrice(), view.getPrice());

        ProductDTO productDTO = ProductDTO.builder()
                .productDetailDTO(detailDTO)
                .attributes((List<AttributeDTO>) complexData.get("attributes"))
                .variants((List<VariantDTO>) complexData.get("variants"))
                .variantValues((List<VariantValueDTO>) complexData.get("variantValues"))
                .build();

        view.setSaveButtonEnabled(false, "Đang xử lý...");
        ApiCaller.callApi(
                ProductApi.RequestBuilder.createProduct(productDTO, selectedMainImage, variantImagesMap),
                new ApiCaller.Listening<ProductDTO>() {
                    @Override
                    public void onSuccess(MyResponse<ProductDTO> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setSaveButtonEnabled(true, "Lưu sản phẩm");
                            view.showMessage("Thêm thành công!");
                            resetForm();
                        });
                    }

                    @Override
                    public void onError(MyResponse<?> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setSaveButtonEnabled(true, "Lưu sản phẩm");
                            view.showError("Thất bại: " + (res != null ? res.getMessage() : "Unknown"));
                        });
                    }
                });
    }

    private Map<String, List<?>> buildDataFromTable(String defaultPriceOrg, String defaultPrice) {
        DefaultTableModel model = view.getVariantTableModel();
        List<AttributeDTO> attributes = new ArrayList<>();
        List<VariantDTO> variants = new ArrayList<>();
        List<VariantValueDTO> variantValues = new ArrayList<>();

        variantImagesMap.clear();

        if (model.getRowCount() == 0) {
            String vId = UUID.randomUUID().toString();
            variants.add(VariantDTO.builder()
                    .variantId(vId)
                    .originalPrice(defaultPriceOrg)
                    .price(defaultPrice)
                    .stock(100)
                    .sold(0)
                    .active(true)
                    .build());
        } else {
            if (cachedVariantStructure.isEmpty())
                throw new IllegalStateException("Lỗi cấu trúc variant");

            Map<String, AttributeDTO> attrMap = new HashMap<>();
            Map<String, String> valueIdMap = new HashMap<>();

            VariantGeneratorDialog.VariantRow firstVariant = cachedVariantStructure.get(0);
            List<String> attrNames = new ArrayList<>();
            for (VariantGeneratorDialog.AttributeValue av : firstVariant.getAttributes()) {
                if (!attrNames.contains(av.getAttributeName()))
                    attrNames.add(av.getAttributeName());
            }

            for (String attrName : attrNames) {
                AttributeDTO serverAttr = serverAttributes.stream()
                        .filter(a -> a.getAttributeName().equalsIgnoreCase(attrName))
                        .findFirst().orElse(null);

                UUID attrId = serverAttr != null ? serverAttr.getAttributeId() : UUID.randomUUID();
                AttributeDTO attr = AttributeDTO.builder()
                        .attributeId(attrId)
                        .attributeName(attrName)
                        .attributeValues(new ArrayList<>())
                        .build();

                List<String> uniqueValues = new ArrayList<>();
                for (VariantGeneratorDialog.VariantRow vr : cachedVariantStructure) {
                    for (VariantGeneratorDialog.AttributeValue av : vr.getAttributes()) {
                        if (av.getAttributeName().equals(attrName) && !uniqueValues.contains(av.getValue())) {
                            uniqueValues.add(av.getValue());
                        }
                    }
                }

                for (String valueName : uniqueValues) {
                    AttributeValueDTO serverValue = null;
                    if (serverAttr != null && serverAttr.getAttributeValues() != null) {
                        serverValue = serverAttr.getAttributeValues().stream()
                                .filter(v -> v.getAttributeValueName().equalsIgnoreCase(valueName))
                                .findFirst().orElse(null);
                    }
                    String valueId = serverValue != null ? serverValue.getAttributeValueId()
                            : UUID.randomUUID().toString();

                    attr.getAttributeValues().add(AttributeValueDTO.builder()
                            .attributeValueId(valueId)
                            .attributeValueName(valueName)
                            .build());

                    valueIdMap.put(attrName + "|" + valueName, valueId);
                }
                attributes.add(attr);
                attrMap.put(attrName, attr);
            }

            for (int i = 0; i < model.getRowCount(); i++) {
                String vOrg = model.getValueAt(i, 1).toString();
                String vPrice = model.getValueAt(i, 2).toString();
                Integer vStock = parseInt(model.getValueAt(i, 3), 10); // Use inherited
                String imgPath = model.getValueAt(i, 4).toString().trim();

                String variantId = UUID.randomUUID().toString();
                variants.add(VariantDTO.builder()
                        .variantId(variantId)
                        .imageName(variantId)
                        .originalPrice(vOrg)
                        .price(vPrice)
                        .stock(vStock)
                        .sold(0)
                        .active(true)
                        .build());

                VariantGeneratorDialog.VariantRow variantRow = cachedVariantStructure.get(i);
                for (VariantGeneratorDialog.AttributeValue av : variantRow.getAttributes()) {
                    String valueId = valueIdMap.get(av.getAttributeName() + "|" + av.getValue());
                    if (valueId != null) {
                        variantValues.add(VariantValueDTO.builder()
                                .variantId(variantId)
                                .attributeValueId(valueId)
                                .build());
                    }
                }

                if (!imgPath.isEmpty()) {
                    File imgFile = new File(imgPath);
                    if (imgFile.exists() && imgFile.isFile())
                        variantImagesMap.put(variantId, imgFile);
                }
            }
        }

        Map<String, List<?>> result = new HashMap<>();
        result.put("attributes", attributes);
        result.put("variants", variants);
        result.put("variantValues", variantValues);
        return result;
    }

    private void resetForm() {
        view.getVariantTableModel().setRowCount(0);
        selectedMainImage = null;
        variantImagesMap.clear();
        cachedVariantStructure.clear();
        view.setProductName("");
        view.setDescription("");
    }
}