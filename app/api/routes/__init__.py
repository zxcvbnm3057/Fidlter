from flask import Blueprint
from app.api.routes.conda import conda_routes
from app.api.routes.tasks import task_routes

api = Blueprint('api', __name__, url_prefix='/api')

# 注册子路由
api.register_blueprint(conda_routes)
api.register_blueprint(task_routes)
