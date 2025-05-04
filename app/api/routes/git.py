from flask import Blueprint, request, jsonify
from app.services import TaskScheduler, CondaManager
from app.services.git_task_manager import GitTaskManager

# 创建实例
task_scheduler = TaskScheduler()
conda_manager = CondaManager(task_scheduler)
git_task_manager = GitTaskManager(task_scheduler, conda_manager)

# 创建蓝图
git_routes = Blueprint('git', __name__, url_prefix='/git')


@git_routes.route('/tasks', methods=['POST'])
def create_task_from_git():
    """从Git仓库创建任务"""
    data = request.json

    # 获取请求参数
    repo_url = data.get('repo_url')
    branch = data.get('branch', 'main')
    task_name = data.get('task_name')
    command = data.get('command')
    env_option = data.get('env_option')
    env_name = data.get('env_name')

    # 验证参数
    errors = []
    if not repo_url:
        errors.append("Repository URL is required")
    if not command:
        errors.append("Command is required")
    if not env_option:
        errors.append("Environment option is required")
    if env_option and env_option not in ['create', 'existing']:
        errors.append("Environment option must be 'create' or 'existing'")
    if env_option and not env_name:
        errors.append("Environment name is required")

    if errors:
        return jsonify({"success": False, "message": "Missing or invalid parameters", "error": "; ".join(errors)}), 400

    # 调用GitTaskManager创建任务
    result = git_task_manager.create_task_from_git(repo_url=repo_url,
                                                   branch=branch,
                                                   task_name=task_name,
                                                   command=command,
                                                   env_option=env_option,
                                                   env_name=env_name)

    # 处理结果
    if result.get("success", False):
        return jsonify(result), 201
    else:
        # 根据错误类型返回不同的状态码
        if "No Python script found" in result.get("error", ""):
            return jsonify(result), 404
        else:
            return jsonify(result), 400


@git_routes.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task_from_git(task_id):
    """更新Git仓库任务"""
    data = request.json

    # 获取请求参数
    update_env = data.get('update_env', True)

    # 调用GitTaskManager更新任务
    result = git_task_manager.update_task_from_git(task_id=task_id, update_env=update_env)

    # 处理结果
    if result.get("success", False):
        return jsonify(result), 200
    else:
        # 根据错误类型返回不同的状态码
        if "Not a Git repository task" in result.get("error", ""):
            return jsonify(result), 400
        elif "Task not found" in result.get("message", "") or "not found" in result.get("message", "").lower():
            return jsonify(result), 404
        else:
            return jsonify(result), 400


@git_routes.route('/tasks/<int:task_id>', methods=['GET'])
def get_git_task_status(task_id):
    """获取Git任务状态"""
    # 调用GitTaskManager获取任务状态
    result = git_task_manager.get_git_task_status(task_id)

    # 处理结果
    if result.get("success", False):
        return jsonify(result), 200
    else:
        # 根据错误类型返回不同的状态码
        if "Not a Git repository task" in result.get("error", ""):
            return jsonify(result), 400
        elif "Task not found" in result.get("message", "") or "not found" in result.get("message", "").lower():
            return jsonify(result), 404
        else:
            return jsonify(result), 400
