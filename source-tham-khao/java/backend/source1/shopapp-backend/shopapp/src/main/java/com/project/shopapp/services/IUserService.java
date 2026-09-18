package com.project.shopapp.services;

import com.project.shopapp.DTO.UserDTO;
import com.project.shopapp.customexceptions.DataNotFoundException;
import com.project.shopapp.models.User;

public interface IUserService {
    User createUser(UserDTO userDTO) throws Exception;
    String login(String phoneNumber, String password) throws Exception;
}

