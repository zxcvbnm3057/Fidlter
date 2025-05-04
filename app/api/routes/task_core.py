from flask import Blueprint
from app.services import TaskScheduler, CondaManager

# 创建实例
task_scheduler = TaskScheduler()
conda_manager = CondaManager(task_scheduler)  # 传递任务调度器实例给环境管理器

# 设置conda_manager
task_scheduler.set_conda_manager(conda_manager)

# 创建蓝图
task_routes = Blueprint('tasks', __name__, url_prefix='/tasks')


# 辅助函数 - 错误处理
def handle_task_error_response(result):
    """处理任务相关错误，返回适当的HTTP状态码和消息"""
    # 判断错误类型
    if "not found" in result.get('message', '').lower():
        return result, 404
    elif "cannot be updated" in result.get('message', '').lower() or \
         "cannot be paused" in result.get('message', '').lower() or \
         "not paused" in result.get('message', '').lower():
        return result, 400
    elif "environment not found" in result.get('message', '').lower():
        return {
            "success": False,
            "message": "Environment not found",
            "error": f"The specified conda environment does not exist"
        }, 400
    elif "invalid cron expression" in result.get('message', '').lower():
        return {
            "success": False,
            "message": "Invalid update parameters",
            "error": f"The provided cron expression is invalid: {result.get('error', '')}"
        }, 400
    else:
        return result, 400


# 导入路由模块 - 防止循环导入
from app.api.routes.task_creation import *
from app.api.routes.task_management import *
from app.api.routes.task_execution import *
