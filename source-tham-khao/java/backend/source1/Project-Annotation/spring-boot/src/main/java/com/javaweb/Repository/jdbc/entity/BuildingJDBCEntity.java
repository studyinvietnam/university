package com.javaweb.Repository.jdbc.entity;


import com.javaweb.Repository.jdbc.annotation.ColumnJDBC;
import com.javaweb.Repository.jdbc.annotation.EntityJDBC;
import com.javaweb.Repository.jdbc.annotation.TableJDBC;


@EntityJDBC
@TableJDBC(name="building")
public class BuildingJDBCEntity {

	@ColumnJDBC(name = "name")
	private String name;
	
	
	@ColumnJDBC(name = "street")
	private String street;
	
	@ColumnJDBC(name = "ward")
	private String ward;
	
//	@ColumnJDBC(name = "level")
//	private String level;
	
	@ColumnJDBC(name = "rentprice")
	private Integer rentprice;
	
	@ColumnJDBC(name = "districtid")
	private Long districtId;
	
	
//	@ColumnJDBC(name = "rentpricedescription")
//	private String rentpricedescription;
//	
//	@ColumnJDBC(name = "servicefee")
//	private String servicefee;
//	
//	@ColumnJDBC(name = "carfee")
//	private String carfee;
//	
//	@ColumnJDBC(name = "motorbikefee")
//	private String motorbikefee;

	public Long getDistrictId() {
		return districtId;
	}

	public void setDistrictId(Long districtId) {
		this.districtId = districtId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getStreet() {
		return street;
	}

	public void setStreet(String street) {
		this.street = street;
	}

	public String getWard() {
		return ward;
	}

	public void setWard(String ward) {
		this.ward = ward;
	}

	public Integer getRentprice() {
		return rentprice;
	}

	public void setRentprice(Integer rentprice) {
		this.rentprice = rentprice;
	}

	
}
