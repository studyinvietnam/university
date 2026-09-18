package com.javaweb.Builder;

import java.util.ArrayList;
import java.util.List;

public class BuildingSearch {
	private String name;
	private String street;
	private String ward;
	private Integer districtid;
	private Integer numberofbasement;
	private Integer floorarea;
	private String level;
	private Integer rentpricefrom;
	private Integer rentpriceto;
	private Integer rentareafrom;
	private Integer rentareato;
	private Long brokeragefee;
	private String managername;
	private String managerphonenumber;
	private Integer staffid;
	private List<String> typeBuilding = new ArrayList();
	
	public BuildingSearch(Builder builder) {
		this.name = builder.name;
		this.street = builder.street;
		this.districtid = builder.districtid;
		this.numberofbasement = builder.numberofbasement;
		this.floorarea = builder.floorarea;
		this.level = builder.level;
		this.rentpricefrom = builder.rentpricefrom;
		this.rentpriceto = builder.rentpriceto;
		this.rentareafrom = builder.rentareafrom;
		this.rentareato = builder.rentareato;
		this.brokeragefee = builder.brokeragefee;
		this.managername = builder.managername;
		this.managerphonenumber = builder.managerphonenumber;
		this.staffid = builder.staffid;
		this.typeBuilding = builder.typeBuilding;
		this.ward = builder.ward;
	}
	public String getName() {
		return name;
	}
	public String getStreet() {
		return street;
	}
	public String getWard() {
		return ward;
	}
	public Integer getDistrictid() {
		return districtid;
	}
	public Integer getNumberofbasement() {
		return numberofbasement;
	}
	public Integer getFloorarea() {
		return floorarea;
	}
	public String getLevel() {
		return level;
	}
	public Integer getRentpricefrom() {
		return rentpricefrom;
	}
	public Integer getRentpriceto() {
		return rentpriceto;
	}
	public Integer getRentareafrom() {
		return rentareafrom;
	}
	public Integer getRentareato() {
		return rentareato;
	}
	public Long getBrokeragefee() {
		return brokeragefee;
	}
	public String getManagername() {
		return managername;
	}
	public String getManagerphonenumber() {
		return managerphonenumber;
	}
	public Integer getStaffid() {
		return staffid;
	}
	public List<String> getTypeBuilding() {
		return typeBuilding;
	}
	public static class Builder {
		private String name;
		private String street;
		private String ward;
		private Integer districtid;
		private Integer numberofbasement;
		private Integer floorarea;
		private String level;
		private Integer rentpricefrom;
		private Integer rentpriceto;
		private Integer rentareafrom;
		private Integer rentareato;
		private Long brokeragefee;
		private String managername;
		private String managerphonenumber;
		private Integer staffid;
		private List<String> typeBuilding = new ArrayList();
		
		public Builder setName(String name) {
			this.name = name;
			return this;
		}
		public Builder setStreet(String street) {
			this.street = street;
			return this;
		}
		public Builder setWard(String ward) {
			this.ward = ward;
			return this;
		}
		public Builder setDistrictid(Integer districtid) {
			this.districtid = districtid;
			return this;
		}
		public Builder setNumberofbasement(Integer numberofbasement) {
			this.numberofbasement = numberofbasement;
			return this;
		}
		public Builder setFloorarea(Integer floorarea) {
			this.floorarea = floorarea;
			return this;
		}
		public Builder setLevel(String level) {
			this.level = level;
			return this;
		}
		public Builder setRentpricefrom(Integer rentpricefrom) {
			this.rentpricefrom = rentpricefrom;
			return this;
		}
		public Builder setRentpriceto(Integer rentpriceto) {
			this.rentpriceto = rentpriceto;
			return this;
		}
		public Builder setRentareafrom(Integer rentareafrom) {
			this.rentareafrom = rentareafrom;
			return this;
		}
		public Builder setRentareato(Integer rentareato) {
			this.rentareato = rentareato;
			return this;
		}
		public Builder setBrokeragefee(Long brokeragefee) {
			this.brokeragefee = brokeragefee;
			return this;
		}
		public Builder setManagername(String managername) {
			this.managername = managername;
			return this;
		}
		public Builder setManagerphonenumber(String managerphonenumber) {
			this.managerphonenumber = managerphonenumber;
			return this;
		}
		public Builder setStaffid(Integer staffid) {
			this.staffid = staffid;
			return this;
		}
		public Builder setTypeBuilding(List<String> typeBuilding) {
			this.typeBuilding = typeBuilding;
			return this;
		}
		public BuildingSearch build() {
			return new BuildingSearch(this);
		}
		
	}
}
