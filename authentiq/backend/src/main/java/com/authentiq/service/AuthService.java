package com.authentiq.service;

import com.authentiq.crypto.KeyManager;
import com.authentiq.dto.AuthResponse;
import com.authentiq.dto.LoginRequest;
import com.authentiq.dto.RegisterRequest;
import com.authentiq.entity.Manufacturer;
import com.authentiq.exception.AuthentiQException;
import com.authentiq.repository.ManufacturerRepository;
import com.authentiq.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final ManufacturerRepository manufacturerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final KeyManager keyManager;

    public AuthService(ManufacturerRepository manufacturerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider,
                       AuthenticationManager authenticationManager,
                       KeyManager keyManager) {
        this.manufacturerRepository = manufacturerRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.authenticationManager = authenticationManager;
        this.keyManager = keyManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (manufacturerRepository.existsByEmail(request.getEmail())) {
            throw new AuthentiQException("Email already in use", "EMAIL_EXISTS");
        }
        if (manufacturerRepository.existsByOrganizationCode(request.getOrganizationCode())) {
            throw new AuthentiQException("Organization code already in use", "ORG_CODE_EXISTS");
        }

        Manufacturer manufacturer = new Manufacturer(
                request.getName(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getOrganizationCode().toUpperCase().trim()
        );

        Manufacturer saved = manufacturerRepository.save(manufacturer);

        // Initialize ECDSA KeyPair for new manufacturer
        keyManager.getOrCreateActivePublicKey(saved.getId(), saved.getOrganizationCode());

        String token = tokenProvider.generateToken(saved.getEmail(), saved.getId(), saved.getOrganizationCode());

        return new AuthResponse(token, saved.getId(), saved.getName(), saved.getEmail(), saved.getOrganizationCode());
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        Manufacturer manufacturer = manufacturerRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthentiQException("User not found", "USER_NOT_FOUND"));

        String token = tokenProvider.generateToken(manufacturer.getEmail(), manufacturer.getId(), manufacturer.getOrganizationCode());

        return new AuthResponse(token, manufacturer.getId(), manufacturer.getName(), manufacturer.getEmail(), manufacturer.getOrganizationCode());
    }
}
