package com.cognistock.backend.service;

import com.cognistock.backend.dto.request.ProductRequest;
import com.cognistock.backend.dto.response.ProductResponse;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.exception.BusinessException;
import com.cognistock.backend.exception.ResourceNotFoundException;
import com.cognistock.backend.mapper.ProductMapper;
import com.cognistock.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    public List<ProductResponse> getAllProducts() {
        log.info("Fetching all products");
        return productRepository.findAll()
                .stream()
                .map(productMapper::toResponse)
                .toList();
    }

    public ProductResponse getById(Long id) {
        log.info("Fetching product with id: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return productMapper.toResponse(product);
    }

    public ProductResponse create(ProductRequest request) {
        log.info("Creating product with SKU: {}", request.getSku());
        if (productRepository.existsBySku(request.getSku())) {
            throw new BusinessException("Product with SKU '" + request.getSku() + "' already exists");
        }
        Product product = productMapper.toEntity(request);
        Product saved = productRepository.save(product);
        log.info("Product created with id: {}", saved.getId());
        return productMapper.toResponse(saved);
    }

    public ProductResponse update(Long id, ProductRequest request) {
        log.info("Updating product with id: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        productMapper.updateEntity(request, product);
        Product saved = productRepository.save(product);
        log.info("Product updated with id: {}", saved.getId());
        return productMapper.toResponse(saved);
    }

    public void delete(Long id) {
        log.info("Deleting product with id: {}", id);
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", "id", id);
        }
        productRepository.deleteById(id);
        log.info("Product deleted with id: {}", id);
    }
}