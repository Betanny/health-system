# API Documentation - Health System

## Base URL

(Assuming the API is served from the root of your Next.js application)
Example: `http://localhost:3000` or your production domain.

## Authentication

Most endpoints require authentication using a **Bearer Token** provided in the `Authorization` header.

```
Authorization: Bearer <your_access_token>
```

Tokens are obtained via the `/api/auth/sign-in` endpoint and can be refreshed using `/api/auth/refresh`.

## Standard Data Types

*   **UUID:** All IDs (`clientId`, `programId`, `enrollmentId`, `userId`) are strings in UUID format (e.g., `a1b2c3d4-e5f6-7890-1234-567890abcdef`).
*   **Date:** Dates (`enrollmentDate`, `dateOfBirth`) are expected/returned as strings in `YYYY-MM-DD` format.
*   **Timestamp:** Timestamps (`createdAt`, `updatedAt`) are returned as ISO 8601 strings (e.g., `2023-10-27T10:30:00.000Z`).

## Standard Error Responses

Errors generally follow this format:

```json
// 4xx Client Error (e.g., Bad Request, Unauthorized, Not Found, Conflict)
{
  "message": "Descriptive error message",
  "errors": { // Optional: included for validation errors (400)
    "fieldName": ["Error message for this field"] 
  } 
}

// 5xx Server Error
{
  "message": "Generic internal server error message" 
}
```

---

## Authentication (`/api/auth`)

### `POST /api/auth/register`

Registers a new user account required for API access.

*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com", // Required, valid email format
      "password": "yoursecurepassword" // Required, min 8 characters
      // Add any other required fields defined in registerSchema (e.g., name)
    }
    ```
*   **Responses:**
    *   `201 Created`: User registered successfully.
        ```json
        {
          "message": "User registered successfully",
          "user": {
            "id": "user-uuid",
            "email": "user@example.com",
            // Other non-sensitive user fields included at creation
            "createdAt": "iso-timestamp",
            "updatedAt": "iso-timestamp"
          }
        }
        ```
    *   `400 Bad Request`: Validation failed (e.g., invalid email, password too short). Includes `errors` object.
    *   `409 Conflict`: User with the provided email already exists.
    *   `500 Internal Server Error`: Database error or other server issue during registration.

### `POST /api/auth/sign-in`

Authenticates a user and returns JWT access and refresh tokens.

*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "email": "user@example.com", // Required
      "password": "yoursecurepassword" // Required
    }
    ```
*   **Responses:**
    *   `200 OK`: Sign in successful.
        ```json
        {
          "message": "Sign in successful",
          "accessToken": "your_jwt_access_token",
          "refreshToken": "your_jwt_refresh_token",
          "user": {
            "id": "user-uuid",
            "email": "user@example.com",
            // Other non-sensitive user fields
            "createdAt": "iso-timestamp",
            "updatedAt": "iso-timestamp"
          }
        }
        ```
    *   `400 Bad Request`: Validation failed (missing email/password). Includes `errors` object.
    *   `401 Unauthorized`: Invalid email or password.
    *   `500 Internal Server Error`: Database error, password comparison error, token generation/storage error.

### `POST /api/auth/refresh`

Provides a new access token using a valid refresh token. Implements refresh token rotation (issues a new refresh token as well).

*   **Authentication:** None required directly, but requires a valid `refreshToken` in the body.
*   **Request Body:**
    ```json
    {
      "refreshToken": "your_valid_refresh_token" // Required
    }
    ```
*   **Responses:**
    *   `200 OK`: Token refreshed successfully.
        ```json
        {
          "message": "Token refreshed successfully",
          "accessToken": "new_jwt_access_token",
          "refreshToken": "new_jwt_refresh_token" // Returns a NEW refresh token
        }
        ```
    *   `400 Bad Request`: Missing `refreshToken` in the body.
    *   `401 Unauthorized`: Invalid, expired, or revoked refresh token; or the associated user no longer exists.
    *   `500 Internal Server Error`: Database error during validation, token generation, or storage.

### `POST /api/auth/revoke`

Revokes refresh tokens for the authenticated user.

*   **Authentication:** **Required** (Bearer Access Token).
*   **Request Body:**
    *   *Option 1: Revoke specific token*
        ```json
        {
          "refreshToken": "refresh_token_to_revoke" // Required
        }
        ```
    *   *Option 2: Revoke all tokens* (Send an empty body or `{}`)
*   **Responses:**
    *   `200 OK`: Token(s) revoked successfully.
        ```json
        {
          // Message will indicate specific or all tokens revoked
          "message": "Refresh token revoked successfully" 
          // or "All refresh tokens revoked successfully"
        }
        ```
    *   `400 Bad Request`: Missing `refreshToken` when attempting specific revoke.
    *   `401 Unauthorized`: Invalid or missing access token (handled by middleware).
    *   `500 Internal Server Error`: Database error during revocation.

