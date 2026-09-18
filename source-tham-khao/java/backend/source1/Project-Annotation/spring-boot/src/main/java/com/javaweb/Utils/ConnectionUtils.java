package com.javaweb.Utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConnectionUtils {
	private static String DB_URL = "jdbc:mysql://localhost:3306/estatebasic";
	private static String USER = "root";
	private static String PASS = "123456";

	
	public static final Connection getConnection() { 
		try { 
			Connection connection = DriverManager.getConnection(DB_URL,USER,PASS);
			return connection;
		}
		catch(SQLException ex) { 
			ex.printStackTrace();
		}
		return null;
	}
}
