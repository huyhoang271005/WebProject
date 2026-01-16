// File: ProductEditApi.java
package org.example.Feature.ProductsManager.Edit;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import org.example.API.ApiClient;
import org.example.API.MyResponse;
import org.example.Feature.ProductsManager.DTO.ProductDTO;
import org.example.Feature.ProductsManager.DTO.VariantDTO;
import retrofit2.Call;
import retrofit2.http.*;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public interface ProductEditApi {

    @GET("/admin/products/{id}")
    Call<MyResponse<ProductDTO>> getProductById(@Path("id") String productId);

    // API với image (có ảnh mới)
    @Multipart
    @PUT("/admin/products")
    Call<MyResponse<ProductDTO>> updateProductWithImage(
            @Part("productDetailDTO") RequestBody productDetailDTO,
            @Part MultipartBody.Part image);

    // API không có image (giữ nguyên ảnh cũ)
    @Multipart
    @PUT("/admin/products")
    Call<MyResponse<ProductDTO>> updateProductNoImage(
            @Part("productDetailDTO") RequestBody productDetailDTO);

    // API update variant với image
    @Multipart
    @PUT("/admin/products/variants")
    Call<MyResponse<ProductDTO>> updateSingleVariantWithImage(
            @Part("variantDTO") RequestBody variantDTO,
            @Part MultipartBody.Part image);

    // API update variant không có image
    @Multipart
    @PUT("/admin/products/variants")
    Call<MyResponse<ProductDTO>> updateSingleVariantNoImage(
            @Part("variantDTO") RequestBody variantDTO);

    class RequestBuilder {
        private static final ObjectMapper mapper = new ObjectMapper();

        public static Call<MyResponse<ProductDTO>> getProductById(String productId) {
            ProductEditApi api = ApiClient.getInstance().create(ProductEditApi.class);
            return api.getProductById(productId);
        }

        public static Call<MyResponse<ProductDTO>> updateVariant(VariantDTO dto, File imageFile) {
            ProductEditApi api = ApiClient.getInstance().create(ProductEditApi.class);
            try {
                String json = mapper.writeValueAsString(dto);
                RequestBody variantBody = RequestBody.create(MediaType.parse("application/json"), json);

                // Nếu có file ảnh mới
                if (imageFile != null && imageFile.exists()) {
                    MultipartBody.Part imagePart = MultipartBody.Part.createFormData(
                            "image",
                            imageFile.getName(),
                            RequestBody.create(MediaType.parse("image/*"), imageFile));
                    return api.updateSingleVariantWithImage(variantBody, imagePart);
                } else {
                    // Không có ảnh mới - không gửi part image
                    return api.updateSingleVariantNoImage(variantBody);
                }
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        }

        public static Call<MyResponse<ProductDTO>> updateProduct(
                ProductDTO dto,
                File mainImage,
                Map<String, File> variantImagesMap) {
            ProductEditApi api = ApiClient.getInstance().create(ProductEditApi.class);
            try {
                String json = mapper.writeValueAsString(dto.getProductDetailDTO());
                RequestBody detailBody = RequestBody.create(MediaType.parse("application/json"), json);

                // Nếu có ảnh chính mới
                if (mainImage != null && mainImage.exists()) {
                    MultipartBody.Part imagePart = MultipartBody.Part.createFormData(
                            "image",
                            mainImage.getName(),
                            RequestBody.create(MediaType.parse("image/*"), mainImage));
                    return api.updateProductWithImage(detailBody, imagePart);
                } else {
                    // Không có ảnh mới - không gửi part image
                    return api.updateProductNoImage(detailBody);
                }
            } catch (Exception e) {
                e.printStackTrace();
                e.printStackTrace();
                return null;
            }
        }

        public static Call<MyResponse<Void>> deleteProduct(String productId, String publicId) {
            org.example.Feature.ProductsManager.ProductApi api = ApiClient.getInstance()
                    .create(org.example.Feature.ProductsManager.ProductApi.class);
            return api.deleteProduct(productId, publicId);
        }

        public static Call<MyResponse<Void>> deleteVariant(String variantId) {
            org.example.Feature.ProductsManager.ProductApi api = ApiClient.getInstance()
                    .create(org.example.Feature.ProductsManager.ProductApi.class);
            return api.deleteVariant(variantId);
        }

        public static Call<MyResponse<ProductDTO>> createVariant(
                ProductDTO productDTO,
                Map<String, File> variantImages) {
            org.example.Feature.ProductsManager.ProductApi api = ApiClient.getInstance()
                    .create(org.example.Feature.ProductsManager.ProductApi.class);

            try {
                // 1. Serialize ProductDTO
                String json = mapper.writeValueAsString(productDTO);
                RequestBody productDTOBody = RequestBody.create(MediaType.parse("application/json"), json);

                // 2. Build image parts
                List<MultipartBody.Part> imageParts = new ArrayList<>();
                if (variantImages != null) {
                    for (Map.Entry<String, File> entry : variantImages.entrySet()) {
                        File file = entry.getValue();
                        if (file != null && file.exists()) {
                            RequestBody imageBody = RequestBody.create(MediaType.parse("image/*"), file);
                            MultipartBody.Part part = MultipartBody.Part.createFormData(
                                    entry.getKey(), // This should be the variantId or key expected by backend
                                    file.getName(),
                                    imageBody);
                            imageParts.add(part);
                        }
                    }
                }

                return api.createVariant(productDTOBody, imageParts);
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        }
    }
}