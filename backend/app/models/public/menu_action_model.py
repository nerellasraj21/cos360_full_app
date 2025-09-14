from app.db.base import BasePublic
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

class MenuAction(BasePublic):
    """
    Available actions for each menu (extends menu permissions with fine-grained control)
    """
    __tablename__ = 'menu_actions'
    __table_args__ = (
        UniqueConstraint('menu_id', 'action_name', name='unique_menu_action'),
        {'schema': 'public'}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    menu_id = Column(Integer, ForeignKey('public.menus.id'), nullable=False)
    action_name = Column(String(30), nullable=False)  # create, update, delete, export, approve, etc.
    resource_name = Column(String(50), nullable=False)  # fee_categories, students, etc.
    description = Column(String(200))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    menu = relationship("Menu")
    
    def __repr__(self):
        return f"<MenuAction(menu_id={self.menu_id}, resource_name='{self.resource_name}', action_name='{self.action_name}')>"

    @property
    def permission_key(self):
        """Returns the permission key in format: resource:action"""
        return f"{self.resource_name}:{self.action_name}"