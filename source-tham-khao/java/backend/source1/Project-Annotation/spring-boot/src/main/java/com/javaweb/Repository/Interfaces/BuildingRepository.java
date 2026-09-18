package com.javaweb.Repository.Interfaces;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.Repository.Custom.BuildingRepositoryCustom;
import com.javaweb.Repository.Entity.BuildingEntity;

public interface BuildingRepository extends JpaRepository<BuildingEntity, Integer>, BuildingRepositoryCustom {
	
}
