package com.project.shopapp.services;

import com.project.shopapp.DTO.OrderDetailDTO;
import com.project.shopapp.models.OrderDetail;

import java.util.List;

public interface IOrderDetailService {
    OrderDetail createOrderDetail(OrderDetailDTO newOrderDetail) throws Exception;
    OrderDetail getOrderDetail(Long id);
    OrderDetail updateOrderDetail(Long id, OrderDetailDTO newOrderDetailData);
    void deleteById(Long id);
    List<OrderDetail> findByOrderId(Long orderId);
}