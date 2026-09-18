package com.javaweb.Repository.Custom;

import java.util.List;

import com.javaweb.Builder.BuildingSearch;
import com.javaweb.Repository.Entity.BuildingEntity;

public interface BuildingRepositoryCustom {
	List<BuildingEntity> findBuilding(BuildingSearch buildingSearch);
}
