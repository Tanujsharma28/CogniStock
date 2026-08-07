package com.cognistock.backend.common;

public final class ApiConstants {

    private ApiConstants() {}

    // API Versioning
    public static final String API_V1 = "/api/v1";

    // Success Messages
    public static final String CREATED     = "Created successfully";
    public static final String UPDATED     = "Updated successfully";
    public static final String DELETED     = "Deleted successfully";
    public static final String FETCHED     = "Fetched successfully";
    public static final String LOGIN_OK    = "Login successful";
    public static final String REGISTER_OK = "Registration successful";

    // Roles
    public static final String ROLE_ADMIN   = "ADMIN";
    public static final String ROLE_MANAGER = "MANAGER";
    public static final String ROLE_STAFF   = "STAFF";

    // Pagination Defaults
    public static final int DEFAULT_PAGE      = 0;
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE     = 100;
}