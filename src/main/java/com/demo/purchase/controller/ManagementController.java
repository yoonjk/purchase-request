package com.demo.purchase.controller;

import com.demo.purchase.dao.*;
import com.demo.purchase.service.PurchaseItemService;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ManagementController {
	private final ProductMapper products;
	private final PurchaseItemMapper items;
	private final PurchaseItemService service;
	private final PurchaseRequestMapper requests;

	public ManagementController(ProductMapper p, PurchaseItemMapper i, PurchaseItemService s, PurchaseRequestMapper r) {
		products = p;
		items = i;
		service = s;
		requests = r;
	}

	public record ProductInput(String sku, String name, BigDecimal unitPrice, Boolean active) {
	}

	public record ItemInput(String sku, Integer quantity) {
	}

	@GetMapping("/products")
	public List<ProductMapper.Product> products() {
		return products.all();
	}

	@GetMapping("/products/{sku}")
	public ProductMapper.Product product(@PathVariable String sku) {
		var p = products.one(sku);
		if (p == null)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		return p;
	}

	@PostMapping("/products")
	public ResponseEntity<?> addProduct(@RequestBody ProductInput in) {
		validate(in, true);
		try {
			products.add(
					new ProductMapper.Product(in.sku(), in.name(), in.unitPrice(), in.active() == null || in.active()));
		} catch (DataIntegrityViolationException e) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate SKU", e);
		}
		return ResponseEntity.status(201).body(products.one(in.sku()));
	}

	@PutMapping("/products/{sku}")
	public ProductMapper.Product editProduct(@PathVariable String sku, @RequestBody ProductInput in) {
		validate(in, false);
		if (products.edit(
				new ProductMapper.Product(sku, in.name(), in.unitPrice(), in.active() == null || in.active())) == 0)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		return products.one(sku);
	}

	@DeleteMapping("/products/{sku}")
	public ResponseEntity<Void> deleteProduct(@PathVariable String sku) {
		try {
			if (products.remove(sku) == 0)
				throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		} catch (DataIntegrityViolationException e) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Product referenced by purchase items", e);
		}
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/purchase-requests")
	public List<com.demo.purchase.dao.vo.PurchaseRequest> requests() {
		return requests.findAll();
	}

	@GetMapping("/purchase-requests/{id}/items")
	public List<PurchaseItemMapper.Item> items(@PathVariable long id) {
		if (requests.findById(id) == null)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		return items.byRequest(id);
	}

	@PostMapping("/purchase-requests/{id}/items")
	public ResponseEntity<?> addItem(@PathVariable long id, @RequestBody ItemInput in) {
		check(in);
		return ResponseEntity.status(201).body(service.add(id, in.sku(), in.quantity()));
	}

	@PutMapping("/purchase-items/{id}")
	public Object editItem(@PathVariable long id, @RequestBody ItemInput in) {
		check(in);
		return service.edit(id, in.sku(), in.quantity());
	}

	@DeleteMapping("/purchase-items/{id}")
	public ResponseEntity<Void> deleteItem(@PathVariable long id) {
		service.remove(id);
		return ResponseEntity.noContent().build();
	}

	private void check(ItemInput in) {
		if (in == null || in.quantity() == null || in.quantity() <= 0 || in.sku() == null || in.sku().isBlank())
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid item");
	}

	private void validate(ProductInput in, boolean creating) {
		if (in == null || (creating && (in.sku() == null || !in.sku().matches("[A-Za-z0-9_-]{1,50}")))
				|| in.name() == null || in.name().isBlank() || in.name().length() > 200 || in.unitPrice() == null
				|| in.unitPrice().signum() < 0 || in.unitPrice().scale() > 2)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid product");
	}
}
