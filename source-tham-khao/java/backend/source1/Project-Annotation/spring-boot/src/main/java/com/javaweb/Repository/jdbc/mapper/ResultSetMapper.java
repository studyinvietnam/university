package com.javaweb.Repository.jdbc.mapper;

import java.lang.reflect.Field;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.beanutils.BeanUtils;

import com.javaweb.Repository.jdbc.annotation.ColumnJDBC;
import com.javaweb.Repository.jdbc.annotation.EntityJDBC;

public class ResultSetMapper<T>{
	public List<T> mapRow(ResultSet rs, Class<T> tClass){
		List<T> results = new ArrayList<>();
		try {
			if(tClass.isAnnotationPresent(EntityJDBC.class)) {
				ResultSetMetaData resultSetMetaData = rs.getMetaData();//Lay ten cac column ma rs tra ve
				Field[] fields = tClass.getDeclaredFields();
				while(rs.next()) {
					T object = tClass.newInstance();
					for(int i = 1;i <= resultSetMetaData.getColumnCount();i++) {
						String columnName = resultSetMetaData.getColumnName(i);
						Object columnValue = rs.getObject(i);
						for(Field field : fields) {
							field.setAccessible(true);
							if(field.isAnnotationPresent(ColumnJDBC.class)) {
								ColumnJDBC columnJDBC = field.getAnnotation(ColumnJDBC.class);
								if(columnJDBC.name().equals(columnName)) {
									BeanUtils.setProperty(object, field.getName(), columnValue);
									break;
								}
							}
						}
					}
					results.add(object);
				}
			}
			return results;
		}
		catch (Exception e) {
			return null;
		}
	}
}
