package com.cognistock.backend.config;

import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.OrderItem;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Component
@org.springframework.core.annotation.Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final OrderRepository orderRepository;
    private final SalesRecordRepository salesRecordRepository;

    private static final String SEED_MARKER = "DEMO_SEED_V1";

    @Override
    public void run(String... args) throws Exception {
        log.info("=== DemoDataSeeder starting ===");
        seedProducts();
        seedSuppliers();
        seedOrders();
        seedSalesRecords();
        seedRecentDays();
        log.info("=== DemoDataSeeder complete ===");
    }

    // ─────────────────────────────────────────
    // 1. PRODUCTS
    // ─────────────────────────────────────────
    private void seedProducts() {
        List<Object[]> products = List.of(
            // sku, name, stock, threshold, price
            new Object[]{"SKU-1042", "Bluetooth Speaker",          1,  15, 2999.0},
            new Object[]{"SKU-9067", "Noise Cancelling Headphones",2,  12, 8999.0},
            new Object[]{"SKU-4087", "Mechanical Keyboard",        8,  10, 4999.0},
            new Object[]{"SKU-3012", "USB-C Hub 7-in-1",          10,  15, 2499.0},
            new Object[]{"SKU-2091", "USB-C Cable",               85,  20,  199.0},
            new Object[]{"SKU-5023", "Gaming Mouse",              62,  25, 1799.0},
            new Object[]{"SKU-6034", "Webcam 1080p",              35,  10, 3299.0},
            new Object[]{"SKU-3310", "Power Bank 10000mAh",       22,  25, 1299.0},
            new Object[]{"SKU-2041", "Wireless Earbuds",          45,  20, 1299.0},
            new Object[]{"SKU-7091", "Portable SSD 1TB",           5,   8, 7499.0}
        );

        int skipped = 0, created = 0;
        for (Object[] p : products) {
            String sku = (String) p[0];
            if (productRepository.findBySku(sku).isPresent()) {
                skipped++;
                continue;
            }
            Product product = new Product();
            product.setSku(sku);
            product.setName((String) p[1]);
            product.setStockQuantity((Integer) p[2]);
            product.setReorderThreshold((Integer) p[3]);
            product.setPrice((Double) p[4]);
            productRepository.save(product);
            created++;
        }
        log.info("Products → created: {}, skipped: {}", created, skipped);
    }

    // ─────────────────────────────────────────
    // 2. SUPPLIERS  (upsert — fill null fields only)
    // ─────────────────────────────────────────
    private void seedSuppliers() {
        List<Object[]> suppliers = List.of(
            // name, contactPerson, email, phone, address, deliveryDays, pricePerUnit, reliabilityScore
            new Object[]{"Sharma Traders",
                "Rajesh Sharma", "rajesh@sharmatraders.com", "+91-9811001001",
                "12, Nehru Market, Delhi", 3, 420.0, 90.0},
            new Object[]{"QuickSupply Co",
                "Ankit Verma", "ankit@quicksupply.in", "+91-9822002002",
                "45, Industrial Area, Gurgaon", 7, 350.0, 56.0},
            new Object[]{"Metro Electronics",
                "Priya Mehta", "priya@metroelectronics.com", "+91-9833003003",
                "8, Tech Park, Bengaluru", 2, 550.0, 96.0},
            new Object[]{"Tech Supplies Co",
                "Suresh Kumar", "suresh@techsupplies.co.in", "+91-9844004004",
                "22, Electronics Hub, Hyderabad", 5, 390.0, 78.0},
            new Object[]{"FastTrack Imports",
                "Neha Singh", "neha@fasttrackimports.com", "+91-9855005005",
                "3, Export Zone, Mumbai", 1, 620.0, 88.0}
        );

        int updated = 0, created = 0;
        for (Object[] s : suppliers) {
            String name = (String) s[0];
            Optional<Supplier> existing = supplierRepository.findFirstByName(name);

            Supplier supplier = existing.orElseGet(Supplier::new);
            boolean isNew = existing.isEmpty();

            // Always set name
            supplier.setName(name);

            // Fill null fields only (upsert logic)
            if (supplier.getContactPerson() == null) supplier.setContactPerson((String) s[1]);
            if (supplier.getEmail()          == null) supplier.setEmail((String) s[2]);
            if (supplier.getPhone()          == null) supplier.setPhone((String) s[3]);
            if (supplier.getAddress()        == null) supplier.setAddress((String) s[4]);
            if (supplier.getDeliveryDays()   == null) supplier.setDeliveryDays((Integer) s[5]);
            if (supplier.getPricePerUnit()   == null) supplier.setPricePerUnit((Double) s[6]);
            if (supplier.getReliabilityScore()== null) supplier.setReliabilityScore((Double) s[7]);

            supplierRepository.save(supplier);
            if (isNew) created++; else updated++;
        }
        log.info("Suppliers → created: {}, updated (null fields): {}", created, updated);
    }

    // ─────────────────────────────────────────
    // 3. ORDERS
    // ─────────────────────────────────────────
    private void seedOrders() {
        // Resolve products and suppliers by stable identifiers
        Map<String, Product>  products  = buildProductMap();
        Map<String, Supplier> suppliers = buildSupplierMap();

        List<Object[]> orders = List.of(
            // orderNumber, status, supplierName, sku, qty, unitPrice, notes
            // --- RECEIVED (historical) ---
            new Object[]{"ORD-HIST-001", Order.OrderStatus.RECEIVED,
                "Sharma Traders",    "SKU-2091", 200, 199.0,   "Historical restock — USB-C Cable"},
            new Object[]{"ORD-HIST-002", Order.OrderStatus.RECEIVED,
                "Metro Electronics", "SKU-1042", 100, 2999.0,  "Historical restock — Bluetooth Speaker"},
            new Object[]{"ORD-HIST-003", Order.OrderStatus.RECEIVED,
                "Tech Supplies Co",  "SKU-5023",  80, 1799.0,  "Historical restock — Gaming Mouse"},

            // --- APPROVED ---
            new Object[]{"ORD-APPR-001", Order.OrderStatus.APPROVED,
                "Sharma Traders",    "SKU-4087",  50, 4999.0,  "Approved — Mechanical Keyboard restock"},
            new Object[]{"ORD-APPR-002", Order.OrderStatus.APPROVED,
                "FastTrack Imports", "SKU-9067",  30, 8999.0,  "Approved — Headphones restock"},
            new Object[]{"ORD-APPR-003", Order.OrderStatus.APPROVED,
                "Tech Supplies Co",  "SKU-3012",  40, 2499.0,  "Approved — USB-C Hub restock"},

            // --- PENDING (recent) ---
            new Object[]{"ORD-PEND-001", Order.OrderStatus.PENDING,
                "Sharma Traders",    "SKU-1042", 100, 2999.0,  "Urgent restock — Bluetooth Speaker stockout risk"},
            new Object[]{"ORD-PEND-002", Order.OrderStatus.PENDING,
                "QuickSupply Co",    "SKU-2091", 150,  199.0,  "Bulk restock — USB-C Cable"},
            new Object[]{"ORD-PEND-003", Order.OrderStatus.PENDING,
                "Metro Electronics", "SKU-7091",  25, 7499.0,  "Restock — Portable SSD recovering demand"},
            new Object[]{"ORD-PEND-004", Order.OrderStatus.PENDING,
                "FastTrack Imports", "SKU-1042",  50, 2999.0,  "Express restock — Bluetooth Speaker"},
            new Object[]{"ORD-PEND-005", Order.OrderStatus.PENDING,
                "QuickSupply Co",    "SKU-3310",  60, 1299.0,  "Restock — Power Bank growing demand"},
            new Object[]{"ORD-PEND-006", Order.OrderStatus.PENDING,
                "Sharma Traders",    "SKU-9067",  20, 8999.0,  "Restock — Noise Cancelling Headphones critical"},
            new Object[]{"ORD-PEND-007", Order.OrderStatus.PENDING,
                "Tech Supplies Co",  "SKU-4087",  30, 4999.0,  "Restock — Mechanical Keyboard low stock"},

            // --- CANCELLED ---
            new Object[]{"ORD-CANC-001", Order.OrderStatus.CANCELLED,
                "QuickSupply Co",    "SKU-2041", 100, 1299.0,  "Cancelled — Wireless Earbuds dead stock"},
            new Object[]{"ORD-CANC-002", Order.OrderStatus.CANCELLED,
                "QuickSupply Co",    "SKU-6034",  50, 3299.0,  "Cancelled — Webcam demand dropped"}
        );

        int skipped = 0, created = 0;
        for (Object[] o : orders) {
            String orderNumber = (String) o[0];

            if (orderRepository.findByOrderNumber(orderNumber).isPresent()) {
                skipped++;
                continue;
            }

            String sku          = (String) o[3];
            String supplierName = (String) o[2];
            Product  product  = products.get(sku);
            Supplier supplier = suppliers.get(supplierName);

            if (product == null || supplier == null) {
                log.warn("Order {} skipped — product {} or supplier {} not found",
                    orderNumber, sku, supplierName);
                continue;
            }

            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity((Integer) o[4]);
            item.setUnitPrice((Double) o[5]);

            Order order = new Order();
            order.setOrderNumber(orderNumber);
            order.setStatus((Order.OrderStatus) o[1]);
            order.setSupplier(supplier);
            order.setNotes((String) o[6]);
            order.setItems(new ArrayList<>(List.of(item)));
            item.setOrder(order);  // bidirectional

            orderRepository.save(order);
            created++;
        }
        log.info("Orders → created: {}, skipped: {}", created, skipped);
    }

    // ─────────────────────────────────────────
    // 4. SALES RECORDS
    // ─────────────────────────────────────────
    private void seedSalesRecords() {
        Map<String, Product> products = buildProductMap();
        LocalDate today = LocalDate.now();
        int totalCreated = 0;

        // Each entry: sku, channel, unitPrice, monthlyQty[]
        // monthlyQty index 0 = 6 months ago, index 5 = last month
        // Special patterns handled separately

        // Pattern: standard monthly qty × 28 days per month
        List<Object[]> standardPatterns = List.of(
            // sku, channel, unitPrice, qty per month [m-6, m-5, m-4, m-3, m-2, m-1]
            new Object[]{"SKU-1042", "ONLINE", 2999.0, new int[]{4,  5,  6,  8,  10, 12}},
            new Object[]{"SKU-9067", "B2B",    8999.0, new int[]{2,  2,  2,  1,   1,  1}},
            new Object[]{"SKU-4087", "ONLINE", 4999.0, new int[]{6,  5,  4,  3,   2,  1}},
            new Object[]{"SKU-2091", "OFFLINE", 199.0, new int[]{6,  6,  6,  7,   7,  7}},
            new Object[]{"SKU-5023", "ONLINE", 1799.0, new int[]{2,  3,  8,  6,   3,  2}},
            new Object[]{"SKU-6034", "B2B",    3299.0, new int[]{5,  5,  4,  3,   2,  1}},
            new Object[]{"SKU-3310", "ONLINE", 1299.0, new int[]{1,  1,  2,  2,   3,  4}},
            new Object[]{"SKU-3012", "ONLINE", 2499.0, new int[]{2,  3,  2,  3,   2,  3}}
        );

        for (Object[] pattern : standardPatterns) {
            String  sku       = (String)  pattern[0];
            String  channel   = (String)  pattern[1];
            double  unitPrice = (double)  pattern[2];
            int[]   monthQty  = (int[])   pattern[3];

            Product product = products.get(sku);
            if (product == null) { log.warn("Product {} not found, skipping sales", sku); continue; }

            // Idempotency check
            if (isAlreadySeeded(product.getId())) {
                log.info("SalesRecord [{}] already seeded — skipping", sku);
                continue;
            }

            List<SalesRecord> batch = new ArrayList<>();
            for (int monthOffset = 0; monthOffset < 6; monthOffset++) {
                int dailyQty = monthQty[monthOffset];
                if (dailyQty == 0) continue;

                // Month: (5 - monthOffset) months ago → index 0 = 6 months ago
                int monthsAgo = 6 - monthOffset;
                LocalDate monthStart = today.minusMonths(monthsAgo).withDayOfMonth(1);

                for (int day = 0; day < 28; day++) {
                    LocalDate saleDate = monthStart.plusDays(day);
                    if (saleDate.isAfter(today)) break;

                    SalesRecord sr = buildSalesRecord(product, dailyQty, unitPrice, saleDate, channel);
                    batch.add(sr);
                }
            }
            salesRecordRepository.saveAll(batch);
            totalCreated += batch.size();
            log.info("SalesRecord [{}] → {} records seeded", sku, batch.size());
        }

        // --- SKU-2041 Wireless Earbuds: Dead stock ---
        // Only 8 units in first 4 days of month-6, nothing after
        {
            String sku = "SKU-2041";
            Product product = products.get(sku);
            if (product != null && !isAlreadySeeded(product.getId())) {
                LocalDate monthStart = today.minusMonths(6).withDayOfMonth(1);
                List<SalesRecord> batch = new ArrayList<>();
                for (int day = 0; day < 4; day++) {
                    LocalDate saleDate = monthStart.plusDays(day);
                    batch.add(buildSalesRecord(product, 2, 1299.0, saleDate, "ONLINE"));
                }
                salesRecordRepository.saveAll(batch);
                totalCreated += batch.size();
                log.info("SalesRecord [SKU-2041 Dead Stock] → {} records seeded", batch.size());
            } else if (product != null) {
                log.info("SalesRecord [SKU-2041] already seeded — skipping");
            }
        }

        // --- SKU-7091 Portable SSD: Recovering ---
        // Month 6-3: 0 sales. Month 2: 1/day × 10 days. Month 1: 2/day × 15 days.
        {
            String sku = "SKU-7091";
            Product product = products.get(sku);
            if (product != null && !isAlreadySeeded(product.getId())) {
                List<SalesRecord> batch = new ArrayList<>();

                // Month 2 ago: 1/day × 10 days
                LocalDate m2Start = today.minusMonths(2).withDayOfMonth(1);
                for (int day = 0; day < 10; day++) {
                    LocalDate saleDate = m2Start.plusDays(day);
                    if (saleDate.isAfter(today)) break;
                    batch.add(buildSalesRecord(product, 1, 7499.0, saleDate, "B2B"));
                }

                // Month 1 ago: 2/day × 15 days
                LocalDate m1Start = today.minusMonths(1).withDayOfMonth(1);
                for (int day = 0; day < 15; day++) {
                    LocalDate saleDate = m1Start.plusDays(day);
                    if (saleDate.isAfter(today)) break;
                    batch.add(buildSalesRecord(product, 2, 7499.0, saleDate, "B2B"));
                }

                salesRecordRepository.saveAll(batch);
                totalCreated += batch.size();
                log.info("SalesRecord [SKU-7091 Recovering] → {} records seeded", batch.size());
            } else if (product != null) {
                log.info("SalesRecord [SKU-7091] already seeded — skipping");
            }
        }

        log.info("SalesRecords total → {} records created this run", totalCreated);
    }

    // ─────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────

    private SalesRecord buildSalesRecord(Product product, int qty,
                                          double unitPrice, LocalDate saleDate,
                                          String channel) {
        SalesRecord sr = new SalesRecord();
        sr.setProduct(product);
        sr.setQuantitySold(qty);
        sr.setUnitPrice(unitPrice);
        sr.setTotalRevenue(qty * unitPrice);   // @PrePersist will recalc anyway
        sr.setSaleDate(saleDate);
        sr.setChannel(channel);
        sr.setNotes(SEED_MARKER);
        return sr;
    }

    // Recent 8 days patch — forecast window ke liye
