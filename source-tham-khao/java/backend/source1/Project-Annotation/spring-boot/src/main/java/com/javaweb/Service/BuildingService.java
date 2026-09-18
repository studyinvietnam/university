package com.javaweb.Service;

import java.util.List;
import java.util.Map;

import com.javaweb.DTO.BuildingDTO;
import com.javaweb.DTO.BuildingRequestDTO;
import com.javaweb.Repository.jdbc.entity.BuildingJDBCEntity;

public interface BuildingService {
	List<BuildingDTO> findBuilding(Map<String, Object> params, List<String> typeBuilding);
	
	List<BuildingJDBCEntity> findAll();
	
	void save(BuildingRequestDTO buildingRequestDTO);
}
