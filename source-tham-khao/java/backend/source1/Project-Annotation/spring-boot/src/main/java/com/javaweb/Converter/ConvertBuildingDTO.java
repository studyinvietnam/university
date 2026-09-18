package com.javaweb.Converter;

import java.util.List;
import java.util.stream.Collectors;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.javaweb.DTO.BuildingDTO;
import com.javaweb.Repository.Entity.BuildingEntity;
import com.javaweb.Repository.Entity.RentAreaEntity;

@Component
public class ConvertBuildingDTO {
	@Autowired
	private ModelMapper modelMapper;
	
	public BuildingDTO convertBuildingDTO(BuildingEntity k) {
		BuildingDTO buildingDTO = modelMapper.map(k, BuildingDTO.class);
		
		List<RentAreaEntity> rentAreaEntities = k.getRentAreaEntities();
		String rentarea = rentAreaEntities.stream().map(it -> it.getValue().toString()).collect(Collectors.joining(","));
		
		buildingDTO.setAddress(k.getStreet() + "," + k.getWard() + "," + k.getDistrictEntity().getName());
		buildingDTO.setRentArea(rentarea);
		
		return buildingDTO;
	}
}
