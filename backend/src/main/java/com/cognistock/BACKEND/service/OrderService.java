package com.cognistock.backend.service;

import com.cognistock.backend.dto.request.OrderRequest;
import com.cognistock.backend.dto.response.OrderResponse;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.OrderItem;
import com.cognistock.backend.exception.ResourceNotFoundException;
import com.cognistock.backend.mapper.OrderMapper;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final OrderMapper orderMapper;

    public List<OrderResponse> getAllOrders() {
        log.info("Fetching all orders");
        return orderRepository.findAll()
                .stream()
                .map(orderMapper::toResponse)
                .toList();
    }

    public OrderResponse getById(Long id) {
        log.info("Fetching order with id: {}", id);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        return orderMapper.toResponse(order);
    }

    public OrderResponse create(OrderRequest request) {
        log.info("Creating order for supplier: {}", request.getSupplierId());

        Order order = new Order();
        order.setOrderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setStatus(Order.OrderStatus.PENDING);
        order.setNotes(request.getNotes());
        order.setSupplier(
            supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", request.getSupplierId()))
        );

        List<OrderItem> items = request.getItems().stream().map(itemReq -> {
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(
                productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", itemReq.getProductId()))
            );
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(itemReq.getUnitPrice());
            return item;
        }).toList();

        order.setItems(items);
        return orderMapper.toResponse(orderRepository.save(order));
    }

    public OrderResponse updateStatus(Long id, Order.OrderStatus status) {
        log.info("Updating order {} status to {}", id, status);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", id));
        order.setStatus(status);
        return orderMapper.toResponse(orderRepository.save(order));
    }

    public void delete(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order", "id", id);
        }
        orderRepository.deleteById(id);
        log.info("Order deleted with id: {}", id);
    }
}