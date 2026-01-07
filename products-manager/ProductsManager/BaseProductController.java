package org.example.Feature.ProductsManager;

import org.example.API.ApiCaller;
import org.example.API.ApiClient;
import org.example.API.ListResponse;
import org.example.API.MyResponse;
import org.example.Feature.CatalogManager.DTO.BrandDTO;
import org.example.Feature.CatalogManager.DTO.CategoryDTO;

import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.*;
import java.io.File;
import java.util.List;
import java.util.function.Consumer;

public abstract class BaseProductController {
    protected final ProductApi productApi;

    public BaseProductController() {
        this.productApi = ApiClient.getInstance().create(ProductApi.class);
    }

    /**
     * Load categories from API
     */
    protected void loadCategories(Consumer<List<CategoryDTO>> onSuccess, Consumer<String> onError) {
        ApiCaller.callApi(productApi.getCategories(), new ApiCaller.Listening<ListResponse<CategoryDTO>>() {
            @Override
            public void onSuccess(MyResponse<ListResponse<CategoryDTO>> res) {
                if (res.getData() != null && res.getData().getListData() != null) {
                    SwingUtilities.invokeLater(() -> onSuccess.accept(res.getData().getListData()));
                }
            }

            @Override
            public void onError(MyResponse<?> res) {
                String msg = (res != null ? res.getMessage() : "Unknown Error");
                SwingUtilities.invokeLater(() -> onError.accept(msg));
            }
        });
    }

    /**
     * Load brands from API
     */
    protected void loadBrands(Consumer<List<BrandDTO>> onSuccess, Consumer<String> onError) {
        ApiCaller.callApi(productApi.getBrands(), new ApiCaller.Listening<ListResponse<BrandDTO>>() {
            @Override
            public void onSuccess(MyResponse<ListResponse<BrandDTO>> res) {
                if (res.getData() != null && res.getData().getListData() != null) {
                    SwingUtilities.invokeLater(() -> onSuccess.accept(res.getData().getListData()));
                }
            }

            @Override
            public void onError(MyResponse<?> res) {
                String msg = (res != null ? res.getMessage() : "Unknown Error");
                SwingUtilities.invokeLater(() -> onError.accept(msg));
            }
        });
    }

    /**
     * Open FileChooser to pick an image
     */
    protected File chooseImageFile(Component parent) {
        JFileChooser chooser = new JFileChooser();
        chooser.setFileFilter(new FileNameExtensionFilter("Ảnh (JPG, PNG)", "jpg", "png", "jpeg"));
        if (chooser.showOpenDialog(parent) == JFileChooser.APPROVE_OPTION) {
            return chooser.getSelectedFile();
        }
        return null;
    }

    /**
     * Safe Double parser
     */
    protected Double parseDouble(Object o, Double def) {
        try {
            if (o == null)
                return def;
            return Double.parseDouble(o.toString());
        } catch (Exception e) {
            return def;
        }
    }

    /**
     * Safe Integer parser
     */
    protected Integer parseInt(Object o, Integer def) {
        try {
            if (o == null)
                return def;
            return Integer.parseInt(o.toString());
        } catch (Exception e) {
            return def;
        }
    }

    /**
     * Helper: Format Double to String (remove .0 if whole number)
     */
    protected String formatDouble(Double d) {
        if (d == null)
            return "0";
        if (d == Math.floor(d)) {
            return String.valueOf(d.longValue());
        }
        return String.valueOf(d);
    }

    /**
     * Helper: Extract Public ID from Cloudinary URL
     */
    protected String extractCloudinaryPublicId(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty())
            return null;
        try {
            int uploadIndex = imageUrl.indexOf("/upload/");
            if (uploadIndex != -1) {
                String afterUpload = imageUrl.substring(uploadIndex + "/upload/".length());
                if (afterUpload.startsWith("v")) {
                    int slashIndex = afterUpload.indexOf("/");
                    if (slashIndex != -1) {
                        afterUpload = afterUpload.substring(slashIndex + 1);
                    }
                }
                int lastDot = afterUpload.lastIndexOf(".");
                if (lastDot != -1) {
                    return afterUpload.substring(0, lastDot);
                }
                return afterUpload;
            }
        } catch (Exception e) {
            return imageUrl;
        }
        return imageUrl;
    }

    /**
     * Helper: Build Variant Attributes Map
     */
    protected java.util.Map<String, java.util.List<String>> buildVariantAttributesMap(
            org.example.Feature.ProductsManager.DTO.ProductDTO product) {
        java.util.Map<String, java.util.List<String>> result = new java.util.HashMap<>();

        if (product.getVariantValues() == null || product.getAttributes() == null) {
            return result;
        }

        java.util.Map<String, String> valueIdToNameMap = new java.util.HashMap<>();
        for (org.example.Feature.ProductsManager.DTO.AttributeDTO attr : product.getAttributes()) {
            if (attr.getAttributeValues() != null) {
                for (org.example.Feature.ProductsManager.DTO.AttributeValueDTO val : attr.getAttributeValues()) {
                    valueIdToNameMap.put(val.getAttributeValueId(), val.getAttributeValueName());
                }
            }
        }

        for (org.example.Feature.ProductsManager.DTO.VariantValueDTO vv : product.getVariantValues()) {
            String variantId = vv.getVariantId();
            String valueName = valueIdToNameMap.get(vv.getAttributeValueId());

            if (valueName != null) {
                result.computeIfAbsent(variantId, k -> new java.util.ArrayList<>()).add(valueName);
            }
        }
        return result;
    }

    /**
     * Helper: Load Image from URL and set to Label
     */
    protected void loadImageFromUrl(String imageUrl, JLabel targetLabel) {
        try {
            java.net.URL url = new java.net.URL(imageUrl);
            java.awt.Image image = javax.imageio.ImageIO.read(url);
            if (image != null) {
                targetLabel.setIcon(new ImageIcon(image));
            }
        } catch (Exception e) {
            System.err.println("Không thể load ảnh: " + e.getMessage());
        }
    }
}
