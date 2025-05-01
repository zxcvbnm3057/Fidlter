from flask import Blueprint, request, jsonify
from app.services.conda_manager import CondaManager
from app.services.task_scheduler import TaskScheduler
from datetime import datetime
import os

api = Blueprint('api', __name__, url_prefix='/api')

task_scheduler = TaskScheduler()
conda_manager = CondaManager(task_scheduler)  # 传递任务调度器实例给环境管理器


@api.route('/conda/environments', methods=['GET'])
def list_conda_environments():
    environments_result = conda_manager.list_environments()

    # 判断是否成功获取环境列表
    if not environments_result.get("success", False):
        return jsonify([]), 500  # 返回空数组和500状态码

    # 解析conda环境列表，格式化为符合文档要求的格式
    conda_envs = environments_result.get("output", {})
    formatted_envs = []

    if "envs" in conda_envs:
        for idx, env_path in enumerate(conda_envs.get("envs", [])):
            env_name = os.path.basename(env_path)

            # 获取环境的Python版本和包列表（可能需要额外调用conda命令）
            # 这里为简化处理，仅返回基本信息
            formatted_envs.append({
                "env_id": idx + 1,
                "name": env_name,
                "python_version": "获取中...",  # 实际实现应该获取真实版本
                "packages": [],  # 实际实现应该获取真实包列表
                "created_at": "获取中..."  # 实际实现应该获取真实创建时间
            })

    return jsonify(formatted_envs)


