package com.javaweb.Repository.Custom.Impl;

import java.lang.reflect.Field;
import java.util.List;
import java.util.stream.Collectors;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;

import org.springframework.stereotype.Repository;

import com.javaweb.Builder.BuildingSearch;
import com.javaweb.Repository.Custom.BuildingRepositoryCustom;
import com.javaweb.Repository.Entity.BuildingEntity;
import com.javaweb.Utils.UtilsCheckNumber;


@Repository
public class BuildingRepositoryImpl implements BuildingRepositoryCustom {
    
	public String handleJoinBuilding(BuildingSearch buildingSearch) {
		String result = "";
		
		Integer rentareafrom = buildingSearch.getRentareafrom();
		Integer rentareato = buildingSearch.getRentareato();
		if (rentareafrom != null || rentareato != null) {
			result += " inner join estatebasic.rentarea r on b.id = r.buildingid ";
		}
		
		List<String> typeBuilding = buildingSearch.getTypeBuilding();
		if (typeBuilding != null && typeBuilding.size() > 0) {
			result += " inner join buildingrenttype on buildingrenttype.buildingid = b.id ";
			result += " inner join renttype on renttype.id = buildingrenttype.renttypeid ";
		}
		
		Integer staffid = buildingSearch.getStaffid();
		if (staffid != null) {
			result += " inner join estatebasic.assignmentbuilding ab on b.id = ab.buildingid ";
		}
		
		return result;
	}
	
	public String handleWhereNormal(BuildingSearch buildingSearch) {
		String result = "";
		try {
			Field fields[] = BuildingSearch.class.getDeclaredFields();
			for (Field k : fields) {
				k.setAccessible(true);
				if (!k.getName().equals("typeBuilding") && !k.getName().equals("staffid") && !k.getName().startsWith("rentarea") && !k.getName().startsWith("rentprice")) {
					Object value = k.get(buildingSearch);
					if (value != null) {
						if (UtilsCheckNumber.checkNumber(value.toString())) {
							result += " and b." + k.getName() + " = " + value;
						}
						else if (!value.toString().equals("")){
							result += " and b." + k.getName() + " like '%" + value + "%' ";
						}
					}
				}
			}
		}
		catch(Exception ex) {
			ex.printStackTrace();
		}
		return result;
	}
	
	public String handleWhereSpecial(BuildingSearch buildingSearch) {
		String result = "";
		if (buildingSearch.getRentareafrom() != null) {
			result += " and r.value >= " + buildingSearch.getRentareafrom().toString();
		}
		if (buildingSearch.getRentareato() != null) {
			result += " and r.value <= " + buildingSearch.getRentareato().toString();
		}
		if (buildingSearch.getRentpricefrom() != null) {
			result += " and b.rentprice >= " + buildingSearch.getRentpricefrom().toString();
		}
		if (buildingSearch.getRentpriceto() != null) {
			result += " and b.rentprice <= " + buildingSearch.getRentpriceto().toString();
		}
		if (buildingSearch.getStaffid() != null) {
			result += " and ab.staffid = " + buildingSearch.getStaffid().toString();
		}
		//Java 7
//		if (typeBuilding != null && typeBuilding.size() > 0) {
//			List<String> type = new ArrayList<>();
//			for (String k : typeBuilding) {
//				type.add("'" + k + "'");
//			}
//			result += " and renttype.code in( " + String.join(",", type) + ") ";
//		}
		//Java 8+
		List<String> typeBuilding = buildingSearch.getTypeBuilding();
		if (typeBuilding != null && typeBuilding.size() > 0) {
			result += " and( " + typeBuilding.stream().map(type -> "renttype.code like '%" + type + "%' ").collect(Collectors.joining(" or ")) + ") ";
		}
		return result;
	}
    
	@PersistenceContext
	private EntityManager entityManager;
	
	@Override
	public List<BuildingEntity> findBuilding(BuildingSearch buildingSearch) {
		String sql = "SELECT b.* FROM estatebasic.building b ";
		
		sql += handleJoinBuilding(buildingSearch);
		sql += " where 1=1 ";
		sql += handleWhereNormal(buildingSearch);
		sql += handleWhereSpecial(buildingSearch);
		sql += " group by b.id;";
		
		Query query = entityManager.createNativeQuery(sql, BuildingEntity.class);
		
		System.out.println("Hello!");
		return query.getResultList();
	}
}
