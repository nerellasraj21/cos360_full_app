from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:Passw0rd!@localhost/postgres"

engine = create_async_engine(DATABASE_URL, echo=True)
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# AsyncSessionLocal = sessionmaker(
#     bind=engine, class_=AsyncSession, expire_on_commit=False
# )
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# Apply search_path on each new connection
@event.listens_for(engine.sync_engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute('SET search_path TO cos360_main')
    cursor.close()
    
# def get_db():
#     db = SessionLocal() 
#     try:
#         yield db
#     finally:
#         db.close()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session