package com.javaweb.Repository.jdbc;

import java.util.List;

public interface JdbcRepository<T>{
	List<T> findAll();
	void save(Object entity);
}
