package org.example.Feature.ProductsManager.Edit;

import org.example.API.ApiCaller;
import org.example.API.MyResponse;
import org.example.Feature.ProductsManager.BaseProductController;
import org.example.Feature.ProductsManager.DTO.*;

import javax.imageio.ImageIO;
import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.File;
import java.net.URL;
import java.util.*;
import java.util.List;

public class EditProductController extends BaseProductController {
    private final EditProductView view;

    private ProductDTO currentProduct;
    private File selectedMainImage;
    private final Map<String, File> variantImagesMap = new HashMap<>();

    // Constructor tiện lợi: new EditProductController("id-san-pham");
    public EditProductController(String productId) {
        this(new EditProductView(), productId);
        this.view.setVisible(true);
    }

    public EditProductController(EditProductView view) {
        this(view, null);
    }

    public EditProductController(EditProductView view, String productId) {
        super(); // Call Base
        this.view = view;

        loadInitData();
        attachListeners();

        if (productId != null && !productId.isEmpty()) {
            view.setProductId(productId);
            handleSearch();
            // Nếu muốn chặn không cho tìm ID khác khi đã vào từ trang Detail:
            view.setSearchEnabled(false);
        }
    }

    private void loadInitData() {
        // Use inherited methods
        loadCategories(
                list -> view.setCategories(list),
                error -> view.showError("Lỗi tải danh mục: " + error));

        loadBrands(
                list -> view.setBrands(list),
                error -> view.showError("Lỗi tải thương hiệu: " + error));
    }

    private void attachListeners() {
        view.addSearchListener(e -> handleSearch());
        view.addUploadImageListener(e -> handleUploadMainImage());
        view.addUpdateVariantListener(e -> handleUpdateVariants());
        view.addSaveListener(e -> handleSaveProduct()); // Save thông minh
        view.addDeleteProductListener(e -> handleDeleteProduct());
        view.addDeleteVariantListener(e -> handleDeleteVariant());
        view.addAddVariantListener(e -> handleAddVariant());
        view.addBackListener(e -> {
            view.dispose();
            new org.example.Feature.Home.HomeController();
        });
        setupTableImagePicker();
    }

