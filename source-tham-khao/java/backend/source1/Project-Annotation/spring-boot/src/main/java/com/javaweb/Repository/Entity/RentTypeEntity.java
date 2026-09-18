package com.javaweb.Repository.Entity;

import java.util.ArrayList;
import java.util.List;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;

@Entity
@Table(name = "renttype")
public class RentTypeEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Integer id;
	
	@Column(name = "code")
	private String code;
	
	@Column(name = "name")
	private String name;
	
	@OneToMany(mappedBy = "rentTypeEntity")
	private List<BuildingRentTypeEntity> buildingRentTypeEntities = new ArrayList<BuildingRentTypeEntity>();

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public List<BuildingRentTypeEntity> getBuildingRentTypeEntities() {
		return buildingRentTypeEntities;
	}

	public void setBuildingRentTypeEntities(List<BuildingRentTypeEntity> buildingRentTypeEntities) {
		this.buildingRentTypeEntities = buildingRentTypeEntities;
	}
}
