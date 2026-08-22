import uuid
import structlog
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

def filter_sensitive_data(logger, log_method, event_dict):
    sensitive_keys = {"password", "api_key", "token", "JWT_SECRET"}
    for key in sensitive_keys:
        if key in event_dict:
            event_dict[key] = "***"
    return event_dict

def configure_logging():
    structlog.configure(
        processors=[
            filter_sensitive_data,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    logging.basicConfig(format="%(message)s", level=logging.INFO)

def get_logger(name: str = None):
    return structlog.get_logger(name)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
