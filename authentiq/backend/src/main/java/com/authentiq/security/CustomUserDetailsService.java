package com.authentiq.security;

import com.authentiq.entity.Manufacturer;
import com.authentiq.repository.ManufacturerRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final ManufacturerRepository manufacturerRepository;

    public CustomUserDetailsService(ManufacturerRepository manufacturerRepository) {
        this.manufacturerRepository = manufacturerRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Manufacturer manufacturer = manufacturerRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Manufacturer not found with email: " + email));

        return new User(
                manufacturer.getEmail(),
                manufacturer.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MANUFACTURER"))
        );
    }
}
