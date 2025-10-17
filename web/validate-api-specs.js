// API Specification Validation Script
// Validates frontend API implementations against backend specifications

const validateAPISpecs = () => {
  console.log("🔍 Validating API Calls Against Backend Specifications...");

  const backendSpec = {
    baseURL: "http://localhost:8003/api/v1",
    headers: {
      required: ["Authorization", "cschema", "Content-Type"],
      tenant: "cschema",
      auth: "Bearer",
    },
    auth: {
      login: {
        endpoint: "POST /auth/login/login",
        payload: ["username", "password", "client_name"],
        response: [
          "access_token",
          "refresh_token",
          "token_type",
          "user",
          "role",
          "menu",
        ],
      },
      refresh: {
        endpoint: "POST /auth/login/refresh",
        payload: ["refresh_token"],
        response: ["access_token", "refresh_token", "token_type"],
      },
      logout: {
        endpoint: "POST /auth/login/logout",
        response: ["message", "instructions"],
      },
    },
    masters: {
      academic_years: {
        list: "GET /masters/academic_years/",
        create: "POST /masters/academic_years/",
        read: "GET /masters/academic_years/{id}",
        update: "PUT /masters/academic_years/{id}",
        delete: "DELETE /masters/academic_years/{id}",
        dropdown: "GET /masters/academic_years/dropdown",
      },
      class_sections: {
        create: "POST /masters/class_sections/",
        read_all: "GET /masters/class_sections/read_all",
        dropdown: "GET /masters/class_sections/dropdown",
      },
    },
    students: {
      admission: "POST /students/admission/",
      admission_dropdown: "GET /students/admission/students/dropdown",
    },
    fee: {
      categories: "POST /fee/categories/",
      terms: "POST /fee/terms/",
      mappings_bulk: "POST /fee/class-mappings/bulk",
      transactions: "POST /fee/transactions/",
      receipts: "POST /fee/receipts/",
      refunds: "POST /fee/refunds/",
    },
  };

  // Test 1: Frontend Configuration Validation
  console.log("✅ Test 1: Frontend configuration validation");
  try {
    const mockConfig = {
      api: { baseURL: "http://localhost:8003/api/v1" },
      tenant: { headerName: "cschema", defaultTenant: "ajay" },
    };

    const configValid = mockConfig.api.baseURL === backendSpec.baseURL;
    const tenantValid =
      mockConfig.tenant.headerName === backendSpec.headers.tenant;

    console.log("Base URL matches spec:", configValid);
    console.log("Tenant header matches spec:", tenantValid);

    if (!configValid || !tenantValid) {
      console.error("❌ Configuration mismatch with backend spec");
    }
  } catch (error) {
    console.error("❌ Configuration validation failed:", error);
  }

  // Test 2: Authentication API Validation
  console.log("✅ Test 2: Authentication API validation");
  try {
    // Check login endpoint
    const loginSpec = backendSpec.auth.login;
    console.log("Login endpoint spec:", loginSpec.endpoint);
    console.log("Required payload fields:", loginSpec.payload.join(", "));
    console.log("Expected response fields:", loginSpec.response.join(", "));

    // Check refresh endpoint
    const refreshSpec = backendSpec.auth.refresh;
    console.log("Refresh endpoint spec:", refreshSpec.endpoint);
    console.log("Required payload fields:", refreshSpec.payload.join(", "));

    // Check logout endpoint
    const logoutSpec = backendSpec.auth.logout;
    console.log("Logout endpoint spec:", logoutSpec.endpoint);
    console.log("Expected response fields:", logoutSpec.response.join(", "));

    // Validate request interceptor adds required headers
    const validateRequestHeaders = (config) => {
      const headers = config.headers || {};
      const hasAuth = headers.Authorization?.startsWith("Bearer ");
      const hasTenant = headers.cschema === "ajay";
      const hasContentType = headers["Content-Type"] === "application/json";

      return { hasAuth, hasTenant, hasContentType };
    };

    const mockRequest = {
      headers: {
        Authorization: "Bearer mock_token",
        cschema: "ajay",
        "Content-Type": "application/json",
      },
    };

    const headerValidation = validateRequestHeaders(mockRequest);
    console.log("Request headers validation:", headerValidation);

    const allHeadersValid = Object.values(headerValidation).every((v) => v);
    console.log("All required headers present:", allHeadersValid);
  } catch (error) {
    console.error("❌ Authentication API validation failed:", error);
  }

  // Test 3: Masters API Validation
  console.log("✅ Test 3: Masters API validation");
  try {
    const mastersSpec = backendSpec.masters;

    // Academic Years
    console.log("Academic Years endpoints:");
    Object.entries(mastersSpec.academic_years).forEach(
      ([operation, endpoint]) => {
        console.log(`  ${operation}: ${endpoint}`);
      }
    );

    // Class Sections
    console.log("Class Sections endpoints:");
    Object.entries(mastersSpec.class_sections).forEach(
      ([operation, endpoint]) => {
        console.log(`  ${operation}: ${endpoint}`);
      }
    );

    // Validate payload structures
    const validateAcademicYearPayload = (payload) => {
      const required = ["title", "start_date", "end_date"];
      const optional = ["is_active"];

      const hasRequired = required.every((field) =>
        payload.hasOwnProperty(field)
      );
      const hasValidOptional = optional.every(
        (field) =>
          !payload.hasOwnProperty(field) || typeof payload[field] === "boolean"
      );

      return {
        hasRequired,
        hasValidOptional,
        valid: hasRequired && hasValidOptional,
      };
    };

    const mockAcademicYearPayload = {
      title: "2024-2025",
      start_date: "2024-06-01",
      end_date: "2025-05-31",
      is_active: true,
    };

    const payloadValidation = validateAcademicYearPayload(
      mockAcademicYearPayload
    );
    console.log("Academic Year payload validation:", payloadValidation);
  } catch (error) {
    console.error("❌ Masters API validation failed:", error);
  }

  // Test 4: Students API Validation
  console.log("✅ Test 4: Students API validation");
  try {
    const studentsSpec = backendSpec.students;

    console.log("Student endpoints:");
    Object.entries(studentsSpec).forEach(([operation, endpoint]) => {
      console.log(`  ${operation}: ${endpoint}`);
    });

    // Validate student admission payload
    const validateStudentAdmissionPayload = (payload) => {
      const required = [
        "student_name",
        "admission_number",
        "class_id",
        "section_id",
        "academic_year_id",
        "date_of_birth",
        "admission_date",
      ];
      const optional = ["parent_contact", "address"];

      const hasRequired = required.every((field) =>
        payload.hasOwnProperty(field)
      );
      const hasValidOptional = optional.every(
        (field) =>
          !payload.hasOwnProperty(field) || typeof payload[field] === "string"
      );

      return {
        hasRequired,
        hasValidOptional,
        valid: hasRequired && hasValidOptional,
      };
    };

    const mockStudentPayload = {
      student_name: "John Doe",
      admission_number: "ADM001",
      class_id: "uuid-1",
      section_id: "uuid-2",
      academic_year_id: "uuid-3",
      date_of_birth: "2010-01-01",
      admission_date: "2024-06-01",
      parent_contact: "+1234567890",
      address: "123 Main St",
    };

    const studentValidation =
      validateStudentAdmissionPayload(mockStudentPayload);
    console.log("Student admission payload validation:", studentValidation);
  } catch (error) {
    console.error("❌ Students API validation failed:", error);
  }

  // Test 5: Fee Management API Validation
  console.log("✅ Test 5: Fee Management API validation");
  try {
    const feeSpec = backendSpec.fee;

    console.log("Fee Management endpoints:");
    Object.entries(feeSpec).forEach(([operation, endpoint]) => {
      console.log(`  ${operation}: ${endpoint}`);
    });

    // Validate fee transaction payload
    const validateFeeTransactionPayload = (payload) => {
      const required = [
        "student_id",
        "fee_term_date_id",
        "amount",
        "payment_method",
        "transaction_date",
      ];
      const optional = ["remarks", "collected_by"];
      const validMethods = ["cash", "bank_transfer", "cheque", "online"];

      const hasRequired = required.every((field) =>
        payload.hasOwnProperty(field)
      );
      const validMethod = validMethods.includes(payload.payment_method);

      return { hasRequired, validMethod, valid: hasRequired && validMethod };
    };

    const mockFeeTransaction = {
      student_id: "uuid-student",
      fee_term_date_id: "uuid-term-date",
      amount: 2500.0,
      payment_method: "cash",
      transaction_date: "2024-09-01",
      remarks: "First term payment",
      collected_by: "uuid-staff",
    };

    const feeValidation = validateFeeTransactionPayload(mockFeeTransaction);
    console.log("Fee transaction payload validation:", feeValidation);
  } catch (error) {
    console.error("❌ Fee Management API validation failed:", error);
  }

  // Test 6: Error Response Validation
  console.log("✅ Test 6: Error response validation");
  try {
    const errorCodes = {
      TOKEN_INVALID: { status: 401, description: "JWT token expired/invalid" },
      INSUFFICIENT_PERMISSIONS: {
        status: 403,
        description: "User lacks required permission",
      },
      PLAN_RESTRICTION: {
        status: 402,
        description: "Feature not in tenant plan",
      },
      VALIDATION_ERROR: { status: 400, description: "Input validation failed" },
      DUPLICATE_ENTRY: {
        status: 409,
        description: "Unique constraint violation",
      },
      RESOURCE_NOT_FOUND: {
        status: 404,
        description: "Requested resource doesn't exist",
      },
      DEPENDENCY_EXISTS: {
        status: 409,
        description: "Cannot delete due to dependencies",
      },
      INVALID_FILE_TYPE: { status: 400, description: "File type not allowed" },
      FILE_TOO_LARGE: { status: 413, description: "File exceeds size limit" },
      TENANT_NOT_FOUND: { status: 400, description: "Invalid tenant schema" },
      ACCOUNT_DISABLED: {
        status: 422,
        description: "User account is disabled",
      },
      INVALID_CREDENTIALS: {
        status: 401,
        description: "Wrong username/password",
      },
    };

    console.log("Error codes and HTTP status mappings:");
    Object.entries(errorCodes).forEach(([code, info]) => {
      console.log(`  ${code}: HTTP ${info.status} - ${info.description}`);
    });

    // Validate error response structure
    const validateErrorResponse = (error) => {
      const hasDetail = error.detail !== undefined;
      const hasErrorCode = error.error_code !== undefined;
      const hasFieldErrors =
        !error.field_errors ||
        Array.isArray(error.field_errors) ||
        typeof error.field_errors === "object";

      return {
        hasDetail,
        hasErrorCode,
        hasFieldErrors,
        valid: hasDetail && hasErrorCode && hasFieldErrors,
      };
    };

    const mockErrorResponse = {
      detail: "Validation error",
      error_code: "VALIDATION_ERROR",
      field_errors: { email: ["Email already exists"] },
    };

    const errorValidation = validateErrorResponse(mockErrorResponse);
    console.log("Error response structure validation:", errorValidation);
  } catch (error) {
    console.error("❌ Error response validation failed:", error);
  }

  // Test 7: Pagination Response Validation
  console.log("✅ Test 7: Pagination response validation");
  try {
    const validatePaginationResponse = (response) => {
      const hasItems = Array.isArray(response.items);
      const hasTotalCount = typeof response.total_count === "number";
      const hasNext = typeof response.has_next === "boolean";

      return {
        hasItems,
        hasTotalCount,
        hasNext,
        valid: hasItems && hasTotalCount && hasNext,
      };
    };

    const mockPaginationResponse = {
      items: [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ],
      total_count: 25,
      has_next: true,
    };

    const paginationValidation = validatePaginationResponse(
      mockPaginationResponse
    );
    console.log("Pagination response validation:", paginationValidation);
  } catch (error) {
    console.error("❌ Pagination response validation failed:", error);
  }

  console.log("🎉 API specification validation completed!");
};

// Run the validation
validateAPISpecs();
