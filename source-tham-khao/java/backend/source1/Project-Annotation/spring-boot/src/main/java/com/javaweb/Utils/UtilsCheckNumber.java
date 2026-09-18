package com.javaweb.Utils;

public class UtilsCheckNumber {
	public static boolean checkNumber(String data) {
		try {
			Long number = Long.parseLong(data);
		}
		catch (Exception e) {
			return false;
		}
		return true;
	}
}