// SKU-1042, SKU-2091, SKU-5023, SKU-6034 ke liye last 8 days seed karo
private void seedRecentDays() {
    Map<String, Product> products = buildProductMap();
    LocalDate today = LocalDate.now();

    // product sku, daily qty, unitPrice, channel
    List<Object[]> recentPatterns = List.of(
        new Object[]{"SKU-1042", 12, 2999.0, "ONLINE"},   // growing — peak rate
        new Object[]{"SKU-2091",  7,  199.0, "OFFLINE"},  // stable
        new Object[]{"SKU-5023",  2, 1799.0, "ONLINE"},   // seasonal tapering
        new Object[]{"SKU-6034",  1, 3299.0, "B2B"},      // declining
        new Object[]{"SKU-3310",  4, 1299.0, "ONLINE"},   // growing
        new Object[]{"SKU-9067",  1, 8999.0, "B2B"},      // stable premium
        new Object[]{"SKU-4087",  1, 4999.0, "ONLINE"}    // declining
    );

    int totalCreated = 0;
    for (Object[] pattern : recentPatterns) {
        String sku       = (String)  pattern[0];
        int    dailyQty  = (int)     pattern[1];
        double unitPrice = (double)  pattern[2];
        String channel   = (String)  pattern[3];

        Product product = products.get(sku);
        if (product == null) continue;

        // Idempotency — DEMO_SEED_V2 marker use karo recent patch ke liye
        boolean alreadySeeded = salesRecordRepository
            .findByProductIdOrderBySaleDateDesc(product.getId())
            .stream()
            .anyMatch(r -> "DEMO_SEED_V2".equals(r.getNotes()));

        if (alreadySeeded) {
            log.info("Recent patch [{}] already seeded — skipping", sku);
            continue;
        }

        List<SalesRecord> batch = new ArrayList<>();
        for (int daysAgo = 7; daysAgo >= 1; daysAgo--) {
            LocalDate saleDate = today.minusDays(daysAgo);
            SalesRecord sr = new SalesRecord();
            sr.setProduct(product);
            sr.setQuantitySold(dailyQty);
            sr.setUnitPrice(unitPrice);
            sr.setTotalRevenue(dailyQty * unitPrice);
            sr.setSaleDate(saleDate);
            sr.setChannel(channel);
            sr.setNotes("DEMO_SEED_V2");
            batch.add(sr);
        }
        salesRecordRepository.saveAll(batch);
        totalCreated += batch.size();
        log.info("Recent patch [{}] → {} records seeded", sku, batch.size());
    }
    log.info("Recent patch total → {} records", totalCreated);
}

    /** Returns true if any SalesRecord for this product has the DEMO_SEED_V1 marker */
    private boolean isAlreadySeeded(Long productId) {
        return salesRecordRepository
            .findByProductIdOrderBySaleDateDesc(productId)
            .stream()
            .anyMatch(r -> SEED_MARKER.equals(r.getNotes()));
    }

    private Map<String, Product> buildProductMap() {
        Map<String, Product> map = new HashMap<>();
        productRepository.findAll().forEach(p -> map.put(p.getSku(), p));
        return map;
    }

    private Map<String, Supplier> buildSupplierMap() {
        Map<String, Supplier> map = new HashMap<>();
        supplierRepository.findAll().forEach(s -> map.put(s.getName(), s));
        return map;
    }
}