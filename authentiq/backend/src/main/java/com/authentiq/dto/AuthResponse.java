package com.authentiq.dto;

public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private Long id;
    private String name;
    private String email;
    private String organizationCode;

    public AuthResponse() {}

    public AuthResponse(String token, Long id, String name, String email, String organizationCode) {
        this.token = token;
        this.id = id;
        this.name = name;
        this.email = email;
        this.organizationCode = organizationCode;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOrganizationCode() { return organizationCode; }
    public void setOrganizationCode(String organizationCode) { this.organizationCode = organizationCode; }
}
