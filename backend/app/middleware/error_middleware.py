"""
Global Error Handling Middleware for COS360 Application

Provides centralized error handling with tenant context enforcement,
request correlation tracking, and standardized error responses.
"""

import uuid
import logging
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError, ProgrammingError
from pydantic import ValidationError

from app.tools.error_handler import (
    create_error_response,
    ErrorCategory,
    get_request_id,
    get_tenant_context
)
from app.tools.database_error_mapper import map_database_error
from app.config import settings

logger = logging.getLogger("error_middleware")


class GlobalErrorMiddleware(BaseHTTPMiddleware):
    """
    Global error handling middleware that catches all exceptions
    and provides standardized error responses with tenant context.
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.logger = logger
        
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Main middleware dispatch method that handles all requests and errors.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in the chain
            
        Returns:
            Response: Standardized error response or normal response
        """
        # Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        
        # Extract tenant context if available
        tenant_context = self._extract_tenant_context(request)
        request.state.tenant_context = tenant_context
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            if tenant_context:
                response.headers["X-Tenant-Context"] = tenant_context
            
            return response
            
        except HTTPException as http_exc:
            # Handle FastAPI HTTP exceptions
            return await self._handle_http_exception(request, http_exc, correlation_id, tenant_context)
            
        except RequestValidationError as validation_exc:
            # Handle Pydantic validation errors
            return await self._handle_validation_error(request, validation_exc, correlation_id, tenant_context)
            
        except (IntegrityError, OperationalError, ProgrammingError) as db_exc:
            # Handle database-specific errors
            return await self._handle_database_error(request, db_exc, correlation_id, tenant_context)
            
        except SQLAlchemyError as sql_exc:
            # Handle general SQLAlchemy errors
            return await self._handle_sqlalchemy_error(request, sql_exc, correlation_id, tenant_context)
            
        except ValidationError as pydantic_exc:
            # Handle Pydantic model validation errors
            return await self._handle_pydantic_validation_error(request, pydantic_exc, correlation_id, tenant_context)
            
        except Exception as exc:
            # Handle all other unexpected exceptions
            return await self._handle_unexpected_error(request, exc, correlation_id, tenant_context)
    
    def _extract_tenant_context(self, request: Request) -> Optional[str]:
        """
        Extract tenant context from request headers.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Optional[str]: Tenant context (cschema) if available
        """
        # Check for cschema header (primary tenant identifier)
        cschema = request.headers.get("cschema")
        if cschema:
            return cschema
            
        # Check for X-Client-Name header (fallback)
        client_name = request.headers.get("X-Client-Name")
        if client_name:
            return client_name
            
        # Check request state for tenant context (set by tenant middleware)
        if hasattr(request.state, 'client_name') and request.state.client_name != "bypass":
            return request.state.client_name
            
        return None
    
    async def _handle_http_exception(
        self, 
        request: Request, 
        exc: HTTPException, 
        correlation_id: str, 
        tenant_context: Optional[str]
    ) -> JSONResponse:
        """
        Handle FastAPI HTTP exceptions with standardized error response.
        """
        # Map HTTP status codes to appropriate error codes
        status_code_mapping = {
            400: "VALIDATION_ERROR",
            401: "AUTHORIZATION_ERROR", 
            403: "PERMISSION_ERROR",
            404: "NOT_FOUND_ERROR",
            405: "METHOD_NOT_ALLOWED_ERROR",
            408: "REQUEST_TIMEOUT_ERROR",
            409: "CONFLICT_ERROR",
            413: "PAYLOAD_TOO_LARGE_ERROR",
            415: "UNSUPPORTED_MEDIA_TYPE_ERROR",
            422: "BUSINESS_RULE_ERROR",
            429: "RATE_LIMIT_ERROR",
            500: "SYSTEM_ERROR",
            503: "SERVICE_UNAVAILABLE_ERROR",
            504: "GATEWAY_TIMEOUT_ERROR"
        }
        
        error_code = status_code_mapping.get(exc.status_code, f"HTTP_{exc.status_code}")
        
        error_response = {
            "error_code": error_code,
            "message": exc.detail,
            "details": {
                "status_code": exc.status_code,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
                "method": request.method
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": correlation_id
        }
        
        # Add tenant context if available
        if tenant_context:
            error_response["cschema"] = tenant_context
            error_response["details"]["tenant_context"] = tenant_context
        
        # Log the error
        self.logger.warning(
            f"HTTP Exception: {exc.status_code} - {exc.detail} | "
            f"Correlation ID: {correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"Path: {request.url.path}"
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response,
            headers={
                "X-Correlation-ID": correlation_id,
                "X-Error-Category": "HTTP_EXCEPTION"
            }
        )
    
    async def _handle_validation_error(
        self, 
        request: Request, 
        exc: RequestValidationError, 
        correlation_id: str, 
        tenant_context: Optional[str]
    ) -> JSONResponse:
        """
        Handle FastAPI request validation errors.
        """
        # Format validation errors for better user experience
        formatted_errors = []
        for error in exc.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            formatted_errors.append({
                "field": field_path,
                "message": error["msg"],
                "type": error["type"],
                "input": error.get("input")
            })
        
        error_response = {
            "error_code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {
                "validation_errors": formatted_errors,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
                "method": request.method
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": correlation_id
        }
        
        # Add tenant context if available
        if tenant_context:
            error_response["cschema"] = tenant_context
            error_response["details"]["tenant_context"] = tenant_context
        
        # Log the validation error
        self.logger.warning(
            f"Validation Error: {len(formatted_errors)} validation failures | "
            f"Correlation ID: {correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"Path: {request.url.path}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response,
            headers={
                "X-Correlation-ID": correlation_id,
                "X-Error-Category": "VALIDATION_ERROR"
            }
        )
    
    async def _handle_database_error(
        self, 
        request: Request, 
        exc: Exception, 
        correlation_id: str, 
        tenant_context: Optional[str]
    ) -> JSONResponse:
        """
        Handle database-specific errors with constraint mapping.
        """
        # Map database error to user-friendly message
        error_code, message, details = map_database_error(exc)
        
        error_response = {
            "error_code": error_code,
            "message": message,
            "details": {
                "constraint": details.get("constraint"),
                "table": details.get("table"),
                "column": details.get("column"),
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
                "method": request.method
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": correlation_id
        }
        
        # Add tenant context if available
        if tenant_context:
            error_response["cschema"] = tenant_context
            error_response["details"]["tenant_context"] = tenant_context
        
        # Log the database error
        self.logger.error(
            f"Database Error: {error_code} - {message} | "
            f"Correlation ID: {correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"Path: {request.url.path} | "
            f"Original Error: {str(exc)}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_response,
            headers={
                "X-Correlation-ID": correlation_id,
                "X-Error-Category": "DATABASE_ERROR"
            }
        )
    
    async def _handle_sqlalchemy_error(
        self, 
        request: Request, 
        exc: SQLAlchemyError, 
        correlation_id: str, 
        tenant_context: Optional[str]
    ) -> JSONResponse:
        """
        Handle general SQLAlchemy errors.
        """
        error_response = {
            "error_code": "DATABASE_ERROR",
            "message": "Database operation failed",
            "details": {
                "error_type": type(exc).__name__,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
                "method": request.method
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": correlation_id
        }
        
        # Add tenant context if available
        if tenant_context:
            error_response["cschema"] = tenant_context
            error_response["details"]["tenant_context"] = tenant_context
        
        # Log the SQLAlchemy error
        self.logger.error(
            f"SQLAlchemy Error: {type(exc).__name__} - {str(exc)} | "
            f"Correlation ID: {correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"Path: {request.url.path}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response,
            headers={
                "X-Correlation-ID": correlation_id,
                "X-Error-Category": "DATABASE_ERROR"
            }
        )
    
    async def _handle_pydantic_validation_error(
        self, 
        request: Request, 
        exc: ValidationError, 
        correlation_id: str, 
        tenant_context: Optional[str]
    ) -> JSONResponse:
        """
        Handle Pydantic model validation errors.
        """
        # Format Pydantic validation errors
        formatted_errors = []
        for error in exc.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            formatted_errors.append({
                "field": field_path,
                "message": error["msg"],
                "type": error["type"],
                "input": error.get("input")
            })
        
        error_response = {
            "error_code": "MODEL_VALIDATION_ERROR",
            "message": "Data model validation failed",
            "details": {
                "validation_errors": formatted_errors,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
                "method": request.method
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": correlation_id
        }
        
        # Add tenant context if available
        if tenant_context:
            error_response["cschema"] = tenant_context
            error_response["details"]["tenant_context"] = tenant_context
        
        # Log the Pydantic validation error
        self.logger.warning(
            f"Pydantic Validation Error: {len(formatted_errors)} validation failures | "
            f"Correlation ID: {correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"Path: {request.url.path}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response,
            headers={
                "X-Correlation-ID": correlation_id,
                "X-Error-Category": "MODEL_VALIDATION_ERROR"
            }
        )
    
    async def _handle_unexpected_error(
        self, 
        request: Request, 
        exc: Exception, 
        correlation_id: str, 
        tenant_context: Optional[str]
    ) -> JSONResponse:
        """
        Handle unexpected errors with full error details in development mode.
        """
        # Prepare error response
        error_response = {
            "error_code": "SYSTEM_ERROR",
            "message": "An unexpected error occurred",
            "details": {
                "error_type": type(exc).__name__,
                "correlation_id": correlation_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": str(request.url.path),
                "method": request.method
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": correlation_id
        }
        
        # Add tenant context if available
        if tenant_context:
            error_response["cschema"] = tenant_context
            error_response["details"]["tenant_context"] = tenant_context
        
        # Add detailed error information in development mode
        if settings.DEBUG:
            error_response["details"]["traceback"] = traceback.format_exc()
            error_response["details"]["original_error"] = str(exc)
        
        # Log the unexpected error
        self.logger.error(
            f"Unexpected Error: {type(exc).__name__} - {str(exc)} | "
            f"Correlation ID: {correlation_id} | "
            f"Tenant: {tenant_context} | "
            f"Path: {request.url.path} | "
            f"Traceback: {traceback.format_exc()}"
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response,
            headers={
                "X-Correlation-ID": correlation_id,
                "X-Error-Category": "SYSTEM_ERROR"
            }
        )


# Export the middleware class
__all__ = ["GlobalErrorMiddleware"]
