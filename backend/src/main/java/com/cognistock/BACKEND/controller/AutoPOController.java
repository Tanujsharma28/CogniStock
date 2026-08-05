package com.cognistock.backend.controller;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SupplierRepository;
import com.cognistock.backend.service.AIDecisionLogService;
import com.cognistock.backend.service.AIEmailService;
import com.cognistock.backend.service.SupplierScoringService;

@RestController
@RequestMapping("/api/auto-po")
public class AutoPOController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private SupplierScoringService supplierScoringService;

    @Autowired
    private AIEmailService aiEmailService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private AIDecisionLogService decisionLogService;

    @GetMapping("/generate/{productId}")
    public ResponseEntity<Object> generatePO(@PathVariable Long productId) {

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Product nahi mila");
        }

        List<Supplier> suppliers = supplierRepository.findAll();
        if (suppliers.isEmpty()) {
            return ResponseEntity.badRequest().body("Koi supplier nahi mila");
        }

        Supplier bestSupplier = supplierScoringService.findBestSupplier(suppliers);

        int reorderQuantity = (product.getReorderThreshold() * 3) - product.getStockQuantity();
        if (reorderQuantity < 10) reorderQuantity = 30;

        String emailDraft = aiEmailService.generatePurchaseOrderEmail(
            product.getName(),
            reorderQuantity,
            bestSupplier.getName(),
            bestSupplier.getDeliveryDays(),
            bestSupplier.getPricePerUnit()
        );

        double confidence = Math.min(95, 60 + (reorderQuantity > product.getReorderThreshold() ? 20 : 0));

        decisionLogService.log(
            "Procurement Agent",
            "REORDER",
            String.format("Order %d units of %s from %s", reorderQuantity, product.getName(), bestSupplier.getName()),
            String.format("Stock (%d) is below/near reorder threshold (%d). %s offers best delivery/price balance.",
                product.getStockQuantity(), product.getReorderThreshold(), bestSupplier.getName()),
            confidence,
            productId,
            null,
            String.format("Prevents stockout, ~%d units restocked", reorderQuantity)
        );

        return ResponseEntity.ok(Map.of(
            "product", product.getName(),
            "recommendedSupplier", bestSupplier.getName(),
            "recommendedQuantity", reorderQuantity,
            "emailDraft", emailDraft,
            "confidenceScore", confidence,
            "confidenceLabel", AIDecisionLogService.labelFor(confidence)
        ));
    }

    @PostMapping("/confirm/{productId}")
    public ResponseEntity<Object> confirmOrder(@PathVariable Long productId) {

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Product not found");
        }

        List<Supplier> suppliers = supplierRepository.findAll();
        if (suppliers.isEmpty()) {
            return ResponseEntity.badRequest().body("No suppliers found");
        }

        Supplier bestSupplier = supplierScoringService.findBestSupplier(suppliers);

        int reorderQuantity = (product.getReorderThreshold() * 3) - product.getStockQuantity();
        if (reorderQuantity < 10) reorderQuantity = 30;

        Order order = new Order();
        order.setProduct(product);
        order.setSupplier(bestSupplier);
        order.setQuantity(reorderQuantity);
        order.setAiGenerated(true);
        orderRepository.save(order);

        return ResponseEntity.ok(order);
    }
}