    // 4. lay thong tin san pham can sua
    private void handleSearch() {
        String productId = view.getProductId();
        if (productId.isEmpty()) {
            view.showError("Vui lòng nhập ID sản phẩm!");
            return;
        }

        view.setFormEnabled(false);

        ApiCaller.callApi(ProductEditApi.RequestBuilder.getProductById(productId),
                new ApiCaller.Listening<ProductDTO>() {
                    @Override
                    public void onSuccess(MyResponse<ProductDTO> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            if (res.getData() != null) {
                                currentProduct = res.getData();
                                populateForm(currentProduct);
                                view.showMessage("Đã tải thông tin sản phẩm!");
                            } else {
                                view.showError("Không tìm thấy sản phẩm!");
                            }
                        });
                    }

                    @Override
                    public void onError(MyResponse<?> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            view.showError("Lỗi tìm kiếm: " + (res != null ? res.getMessage() : "Unknown"));
                        });
                    }
                });
    }

    // 5. do du lieu cu vao form
    private void populateForm(ProductDTO product) {
        ProductDetailDTO detail = product.getProductDetailDTO();
        if (detail == null)
            return;

        // Fill basic info
        view.setProductId(String.valueOf(detail.getProductId()));
        view.setProductName(detail.getProductName());
        view.setDescription(detail.getDescription());
        view.setOriginalPrice(detail.getOriginalPrice() != null ? detail.getOriginalPrice() : "0");
        view.setPrice(detail.getPrice() != null ? detail.getPrice() : "0");

        // Set category and brand - FIX: Convert UUID to String
        if (detail.getCategoryId() != null) {
            view.setSelectedCategory(detail.getCategoryId().toString());
        }
        if (detail.getBrandId() != null) {
            view.setSelectedBrand(detail.getBrandId().toString());
        }

        // Load main image
        if (detail.getImageUrl() != null && !detail.getImageUrl().isEmpty()) {
            loadImageFromUrl(detail.getImageUrl(), view.getImagePreviewLabel());
        }

        // Populate variants table
        populateVariantsTable(product);
    }

    private void populateVariantsTable(ProductDTO product) {
        view.getVariantTableModel().setRowCount(0);
        variantImagesMap.clear();

        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            return;
        }

        Map<String, List<String>> variantAttributesMap = buildVariantAttributesMap(product);

        for (VariantDTO variant : product.getVariants()) {
            String variantId = variant.getVariantId();
            List<String> attrValues = variantAttributesMap.getOrDefault(variantId, new ArrayList<>());
            String variantName = String.join(" - ", attrValues);

            view.getVariantTableModel().addRow(new Object[] {
                    variantId,
                    variantName,
                    variant.getOriginalPrice() != null ? variant.getOriginalPrice() : "0",
                    variant.getPrice() != null ? variant.getPrice() : "0",
                    variant.getStock(),
                    variant.getImageUrl() != null ? variant.getImageUrl() : ""
            });
        }
    }

    private void handleUploadMainImage() {
        File file = chooseImageFile(view); // Use inherited
        if (file != null) {
            selectedMainImage = file;
            try {
                Image image = ImageIO.read(file);
                view.setImagePreview(new ImageIcon(image));
                view.showMessage("Đã chọn ảnh chính: " + file.getName());
            } catch (Exception e) {
                view.showError("Không thể đọc ảnh: " + e.getMessage());
            }
        }
    }

    private void setupTableImagePicker() {
        view.getTblVariants().addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                int row = view.getTblVariants().getSelectedRow();
                int col = view.getTblVariants().getSelectedColumn();

                // Column 5 is image path
                if (col == 5) {
                    File file = chooseImageFile(view); // Use inherited
                    if (file != null) {
                        view.getVariantTableModel().setValueAt(file.getAbsolutePath(), row, col);
                        view.showMessage("Đã chọn ảnh cho dòng " + (row + 1));
                    }
                }
            }
        });
    }

    private void handleUpdateVariants() {
        if (currentProduct == null) {
            view.showError("Vui lòng tìm kiếm sản phẩm trước!");
            return;
        }

        List<VariantDTO> variantsToUpdate = buildVariantsFromTable();
        view.setFormEnabled(false);

        new Thread(() -> {
            int successCount = 0;
            boolean hasError = false;

            for (VariantDTO variant : variantsToUpdate) {
                File imgFile = variantImagesMap.get(variant.getVariantId());
                try {
                    var call = ProductEditApi.RequestBuilder.updateVariant(variant, imgFile);
                    if (call == null)
                        continue;

                    var response = call.execute();
                    if (response.isSuccessful() && response.body() != null
                            && Boolean.TRUE.equals(response.body().getSuccess())) {
                        successCount++;
                    } else {
                        hasError = true;
                    }
                } catch (Exception e) {
                    hasError = true;
                }
            }

            final int finalSuccess = successCount;
            final boolean finalError = hasError;

            javax.swing.SwingUtilities.invokeLater(() -> {
                view.setFormEnabled(true);
                if (!finalError) {
                    view.showMessage("Cập nhật thành công " + finalSuccess + " biến thể!");
                    handleSearch();
                } else {
                    view.showError("Cập nhật hoàn tất nhưng có lỗi ở một số biến thể.");
                }
            });
        }).start();
    }

    // 6. luu san pham sau khi sua
    private void handleSaveProduct() {
        if (currentProduct == null) {
            view.showError("Chưa tải sản phẩm!");
            return;
        }

        if (view.getProductName().isEmpty()) {
            view.showError("Tên sản phẩm trống!");
            return;
        }

        // Validate prices are entered but don't parse to Double here
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

        // Build updated product
        ProductDetailDTO detailDTO = ProductDetailDTO.builder()
                .productId(UUID.fromString(view.getShowId()))
                .productName(view.getProductName())
                .description(view.getDescription())
                .categoryId(view.getSelectedCategory().getCategoryId())
                .brandId(view.getSelectedBrand().getBrandId())
                .originalPrice(view.getOriginalPrice())
                .price(view.getPrice())
                .build();

        List<VariantDTO> updatedVariants = buildVariantsFromTable();

        ProductDTO productDTO = ProductDTO.builder()
                .productDetailDTO(detailDTO)
                .attributes(currentProduct.getAttributes())
                .variants(updatedVariants)
                .variantValues(currentProduct.getVariantValues())
                .build();

        view.setFormEnabled(false);

        ApiCaller.callApi(
                ProductEditApi.RequestBuilder.updateProduct(productDTO, selectedMainImage, variantImagesMap),
                new ApiCaller.Listening<ProductDTO>() {
                    @Override
                    public void onSuccess(MyResponse<ProductDTO> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            view.showMessage("Cập nhật sản phẩm thành công!");
                            selectedMainImage = null;
                            variantImagesMap.clear();
                        });
                    }

                    @Override
                    public void onError(MyResponse<?> res) {
                        SwingUtilities.invokeLater(() -> {
                            view.setFormEnabled(true);
                            view.showError("Lỗi cập nhật: " + (res != null ? res.getMessage() : "Unknown"));
                        });
                    }
                });
    }

    private List<VariantDTO> buildVariantsFromTable() {
        List<VariantDTO> variants = new ArrayList<>();
        variantImagesMap.clear();

        for (int i = 0; i < view.getVariantTableModel().getRowCount(); i++) {
            String variantId = view.getVariantTableModel().getValueAt(i, 0).toString();
            String vOrg = view.getVariantTableModel().getValueAt(i, 2).toString();
            String vPrice = view.getVariantTableModel().getValueAt(i, 3).toString();
            Integer vStock = parseInt(view.getVariantTableModel().getValueAt(i, 4), 0); // Use inherited
            String imgPath = view.getVariantTableModel().getValueAt(i, 5).toString().trim();

            // Find original variant to get existing imageUrl
            String existingImageUrl = null;
            if (currentProduct != null && currentProduct.getVariants() != null) {
                for (VariantDTO oldVariant : currentProduct.getVariants()) {
                    if (oldVariant.getVariantId().equals(variantId)) {
                        existingImageUrl = oldVariant.getImageUrl();
                        break;
                    }
                }
            }

            VariantDTO variant = VariantDTO.builder()
                    .variantId(variantId)
                    .imageName(variantId)
                    .originalPrice(vOrg)
                    .price(vPrice)
                    .stock(vStock)
                    .sold(0)
                    .imageUrl(existingImageUrl) // Keep existing imageUrl
                    .active(true)
                    .build();

            variants.add(variant);

            // Check if new image selected
            if (!imgPath.isEmpty() && !imgPath.startsWith("http")) {
                File imgFile = new File(imgPath);
                if (imgFile.exists() && imgFile.isFile()) {
                    variantImagesMap.put(variantId, imgFile);
                }
            }
        }

        return variants;
    }

    private void handleDeleteProduct() {
        if (currentProduct == null) {
            view.showError("Chưa có sản phẩm nào được chọn!");
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(view,
                "Bạn có chắc chắn muốn xóa sản phẩm này?\nHành động này không thể hoàn tác!",
                "Xác nhận xóa sản phẩm",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.WARNING_MESSAGE);

        if (confirm == JOptionPane.YES_OPTION) {
            view.setFormEnabled(false);

            // Extract public_id from imageUrl if available
            // Cloudinary public_id format: folder/filename (without extension)
            String publicId = extractCloudinaryPublicId(currentProduct.getProductDetailDTO().getImageUrl());

            ApiCaller.callApi(
                    ProductEditApi.RequestBuilder
                            .deleteProduct(
                                    currentProduct.getProductDetailDTO().getProductId().toString(),
                                    publicId),
                    new ApiCaller.Listening<Void>() {
                        @Override
                        public void onSuccess(MyResponse<Void> res) {
                            SwingUtilities.invokeLater(() -> {
                                view.setFormEnabled(true);
                                view.showMessage("Đã xóa sản phẩm thành công!");
                                view.clearForm();
                                currentProduct = null;
                            });
                        }

                        @Override
                        public void onError(MyResponse<?> res) {
                            SwingUtilities.invokeLater(() -> {
                                view.setFormEnabled(true);
                                view.showError("Lỗi xóa sản phẩm: " + (res != null ? res.getMessage() : "Unknown"));
                            });
                        }
                    });
        }
    }

    private void handleDeleteVariant() {
        int selectedRow = view.getTblVariants().getSelectedRow();
        if (selectedRow < 0) {
            view.showError("Vui lòng chọn biến thể cần xóa!");
            return;
        }

        String variantId = view.getVariantTableModel().getValueAt(selectedRow, 0).toString();

        int confirm = JOptionPane.showConfirmDialog(view,
                "Bạn có chắc chắn muốn xóa biến thể này?",
                "Xác nhận xóa biến thể",
                JOptionPane.YES_NO_OPTION);

        if (confirm == JOptionPane.YES_OPTION) {
            ApiCaller.callApi(
                    ProductEditApi.RequestBuilder.deleteVariant(variantId),
                    new ApiCaller.Listening<Void>() {
                        @Override
                        public void onSuccess(MyResponse<Void> res) {
                            SwingUtilities.invokeLater(() -> {
                                view.getVariantTableModel().removeRow(selectedRow);
                                view.showMessage("Đã xóa biến thể!");
                            });
                        }

                        @Override
                        public void onError(MyResponse<?> res) {
                            SwingUtilities.invokeLater(() -> {
                                view.showError("Lỗi xóa biến thể: " + (res != null ? res.getMessage() : "Unknown"));
                            });
                        }
                    });
        }
    }

    private void handleAddVariant() {
        if (currentProduct == null) {
            view.showError("Chưa tải sản phẩm!");
            return;
        }

        AddVariantDialog dialog = new AddVariantDialog(view, currentProduct.getAttributes());
        dialog.setVisible(true);

        if (dialog.isConfirmed()) {
            VariantDTO newVariant = dialog.getCreatedVariant();
            Map<UUID, String> attrValues = dialog.getAttributeValues();
            File imageFile = dialog.getSelectedImage();

            // Prepare data for API
            UUID newVariantId = UUID.randomUUID();
            newVariant.setVariantId(newVariantId.toString());
            newVariant.setImageName(newVariantId.toString());

            List<VariantValueDTO> newVariantValues = new ArrayList<>();

            for (Map.Entry<UUID, String> entry : attrValues.entrySet()) {
                UUID attrId = entry.getKey();
                String valText = entry.getValue();

                AttributeDTO schemaAttr = currentProduct.getAttributes().stream()
                        .filter(a -> a.getAttributeId().equals(attrId))
                        .findFirst().orElse(null);

                if (schemaAttr != null) {
                    String valueId = null;
                    if (schemaAttr.getAttributeValues() != null) {
                        for (AttributeValueDTO valDTO : schemaAttr.getAttributeValues()) {
                            if (valDTO.getAttributeValueName().equalsIgnoreCase(valText)) {
                                valueId = valDTO.getAttributeValueId();
                                break;
                            }
                        }
                    }

                    if (valueId == null)
                        valueId = UUID.randomUUID().toString();

                    VariantValueDTO vv = VariantValueDTO.builder()
                            .variantId(newVariantId.toString())
                            .attributeValueId(valueId)
                            .build();
                    newVariantValues.add(vv);
                }
            }

            ProductDTO payload = currentProduct;
            if (payload.getVariants() == null)
                payload.setVariants(new ArrayList<>());
            payload.getVariants().add(newVariant);

            if (payload.getVariantValues() == null)
                payload.setVariantValues(new ArrayList<>());
            payload.getVariantValues().addAll(newVariantValues);

            Map<String, File> images = new HashMap<>();
            if (imageFile != null) {
                images.put(newVariantId.toString(), imageFile);
            }

            view.setFormEnabled(false);
            ApiCaller.callApi(
                    ProductEditApi.RequestBuilder.createVariant(payload, images),
                    new ApiCaller.Listening<ProductDTO>() {
                        @Override
                        public void onSuccess(MyResponse<ProductDTO> res) {
                            SwingUtilities.invokeLater(() -> {
                                view.setFormEnabled(true);
                                view.showMessage("Thêm biến thể thành công!");
                                handleSearch();
                            });
                        }

                        @Override
                        public void onError(MyResponse<?> res) {
                            SwingUtilities.invokeLater(() -> {
                                view.setFormEnabled(true);
                                view.showError("Lỗi thêm biến thể: " + (res != null ? res.getMessage() : "Unknown"));
                            });
                        }
                    });
        }
    }
}