---

## Clients (`/api/clients`)

**Note:** Client data (names, contact info, etc.) is **returned decrypted** by these API endpoints. The data is encrypted before being stored via `POST`/`PUT` operations.

### `GET /api/clients`

Retrieves a list of all clients.

*   **Authentication:** **Required** (Bearer Token).
*   **Query Parameters:** None supported (search is disabled due to encryption).
*   **Responses:**
    *   `200 OK`: Returns an array of client objects.
        ```json
        [
          {
            "id": "client-uuid-1",
            "firstName": "DecryptedFirstName",
            "lastName": "DecryptedLastName",
            "dateOfBirth": "YYYY-MM-DD", // Decrypted
            "gender": "DecryptedGender", // or ""
            "contactNumber": "DecryptedContact", // Decrypted
            "email": "decrypted@example.com", // Decrypted
            "address": "DecryptedAddress", // or ""
            "createdAt": "iso-timestamp",
            "updatedAt": "iso-timestamp"
          },
          // ... more clients
        ]
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `500 Internal Server Error`: Database error.

### `POST /api/clients`

Creates a new client.

*   **Authentication:** **Required** (Bearer Token).
*   **Request Body:** Matches `ClientSchema` (all fields except IDs/timestamps required, `gender`/`address` optional). Data will be encrypted server-side.
    ```json
    {
      "firstName": "John", // Required
      "lastName": "Doe", // Required
      "dateOfBirth": "1990-05-15", // Required, YYYY-MM-DD
      "gender": "Male", // Optional
      "contactNumber": "123-456-7890", // Required
      "email": "john.doe@example.com", // Required, valid email
      "address": "123 Main St" // Optional
    }
    ```
*   **Responses:**
    *   `201 Created`: Client created successfully. Returns the new client object (decrypted).
        ```json
        { 
          "id": "new-client-uuid", 
          "firstName": "John", // Decrypted
          // ... other decrypted fields ... 
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp"
        }
        ```
    *   `400 Bad Request`: Validation failed. Includes `errors` object.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `409 Conflict`: Email address already exists.
    *   `500 Internal Server Error`: Database error or encryption error.

### `GET /api/clients/{clientId}`

Retrieves a specific client by their ID, including their program enrollments.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `clientId` (UUID): The ID of the client to retrieve.
*   **Responses:**
    *   `200 OK`: Returns the client object with enrollments (client data and enrollment notes decrypted).
        ```json
        {
          "id": "client-uuid",
          "firstName": "DecryptedFirstName",
          "lastName": "DecryptedLastName",
          // ... other decrypted client fields ...
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp",
          "enrollments": [
            {
              "id": "enrollment-uuid",
              "clientId": "client-uuid",
              "programId": "program-uuid",
              "enrollmentDate": "YYYY-MM-DD",
              "status": "active", // or completed, withdrawn
              "notes": "Decrypted notes here...", // Decrypted, or null/undefined
              "createdAt": "iso-timestamp",
              "updatedAt": "iso-timestamp",
              "client": { // Simplified nested client
                 "id": "client-uuid",
                 "firstName": "DecryptedFirstName",
                 "lastName": "DecryptedLastName"
              },
              "program": { // Simplified nested program (name assumed not encrypted)
                 "id": "program-uuid",
                 "name": "Program Name"
              }
            },
            // ... more enrollments
          ]
        }
        ```
    *   `400 Bad Request`: Invalid `clientId` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Client with the specified ID not found.
    *   `500 Internal Server Error`: Database error.

### `PUT /api/clients/{clientId}`

Updates an existing client. Allows partial updates.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `clientId` (UUID): The ID of the client to update.
*   **Request Body:** A JSON object containing the fields to update. Matches structure of `ClientSchema`, but fields are optional. Data will be encrypted server-side.
    ```json
    {
      "contactNumber": "987-654-3210", // Example: update only contact number
      "address": "456 New Address" 
    }
    ```
*   **Responses:**
    *   `200 OK`: Update successful. Returns the updated client object (decrypted).
        ```json
        { 
          "id": "client-uuid", 
          "firstName": "DecryptedFirstName", // Unchanged fields also returned
          "contactNumber": "987-654-3210", // Updated field
          // ... other decrypted fields ...
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp-of-update" 
        }
        ```
    *   `400 Bad Request`: Invalid `clientId` format, validation failed on body fields, or no valid fields provided for update. Includes `errors` object for validation failures.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Client with the specified ID not found.
    *   `409 Conflict`: Update would result in a duplicate email address.
    *   `500 Internal Server Error`: Database error or encryption error.

### `DELETE /api/clients/{clientId}`

Deletes a specific client and their associated enrollments (due to cascade).

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `clientId` (UUID): The ID of the client to delete.
*   **Responses:**
    *   `204 No Content`: Client deleted successfully.
    *   `400 Bad Request`: Invalid `clientId` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Client with the specified ID not found.
    *   `500 Internal Server Error`: Database error.

### `GET /api/clients/{clientId}/enrollments`

Retrieves all enrollments for a specific client.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `clientId` (UUID): The ID of the client whose enrollments to retrieve.
*   **Responses:**
    *   `200 OK`: Returns an array of enrollment objects (enrollment notes decrypted). Client info within each enrollment is *not* included by default in this specific route's action (`getEnrollmentsByClientApi`), but the mapper includes basic ID/Name fallbacks.
        ```json
        [
          {
              "id": "enrollment-uuid",
              "clientId": "client-uuid",
              "programId": "program-uuid",
              "enrollmentDate": "YYYY-MM-DD",
              "status": "active", 
              "notes": "Decrypted notes...", // Decrypted
              "createdAt": "iso-timestamp",
              "updatedAt": "iso-timestamp",
              "client": { // Simplified nested client (Names likely MISSING unless query is modified)
                 "id": "client-uuid",
                 "firstName": "[MISSING]", 
                 "lastName": "[DATA]" 
              },
              "program": { // Simplified nested program
                 "id": "program-uuid",
                 "name": "Program Name"
              }
          },
          // ... more enrollments for this client
        ]
        ```
    *   `400 Bad Request`: Invalid `clientId` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `500 Internal Server Error`: Database error. (Note: Returns empty array `[]` if client exists but has no enrollments, not a 404).

---

## Programs (`/api/programs`)

### `GET /api/programs`

Retrieves a list of all available health programs.

*   **Authentication:** **Required** (Bearer Token).
*   **Responses:**
    *   `200 OK`: Returns an array of program objects.
        ```json
        [
          {
            "id": "program-uuid-1",
            "name": "TB Program",
            "description": "Program description here",
            "createdAt": "iso-timestamp",
            "updatedAt": "iso-timestamp"
          },
          // ... more programs
        ]
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `500 Internal Server Error`: Database error.

