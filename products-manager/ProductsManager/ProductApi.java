package org.example.Feature.ProductsManager;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import org.example.API.ApiClient;
import org.example.API.ListResponse;
import org.example.API.MyResponse;
import org.example.Feature.CatalogManager.DTO.BrandDTO;
import org.example.Feature.CatalogManager.DTO.CategoryDTO;
import org.example.Feature.ProductsManager.DTO.AttributeDTO;
import org.example.Feature.ProductsManager.DTO.ProductDTO;
import retrofit2.Call;
import retrofit2.http.*;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public interface ProductApi {

        @GET("/categories")
        Call<MyResponse<ListResponse<CategoryDTO>>> getCategories();

        @GET("/brands")
        Call<MyResponse<ListResponse<BrandDTO>>> getBrands();

        @GET("/attributes")
        Call<MyResponse<ListResponse<AttributeDTO>>> getAttributes();

        @GET("/admin/products/{id}")
        Call<MyResponse<ProductDTO>> getProductById(@Path("id") String productId);

        // ===== CREATE PRODUCT =====
        @Multipart
        @POST("/admin/products")
        Call<MyResponse<ProductDTO>> createProduct(
                        @Part("productDTO") RequestBody productDTO, // ✅ Đã sửa từ productDetailDTO thành productDTO
                        @Part MultipartBody.Part productImage,
                        @Part List<MultipartBody.Part> variantImages);

        // ===== UPDATE PRODUCT =====
        @Multipart
        @PUT("/admin/products")
        Call<MyResponse<ProductDTO>> updateProduct(
                        @Part("productDTO") RequestBody productDTO, // ✅ Đã sửa từ productDetailDTO thành productDTO
                        @Part MultipartBody.Part productImage,
                        @Part List<MultipartBody.Part> variantImages);

        // ===== UPDATE VARIANTS ONLY =====
        @Multipart
        @PUT("/admin/products/variants")
        Call<MyResponse<ProductDTO>> updateVariants(
                        @Part("productDTO") RequestBody productDTO,
                        @Part List<MultipartBody.Part> variantImages);

        // ===== CREATE SINGLE VARIANT =====
        @Multipart
        @POST("/admin/products/variants")
        Call<MyResponse<ProductDTO>> createVariant(
                        @Part("productDTO") RequestBody productDTO,
                        @Part List<MultipartBody.Part> variantImages);

        // ===== DELETE PRODUCT =====
        @DELETE("/admin/products/{productId}")
        Call<MyResponse<Void>> deleteProduct(
                        @Path("productId") String productId,
                        @Query("public_id") String publicId);

        // ===== DELETE VARIANT =====
        @DELETE("/admin/products/variants/{variantId}")
        Call<MyResponse<Void>> deleteVariant(@Path("variantId") String variantId);

        // ===== HELPER CLASS =====
        class RequestBuilder {

                // CREATE Product
                public static Call<MyResponse<ProductDTO>> createProduct(
                                ProductDTO productDTO,
                                File mainImage,
                                Map<String, File> variantImages) {
                        ProductApi api = ApiClient.getInstance().create(ProductApi.class);
                        return buildMultipartRequest(api::createProduct, productDTO, mainImage, variantImages);
                }

                // UPDATE Product
                public static Call<MyResponse<ProductDTO>> updateProduct(
                                ProductDTO productDTO,
                                File mainImage,
                                Map<String, File> variantImages) {
                        ProductApi api = ApiClient.getInstance().create(ProductApi.class);
                        return buildMultipartRequest(api::updateProduct, productDTO, mainImage, variantImages);
                }

                // Common logic để build multipart request
                public static Call<MyResponse<ProductDTO>> buildMultipartRequest(
                                MultipartRequestFunc requestFunc,
                                ProductDTO productDTO,
                                File mainImage,
                                Map<String, File> variantImages) {
                        // 1. Convert ProductDTO to JSON using Jackson
                        String json = "{}";
                        try {
                                ObjectMapper mapper = new ObjectMapper();
                                json = mapper.writeValueAsString(productDTO);
                        } catch (Exception e) {
                                e.printStackTrace();
                                throw new RuntimeException("Lỗi convert ProductDTO sang JSON: " + e.getMessage());
                        }

                        RequestBody productDTOBody = RequestBody.create(
                                        MediaType.parse("application/json"),
                                        json);

                        // 2. Main image
                        MultipartBody.Part mainImagePart = null;
                        if (mainImage != null && mainImage.exists()) {
                                RequestBody imageBody = RequestBody.create(
                                                MediaType.parse("image/*"),
                                                mainImage);
                                mainImagePart = MultipartBody.Part.createFormData(
                                                "productImage",
                                                mainImage.getName(),
                                                imageBody);
                        }

                        // 3. Variant images
                        List<MultipartBody.Part> variantImageParts = new ArrayList<>();
                        if (variantImages != null) {
                                for (Map.Entry<String, File> entry : variantImages.entrySet()) {
                                        File file = entry.getValue();
                                        if (file != null && file.exists()) {
                                                RequestBody imageBody = RequestBody.create(
                                                                MediaType.parse("image/*"),
                                                                file);
                                                MultipartBody.Part part = MultipartBody.Part.createFormData(
                                                                entry.getKey(),
                                                                file.getName(),
                                                                imageBody);
                                                variantImageParts.add(part);
                                        }
                                }
                        }

                        return requestFunc.execute(productDTOBody, mainImagePart, variantImageParts);
                }

                @FunctionalInterface
                public interface MultipartRequestFunc {
                        Call<MyResponse<ProductDTO>> execute(
                                        RequestBody productDTO,
                                        MultipartBody.Part productImage,
                                        List<MultipartBody.Part> variantImages);
                }
        }
}