@api.route('/conda/environment', methods=['POST'])
def create_conda_environment():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"success": False, "message": "Environment name is required"}), 400

    result = conda_manager.create_environment(name)
    if result.get('success'):
        # 获取新创建环境的ID
        env_id = None
        env_list_result = conda_manager.list_environments()
        if env_list_result.get("success", False):
            conda_envs = env_list_result.get("output", {})
            envs = conda_envs.get("envs", [])
            for idx, env_path in enumerate(envs):
                if os.path.basename(env_path) == name:
                    env_id = idx + 1
                    break

        # 格式化为符合文档要求的响应
        return jsonify({
            "success": True,
            "message": "Environment created successfully",
            "environment": {
                "env_id": env_id,
                "name": name,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }), 201
    else:
        if "already exists" in result.get('error', '').lower():
            return jsonify({
                "success": False,
                "message": "Environment with this name already exists",
                "error": result.get('error', '')
            }), 400
        return jsonify(result), 400


@api.route('/conda/environment/<int:env_id>', methods=['DELETE'])
def delete_conda_environment(env_id):
    # 根据环境ID获取环境名称
    env_name = None
    env_list_result = conda_manager.list_environments()
    if env_list_result.get("success", False):
        # 解析conda环境列表
        conda_envs = env_list_result.get("output", {})
        envs = conda_envs.get("envs", [])
        if len(envs) >= env_id and env_id > 0:
            env_path = envs[env_id - 1]  # env_id从1开始，数组索引从0开始
            env_name = os.path.basename(env_path)

    if not env_name:
        return jsonify({"success": False, "message": "Environment not found"}), 404

    result = conda_manager.delete_environment(env_name)
    if result.get('success'):
        return '', 204  # 文档规定删除成功返回204无内容
    else:
        if "in use by tasks" in result.get('error', ''):
            return jsonify({
                "success": False,
                "message": "Cannot delete environment that is referenced by tasks",
                "error": "Environment is in use by tasks",
                "referencing_tasks": result.get("referencing_tasks", [])
            }), 400
        return jsonify({"success": False, "message": "Environment not found"}), 404


@api.route('/conda/environment/<int:env_id>', methods=['PUT'])
def update_conda_environment(env_id):
    """修改Conda环境名称"""
    data = request.json
    new_name = data.get('new_name')
    if not new_name:
        return jsonify({"success": False, "message": "New name is required"}), 400

    # 根据环境ID获取环境名称
    old_name = None
    env_list_result = conda_manager.list_environments()
    if env_list_result.get("success", False):
        # 解析conda环境列表
        conda_envs = env_list_result.get("output", {})
        envs = conda_envs.get("envs", [])
        if len(envs) >= env_id and env_id > 0:
            env_path = envs[env_id - 1]  # env_id从1开始，数组索引从0开始
            old_name = os.path.basename(env_path)

    if not old_name:
        return jsonify({"success": False, "message": "Environment not found"}), 404

    result = conda_manager.rename_environment(old_name, new_name)
    if result.get('success'):
        # 根据文档要求格式化返回结果
        return jsonify({
            "success": True,
            "message": "Environment renamed successfully",
            "old_name": old_name,
            "new_name": new_name,
            "env_id": env_id,
            "updated_tasks_count": result.get("updated_tasks_count", 0)
        }), 200
    else:
        if result.get('message') == 'Environment not found':
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "already exists" in result.get('error', '').lower():
            return jsonify({
                "success": False,
                "message": "Environment with this name already exists",
                "error": "Cannot rename environment to an existing name"
            }), 400
        return jsonify(result), 400


@api.route('/conda/environment/<int:env_id>/packages', methods=['POST'])
def install_packages(env_id):
    """在指定Conda环境中安装包"""
    data = request.json
    packages = data.get('packages', [])
    if not packages:
        return jsonify({"success": False, "message": "No packages specified"}), 400

    # 根据环境ID获取环境名称
    env_name = None
    env_list_result = conda_manager.list_environments()
    if env_list_result.get("success", False):
        # 解析conda环境列表
        conda_envs = env_list_result.get("output", {})
        envs = conda_envs.get("envs", [])
        if len(envs) >= env_id and env_id > 0:
            env_path = envs[env_id - 1]  # env_id从1开始，数组索引从0开始
            env_name = os.path.basename(env_path)

    if not env_name:
        return jsonify({"success": False, "message": "Environment not found"}), 404

    result = conda_manager.install_packages(env_name, packages)
    if result.get('success'):
        # 根据文档要求格式化返回结果
        return jsonify({
            "success": True,
            "message": "Packages installed successfully",
            "environment": env_name,
            "installed_packages": packages
        }), 200
    else:
        if result.get('message') == 'Environment not found':
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "in use by tasks" in result.get('error', ''):
            return jsonify({
                "success": False,
                "message": "Cannot modify packages in environment that is referenced by running tasks",
                "error": "Environment is in use by tasks",
                "referencing_tasks": result.get("referencing_tasks", [])
            }), 400
        else:
            # 处理安装失败的情况
            return jsonify({
                "success": False,
                "message": "Failed to install packages",
                "failed_packages": result.get("failed_packages", []),
                "error_details": result.get("error_details", []),
                "error": result.get("error", "Unknown error")
            }), 400


@api.route('/conda/environment/<int:env_id>/packages', methods=['DELETE'])
def remove_packages(env_id):
    """从指定Conda环境中移除包"""
    data = request.json
    packages = data.get('packages', [])
    if not packages:
        return jsonify({"success": False, "message": "No packages specified"}), 400

    # 根据环境ID获取环境名称
    env_name = None
    env_list_result = conda_manager.list_environments()
    if env_list_result.get("success", False):
        # 解析conda环境列表
        conda_envs = env_list_result.get("output", {})
        envs = conda_envs.get("envs", [])
        if len(envs) >= env_id and env_id > 0:
            env_path = envs[env_id - 1]  # env_id从1开始，数组索引从0开始
            env_name = os.path.basename(env_path)

    if not env_name:
        return jsonify({"success": False, "message": "Environment not found"}), 404

    result = conda_manager.remove_packages(env_name, packages)
    if result.get('success'):
        # 根据文档要求格式化返回结果
        return jsonify({
            "success": True,
            "message": "Packages removed successfully",
            "environment": env_name,
            "removed_packages": packages
        }), 200
    else:
        if result.get('message') == 'Environment not found':
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "in use by tasks" in result.get('error', ''):
            return jsonify({
                "success": False,
                "message": "Cannot remove packages from environment that is referenced by running tasks",
                "error": "Environment is in use by tasks",
                "referencing_tasks": result.get("referencing_tasks", [])
            }), 400
        return jsonify({
            "success": False,
            "message": "Failed to remove packages",
            "error": result.get("error", "")
        }), 400


@api.route('/tasks', methods=['POST'])
def schedule_task():
    """创建新任务，支持cron表达式或延时执行，以及上传requirements和复用环境"""
    data = request.json
    script = data.get('script')
    env_id = data.get('env_id')
    conda_env = data.get('conda_env')  # 保留向后兼容性
    task_name = data.get('task_name')
    requirements = data.get('requirements')
    reuse_env = data.get('reuse_env', False)
    cron_expression = data.get('cron_expression')
    delay_seconds = data.get('delay_seconds')

    # 验证cron表达式和delay_seconds不能同时提供
    if cron_expression and delay_seconds is not None:
        return jsonify({
            "success": False,
            "message": "Please specify either cron expression or delay seconds, not both",
            "error": "Cannot specify both cron_expression and delay_seconds"
        }), 400

    # 基本参数验证
    if not script:
        return jsonify({"success": False, "message": "Script is required"}), 400
    if not env_id and not conda_env:
        return jsonify({"success": False, "message": "Environment ID or name is required"}), 400

    # 设置conda_manager（如果尚未设置）
    if not task_scheduler.conda_manager:
        task_scheduler.set_conda_manager(conda_manager)

    # 如果提供了环境ID，优先使用环境ID
    if env_id:
        # 根据环境ID获取环境名称
        env_name = None
        env_list_result = conda_manager.list_environments()
        if env_list_result.get("success", False):
            for env in env_list_result.get("output", {}).get("envs", []):
                if env.get("env_id") == env_id:
                    env_name = env.get("name")
                    break

        if not env_name:
            return jsonify({"success": False, "message": f"Environment with ID {env_id} not found"}), 404

        conda_env = env_name

    # 创建任务
    result = task_scheduler.schedule_task(script_path=script,
                                          conda_env=conda_env,
                                          task_name=task_name,
                                          requirements=requirements,
                                          reuse_env=reuse_env,
                                          cron_expression=cron_expression,
                                          delay_seconds=delay_seconds)

    # 在成功创建任务后添加环境ID信息
    if result.get('success', False) and 'task' in result:
        env_list_result = conda_manager.list_environments()
        if env_list_result.get("success", False):
            for env in env_list_result.get("output", {}).get("envs", []):
                if env.get("name") == conda_env:
                    result['task']['env_id'] = env.get("env_id")
                    break

    if result.get('success', False):
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@api.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = task_scheduler.get_tasks()
    # 格式化任务列表，确保与文档一致
    formatted_tasks = []
    for task in tasks:
        formatted_task = {
            "task_id": task.get("task_id"),
            "task_name": task.get("task_name"),
            "status": task.get("status"),
            "script_path": task.get("script_path"),
            "conda_env": task.get("conda_env"),
            "env_id": task.get("env_id"),
            "created_at": task.get("created_at"),
            "cron_expression": task.get("cron_expression"),
            "next_run_time_formatted": task.get("next_run_time"),
            "last_run_time_formatted": task.get("last_run_time"),
            "last_run_duration_formatted": task.get("last_run_duration"),
            "completed_at": task.get("completed_at")
        }
        formatted_tasks.append(formatted_task)
    return jsonify(formatted_tasks)


@api.route('/tasks/<int:task_id>', methods=['GET'])
def get_task_status(task_id):
    status = task_scheduler.get_task_status(task_id)
    if not status.get('success', False):
        return jsonify(status), 404
    return jsonify(status), 200


@api.route('/tasks/stats', methods=['GET'])
def get_task_stats():
    """获取任务统计信息"""
    try:
        # 你需要在TaskScheduler类中实现get_stats方法
        # 如果该方法尚未实现，请适当调整下面的代码
        stats = task_scheduler.get_stats()
        return jsonify(stats)
    except Exception as e:
        # 如果方法不存在或出错，至少返回一个空对象而不是500错误
        return jsonify({
            "total": 0,
            "scheduled": 0,
            "running": 0,
            "completed": 0,
            "failed": 0,
            "avg_duration": 0,
            "min_duration": 0,
            "max_duration": 0,
            "success_rate": 0,
            "error": str(e)
        }), 500


@api.route('/tasks/history', methods=['GET'])
def get_task_history():
    """获取最近一个月的任务执行历史记录"""
    try:
        task_history = task_scheduler.get_task_history()
        return jsonify({"status": "success", "data": task_history}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
