package com.javaweb.Repository.Entity;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

@Entity
@Table(name = "buildingrenttype")
public class BuildingRentTypeEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Integer id;
	
	@ManyToOne
	@JoinColumn(name = "buildingid")
	private BuildingEntity buildingEntity;
	
	@ManyToOne
	@JoinColumn(name = "renttypeid")
	private RentTypeEntity rentTypeEntity;

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public BuildingEntity getBuildingEntity() {
		return buildingEntity;
	}

	public void setBuildingEntity(BuildingEntity buildingEntity) {
		this.buildingEntity = buildingEntity;
	}

	public RentTypeEntity getRentTypeEntity() {
		return rentTypeEntity;
	}

	public void setRentTypeEntity(RentTypeEntity rentTypeEntity) {
		this.rentTypeEntity = rentTypeEntity;
	}
	
}
