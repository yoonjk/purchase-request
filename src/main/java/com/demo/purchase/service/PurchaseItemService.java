package com.demo.purchase.service;
import com.demo.purchase.dao.*;
import com.demo.purchase.dao.PurchaseItemMapper.ItemBean;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
@Service public class PurchaseItemService {
 private final PurchaseItemMapper items;private final ProductMapper products;private final PurchaseRequestMapper requests;private final PurchaseApprovalService approval;
 public PurchaseItemService(PurchaseItemMapper items,ProductMapper products,PurchaseRequestMapper requests,PurchaseApprovalService approval){this.items=items;this.products=products;this.requests=requests;this.approval=approval;}
 @Transactional public ItemBean add(long requestId,String sku,int qty){
  requests.findByIdForUpdate(requestId);ensureRequest(requestId); ItemBean item=build(null,requestId,sku,qty);items.add(item);recalculate(requestId);return item;
 }
 @Transactional public ItemBean edit(long id,String sku,int qty){
  var old=items.one(id);if(old==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Item not found");
  requests.findByIdForUpdate(old.requestId()); ItemBean item=build(id,old.requestId(),sku,qty);items.edit(item);recalculate(old.requestId());return item;
 }
 @Transactional public void remove(long id){
  var old=items.one(id);if(old==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Item not found");
  requests.findByIdForUpdate(old.requestId());items.remove(id);recalculate(old.requestId());
 }
 private ItemBean build(Long id,long requestId,String sku,int qty){
  if(qty<=0||sku==null||sku.isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid item");
  var product=products.one(sku);if(product==null||!product.active())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Product not found or inactive");
  ItemBean b=new ItemBean();b.setItemId(id);b.setRequestId(requestId);b.setSku(sku);b.setQuantity(qty);b.setUnitPrice(product.unitPrice());b.setLineTotal(product.unitPrice().multiply(BigDecimal.valueOf(qty)));return b;
 }
 private void ensureRequest(long id){if(requests.findById(id)==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Request not found");}
 private void recalculate(long id){
  var req=requests.findByIdForUpdate(id);if(req==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Request not found");
  BigDecimal total=items.sum(id);
  // Database CHECK(total_amount > 0): reject deletion of the last item instead of persisting zero.
  if(total.signum()<=0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Request must retain a positive total; last item cannot be removed");
  requests.updateTotals(id,total,approval.evaluate(total,req.getBudget()));
 }
}
