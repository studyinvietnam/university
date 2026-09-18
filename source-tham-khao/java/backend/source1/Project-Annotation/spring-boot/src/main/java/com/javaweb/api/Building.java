package com.javaweb.api;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.DTO.BuildingDTO;
import com.javaweb.DTO.BuildingRequestDTO;
import com.javaweb.Repository.jdbc.entity.BuildingJDBCEntity;
import com.javaweb.Service.BuildingService;
 
@RestController
public class Building {
	@Autowired
	private BuildingService buildingService;
	
	@GetMapping("/building/")
	public List<BuildingDTO> getBuilding(@RequestParam Map<String, Object> params,
										@RequestParam(name = "typeBuilding", required = false) List<String> typeBuilding) {
		List<BuildingDTO> result = buildingService.findBuilding(params, typeBuilding);
		return result;
	}
	
	
	@GetMapping(value="/api/building/")
	public List<BuildingJDBCEntity> findAll(){
		List<BuildingJDBCEntity> results = buildingService.findAll();
		return results;
	}
	
	
	@PostMapping("/api/building/")
	public void createBuilding(@RequestBody BuildingRequestDTO buildingRequestDTO ) {
		buildingService.save(buildingRequestDTO);
	}
	
}