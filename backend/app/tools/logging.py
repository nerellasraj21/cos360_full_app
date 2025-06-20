import logging
from enum import Enum

LOG_FORMAT_DEBUG = "%(levelname)s:%(message)s:%(pathname)s:%(funcName)s:%(lineno)d"

class LogLevel(Enum):
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL

# Function to configure logging
def configure_logging(level: LogLevel = LogLevel.INFO, log_format: str = LOG_FORMAT_DEBUG, log_file: str = None):
    if log_file:
        logging.basicConfig(filename=log_file, level=level.value, format=log_format)
    else:
        logging.basicConfig(level=level.value, format=log_format)