# backend/app/api/__init__.py

from flask import Blueprint
from app.api.routes import api

api_bp = Blueprint('api', __name__)
