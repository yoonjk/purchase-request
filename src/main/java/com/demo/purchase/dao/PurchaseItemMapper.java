package com.demo.purchase.dao;

import java.math.BigDecimal;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PurchaseItemMapper {
    record Item(Long itemId, Long requestId, String sku, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}
    List<Item> byRequest(@Param("requestId") long requestId);
    Item one(@Param("id") long id);
    int add(ItemBean item);
    int edit(ItemBean item);
    int remove(@Param("id") long id);
    BigDecimal sum(@Param("requestId") long requestId);
 class ItemBean {
  private Long itemId,requestId;private String sku;private Integer quantity;private BigDecimal unitPrice,lineTotal;
  public Long getItemId(){return itemId;} public void setItemId(Long x){itemId=x;}
  public Long getRequestId(){return requestId;} public void setRequestId(Long x){requestId=x;}
  public String getSku(){return sku;} public void setSku(String x){sku=x;}
  public Integer getQuantity(){return quantity;} public void setQuantity(Integer x){quantity=x;}
  public BigDecimal getUnitPrice(){return unitPrice;} public void setUnitPrice(BigDecimal x){unitPrice=x;}
  public BigDecimal getLineTotal(){return lineTotal;} public void setLineTotal(BigDecimal x){lineTotal=x;}
 }
}
