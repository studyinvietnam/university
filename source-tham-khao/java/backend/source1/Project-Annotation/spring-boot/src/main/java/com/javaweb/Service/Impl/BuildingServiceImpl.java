package com.javaweb.Service.Impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.javaweb.Builder.BuildingSearch;
import com.javaweb.Converter.ConvertBuildingDTO;
import com.javaweb.Converter.ConvertBuildingSearch;
import com.javaweb.DTO.BuildingDTO;
import com.javaweb.DTO.BuildingRequestDTO;
import com.javaweb.Repository.Entity.BuildingEntity;
import com.javaweb.Repository.Interfaces.BuildingRepository;
import com.javaweb.Repository.jdbc.entity.BuildingJDBCEntity;
import com.javaweb.Repository.jdbc.impl.BuildingJDBCImpl;
import com.javaweb.Service.BuildingService;

@Service
public class BuildingServiceImpl implements BuildingService {
	@Autowired
	private BuildingRepository buildingRepository;
	@Autowired
	private ConvertBuildingDTO convertBuildingDTO;
	@Autowired
	private ConvertBuildingSearch convertBuildingSearch;
	
	@Autowired
	private ModelMapper modelMapper;
	
	private BuildingJDBCImpl buildingJDBCImpl = new BuildingJDBCImpl();
	@Override
	public List<BuildingDTO> findBuilding(Map<String, Object> params, List<String> typeBuilding) {
		List<BuildingDTO> result = new ArrayList<>();
		
		BuildingSearch buildingSearch = convertBuildingSearch.toBuildingSearch(params, typeBuilding);
		List<BuildingEntity> buildingEntities = buildingRepository.findBuilding(buildingSearch);
		
		for (BuildingEntity k : buildingEntities) {
			BuildingDTO buildingDTO = convertBuildingDTO.convertBuildingDTO(k);
			result.add(buildingDTO);
		}
		return result;
	}

	@Override
	public List<BuildingJDBCEntity> findAll() {
		// TODO Auto-generated method stub
		List<BuildingJDBCEntity> results = buildingJDBCImpl.findAll();
		return results;
	}

	@Override
	public void save(BuildingRequestDTO buildingRequestDTO) {
		// TODO Auto-generated method stub
		BuildingJDBCEntity buildingJDBCEntity = modelMapper.map(buildingRequestDTO,BuildingJDBCEntity.class);
		buildingJDBCImpl.save(buildingJDBCEntity);
		
	}
	
}
