from pydantic import BaseModel, Field


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")
    confirm_password: str = Field(..., min_length=8, description="Confirm new password")

    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "oldPassword123",
                "new_password": "newPassword456!",
                "confirm_password": "newPassword456!",
            }
        }


class PasswordChangeResponse(BaseModel):
    message: str
    success: bool

    class Config:
        json_schema_extra = {"example": {"message": "Password changed successfully", "success": True}}
