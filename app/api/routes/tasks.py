from flask import Blueprint, request, jsonify
from app.services import TaskScheduler, CondaManager

# 创建实例
task_scheduler = TaskScheduler()
conda_manager = CondaManager(task_scheduler)  # 传递任务调度器实例给环境管理器

# 设置conda_manager
task_scheduler.set_conda_manager(conda_manager)

# 创建蓝图
task_routes = Blueprint('tasks', __name__, url_prefix='/tasks')


@task_routes.route('', methods=['POST'])
def schedule_task():
    """创建新任务，支持cron表达式或延时执行，以及上传requirements和复用环境"""
    data = request.json
    script = data.get('script')
    conda_env = data.get('conda_env')
    task_name = data.get('task_name')
    requirements = data.get('requirements')
    reuse_env = data.get('reuse_env', False)
    cron_expression = data.get('cron_expression')
    delay_seconds = data.get('delay_seconds')
    priority = data.get('priority', 'normal')
    memory_limit = data.get('memory_limit')

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
    if not conda_env:
        return jsonify({"success": False, "message": "Environment name is required"}), 400

    # 创建任务
    result = task_scheduler.schedule_task(script_path=script,
                                          conda_env=conda_env,
                                          task_name=task_name,
                                          requirements=requirements,
                                          reuse_env=reuse_env,
                                          cron_expression=cron_expression,
                                          delay_seconds=delay_seconds,
                                          priority=priority,
                                          memory_limit=memory_limit)

    if result.get('success', False):
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@task_routes.route('', methods=['GET'])
def get_tasks():
    """获取所有任务列表"""
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
            "created_at": task.get("created_at"),
            "cron_expression": task.get("cron_expression"),
            "next_run_time_formatted": task.get("next_run_time_formatted"),
            "last_run_time_formatted": task.get("last_run_time_formatted"),
            "last_run_duration_formatted": task.get("last_run_duration_formatted"),
            "completed_at": task.get("completed_at")
        }
        formatted_tasks.append(formatted_task)
    return jsonify(formatted_tasks)


@task_routes.route('/<int:task_id>', methods=['GET'])
def get_task_status(task_id):
    """获取特定任务状态和执行历史"""
    status = task_scheduler.get_task_status(task_id)
    if not status.get('success', False):
        return jsonify(status), 404
    return jsonify(status), 200


@task_routes.route('/<int:task_id>/stop', methods=['POST'])
def stop_task(task_id):
    """停止正在运行的任务"""
    try:
        result = task_scheduler.stop_task(task_id)

        if not result.get('success', False):
            # 判断错误类型
            if "not found" in result.get('message', ''):
                return jsonify(result), 404
            elif "not in a running state" in result.get('message', ''):
                return jsonify(result), 400
            else:
                return jsonify(result), 400

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to stop task: {str(e)}", "error": str(e)}), 500


@task_routes.route('/stats', methods=['GET'])
def get_task_stats():
    """获取任务统计信息"""
    try:
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


@task_routes.route('/history', methods=['GET'])
def get_task_history():
    """获取最近一个月的任务执行历史记录"""
    try:
        task_history = task_scheduler.get_task_history()
        return jsonify({"status": "success", "data": task_history}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
