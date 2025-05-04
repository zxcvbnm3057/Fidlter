from flask import Blueprint
from app.services.conda_manager import CondaManager
from app.services.task_scheduler import TaskScheduler
from app.api.routes.auth import auth_routes, requires_admin, requires_session
from app.api.routes.conda import conda_routes
from app.api.routes.tasks import task_routes
from app.api.routes.git import git_routes

# 创建主API蓝图
api = Blueprint('api', __name__, url_prefix='/api')

# 初始化服务实例
task_scheduler = TaskScheduler()
conda_manager = CondaManager(task_scheduler)  # 传递任务调度器实例给环境管理器

# 设置服务相互依赖
task_scheduler.set_conda_manager(conda_manager)

# 注册子蓝图
api.register_blueprint(auth_routes, url_prefix='/auth')
api.register_blueprint(conda_routes, url_prefix='/conda')
api.register_blueprint(task_routes, url_prefix='/tasks')
api.register_blueprint(git_routes, url_prefix='/git')

# 导出装饰器，方便其他模块使用
requires_admin = requires_admin
requires_session = requires_session
