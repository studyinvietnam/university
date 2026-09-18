package com.javaweb.Repository.jdbc.impl;

import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import com.javaweb.Repository.jdbc.JdbcRepository;
import com.javaweb.Repository.jdbc.annotation.ColumnJDBC;
import com.javaweb.Repository.jdbc.annotation.TableJDBC;
import com.javaweb.Repository.jdbc.mapper.ResultSetMapper;
import com.javaweb.Utils.ConnectionUtils;

public class SimpleJdbcRepository<T> implements JdbcRepository<T>{

	@Override
	public List<T> findAll() {
		// TODO Auto-generated method stub
		Class<T> tClass = (Class<T>) ((ParameterizedType)getClass().getGenericSuperclass()).getActualTypeArguments()[0];
		List<T> results = new ArrayList<>();
		String tableName = "";
		if(tClass.isAnnotationPresent(TableJDBC.class)) {
			TableJDBC tableJDBC = tClass.getAnnotation(TableJDBC.class);
			tableName = tableJDBC.name();
		}
		String sql = "SELECT * FROM " + tableName;
		ResultSetMapper<T> resultSetMapper = new ResultSetMapper<>();
		///.......
		try(Connection conn = ConnectionUtils.getConnection();
				Statement st = conn.createStatement();
				ResultSet rs = st.executeQuery(sql)){
			results = resultSetMapper.mapRow(rs,tClass);
			if(results != null) {
				return results;
			}
			else {
				return new ArrayList<>();
			}
		}
		catch(SQLException ex) {
			System.out.print("Connect DataBase Failed");
			return null;
		}
	}

	private String creatSqlInsert() {
		Class<T> tClass = (Class<T>) ((ParameterizedType)getClass().getGenericSuperclass()).getActualTypeArguments()[0];
		List<T> results = new ArrayList<>();
		String tableName = "";
		if(tClass.isAnnotationPresent(TableJDBC.class)) {
			TableJDBC tableJDBC = tClass.getAnnotation(TableJDBC.class);
			tableName = tableJDBC.name();
		}
		StringBuilder fields = new StringBuilder("");
		StringBuilder params = new StringBuilder("");
		for(Field field : tClass.getDeclaredFields()) {
			if(fields.length() > 0) {
				fields.append(",");
				params.append(",");
			}
			if(field.isAnnotationPresent(ColumnJDBC.class)) {
				ColumnJDBC columnJDBC = field.getAnnotation(ColumnJDBC.class);
				fields.append(columnJDBC.name());
				params.append("?");
			}
		}
		String sql = "INSERT INTO " +  tableName + " ( " +   fields  + " ) " + " VALUES ( "+ params + " ) ";
		return sql;
	}
	
	@Override
	public void save(Object entity) {
		// TODO Auto-generated method stub
		try(Connection conn = ConnectionUtils.getConnection();
			PreparedStatement st = conn.prepareStatement(creatSqlInsert())){
			Class<?> tClass = entity.getClass();
			Field[] fields = tClass.getDeclaredFields();
			int i = 1;
			for(Field field : fields) {
				field.setAccessible(true);
				try {
					st.setObject(i, field.get(entity));
				}
				catch (Exception e) {
					e.printStackTrace();
				}
				i++;
			}
			st.executeUpdate();
		}
		catch(SQLException ex) {
			System.out.print("Connect DataBase Failed");
		}
		
	}
	
	

}
