from sqlalchemy import MetaData
from sqlalchemy.orm import declarative_base

# For public schema (fixed schema name)
public_metadata = MetaData(schema="public")
BasePublic = declarative_base(metadata=public_metadata)

# For org schema (dynamic via search_path)
org_metadata = MetaData()  # no fixed schema; search_path will be set dynamically
BaseOrg = declarative_base(metadata=org_metadata)

Base = BaseOrg  # Default base class for models, can be overridden if needed