### `POST /api/programs`

Creates a new health program.

*   **Authentication:** **Required** (Bearer Token).
*   **Request Body:**
    ```json
    {
      "name": "New HIV Program", // Required
      "description": "Details about the program." // Optional
    }
    ```
*   **Responses:**
    *   `201 Created`: Program created successfully. Returns the new program object.
        ```json
        { 
          "id": "new-program-uuid",
          "name": "New HIV Program",
          "description": "Details about the program.",
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp"
        }
        ```
    *   `400 Bad Request`: Validation failed (e.g., missing name). Includes `errors` object.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `409 Conflict`: A program with this name already exists.
    *   `500 Internal Server Error`: Database error.

### `GET /api/programs/{id}`

Retrieves a specific program by its ID.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `id` (UUID): The ID of the program to retrieve.
*   **Responses:**
    *   `200 OK`: Returns the program object.
        ```json
        {
          "id": "program-uuid",
          "name": "TB Program",
          "description": "Program description here",
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp"
        }
        ```
    *   `400 Bad Request`: Invalid `id` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Program with the specified ID not found.
    *   `500 Internal Server Error`: Database error.

### `PUT /api/programs/{id}`

Updates an existing program. Allows partial updates.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `id` (UUID): The ID of the program to update.
*   **Request Body:** JSON object with optional `name` and/or `description`.
    ```json
    {
      "description": "Updated program details." 
    }
    ```
*   **Responses:**
    *   `200 OK`: Update successful. Returns the updated program object.
        ```json
        { 
          "id": "program-uuid", 
          "name": "Program Name", // Unchanged if not provided
          "description": "Updated program details.", // Updated
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp-of-update" 
        }
        ```
    *   `400 Bad Request`: Invalid `id` format, validation failed on body fields, or no valid fields provided for update. Includes `errors` object for validation failures.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Program with the specified ID not found.
    *   `409 Conflict`: Update would result in a duplicate program name.
    *   `500 Internal Server Error`: Database error.

### `DELETE /api/programs/{id}`

Deletes a specific program. Fails if the program has associated enrollments.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `id` (UUID): The ID of the program to delete.
*   **Responses:**
    *   `204 No Content`: Program deleted successfully.
    *   `400 Bad Request`: Invalid `id` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Program with the specified ID not found.
    *   `409 Conflict`: Cannot delete program because it has associated enrollments.
    *   `500 Internal Server Error`: Database error.

---

## Enrollments (`/api/enrollments`)

**Note:** Enrollment `notes` are **returned decrypted** by these API endpoints. The data is encrypted before being stored via `POST`/`PUT` operations.

### `GET /api/enrollments`

Retrieves a list of all enrollments with simplified client and program details.

*   **Authentication:** **Required** (Bearer Token).
*   **Responses:**
    *   `200 OK`: Returns an array of enrollment objects (notes and client names decrypted).
        ```json
        [
          {
            "id": "enrollment-uuid-1",
            "clientId": "client-uuid-1",
            "programId": "program-uuid-1",
            "enrollmentDate": "YYYY-MM-DD",
            "status": "active",
            "notes": "Decrypted notes...", // Decrypted
            "createdAt": "iso-timestamp",
            "updatedAt": "iso-timestamp",
            "client": { // Simplified nested client
               "id": "client-uuid-1",
               "firstName": "DecryptedFirstName",
               "lastName": "DecryptedLastName"
            },
            "program": { // Simplified nested program
               "id": "program-uuid-1",
               "name": "Program Name"
            }
          },
          // ... more enrollments
        ]
        ```
    *   `401 Unauthorized`: Invalid or missing token.
    *   `500 Internal Server Error`: Database error.

### `POST /api/enrollments`

Creates a new enrollment for a client in a program.

*   **Authentication:** **Required** (Bearer Token).
*   **Request Body:** Matches `EnrollmentSchema`. Notes will be encrypted server-side.
    ```json
    {
      "clientId": "client-uuid", // Required
      "programId": "program-uuid", // Required
      "enrollmentDate": "YYYY-MM-DD", // Required
      "status": "active", // Required ("active", "completed", "withdrawn")
      "notes": "Initial enrollment notes." // Optional
    }
    ```
*   **Responses:**
    *   `201 Created`: Enrollment created successfully. Returns the new enrollment object with details (notes decrypted).
        ```json
        { 
          "id": "new-enrollment-uuid", 
          "clientId": "client-uuid",
          "programId": "program-uuid",
          // ... other fields ...
          "notes": "Initial enrollment notes.", // Decrypted
          "client": { /* simplified client */ },
          "program": { /* simplified program */ }
        }
        ```
    *   `400 Bad Request`: Validation failed (e.g., invalid ID format, missing required fields, invalid status) or Invalid Client/Program ID provided. Includes `errors` object for validation failures.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `409 Conflict`: Client is already enrolled in this specific program.
    *   `500 Internal Server Error`: Database error or encryption error.

### `GET /api/enrollments/{id}`

Retrieves a specific enrollment by its ID, including simplified client and program details.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `id` (UUID): The ID of the enrollment to retrieve.
*   **Responses:**
    *   `200 OK`: Returns the enrollment object (notes decrypted).
        ```json
        {
          "id": "enrollment-uuid",
          "clientId": "client-uuid",
          "programId": "program-uuid",
          "enrollmentDate": "YYYY-MM-DD",
          "status": "active",
          "notes": "Decrypted notes...", // Decrypted
          "createdAt": "iso-timestamp",
          "updatedAt": "iso-timestamp",
          "client": { /* simplified client */ },
          "program": { /* simplified program */ }
        }
        ```
    *   `400 Bad Request`: Invalid `id` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Enrollment with the specified ID not found.
    *   `500 Internal Server Error`: Database error.

### `PUT /api/enrollments/{id}`

Updates an existing enrollment (status, date, notes). Allows partial updates.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `id` (UUID): The ID of the enrollment to update.
*   **Request Body:** JSON object with optional `enrollmentDate`, `status`, `notes`. `notes` will be encrypted. Setting `notes` to `null` will clear them.
    ```json
    {
      "status": "completed", 
      "notes": "Updated notes for completion." // Optional, encrypts value
      // or "notes": null // to clear notes
    }
    ```
*   **Responses:**
    *   `200 OK`: Update successful. Returns the updated enrollment object (notes decrypted).
        ```json
        { 
          "id": "enrollment-uuid", 
          "status": "completed", // Updated
          "notes": "Updated notes for completion.", // Decrypted updated notes
          // ... other fields ...
          "updatedAt": "iso-timestamp-of-update",
          "client": { /* simplified client */ },
          "program": { /* simplified program */ }
        }
        ```
    *   `400 Bad Request`: Invalid `id` format, validation failed on body fields, or no valid fields provided for update. Includes `errors` object for validation failures.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Enrollment with the specified ID not found.
    *   `500 Internal Server Error`: Database error or encryption error.

### `DELETE /api/enrollments/{id}`

Deletes a specific enrollment.

*   **Authentication:** **Required** (Bearer Token).
*   **Path Parameters:**
    *   `id` (UUID): The ID of the enrollment to delete.
*   **Responses:**
    *   `204 No Content`: Enrollment deleted successfully.
    *   `400 Bad Request`: Invalid `id` format.
    *   `401 Unauthorized`: Invalid or missing token.
    *   `404 Not Found`: Enrollment with the specified ID not found.
    *   `500 Internal Server Error`: Database error.
