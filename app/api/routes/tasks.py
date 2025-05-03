from flask import Blueprint, request, jsonify
from app.services import TaskScheduler, CondaManager
from datetime import datetime

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
    # 获取查询参数 - 默认为defined
    task_type = request.args.get('type', 'defined')

    if task_type == 'history':
        # 获取任务历史记录
        task_history = task_scheduler.get_task_history()
        return jsonify(task_history)
    else:
        # 获取已定义的任务列表（默认）
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
    """停止任务，包括停止正在运行的任务进程和禁用任务调度
    
    对于不同状态的任务:
    - 运行中的任务：停止其执行进程并将状态改为stopped
    - 已调度或已暂停的任务：将状态改为stopped，不再参与后续调度
    - 已停止的任务：返回不能停止的错误
    """
    try:
        result = task_scheduler.stop_task(task_id)

        if not result.get('success', False):
            # 判断错误类型
            if "not found" in result.get('message', ''):
                return jsonify(result), 404
            else:
                return jsonify(result), 400

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to stop task: {str(e)}", "error": str(e)}), 500


@task_routes.route('/<int:task_id>/pause', methods=['POST'])
def pause_task(task_id):
    """暂停任务调度"""
    try:
        result = task_scheduler.pause_task(task_id)

        if not result.get('success', False):
            # 判断错误类型
            if "not found" in result.get('message', ''):
                return jsonify(result), 404
            elif "cannot be paused" in result.get('message', '').lower():
                return jsonify(result), 400
            else:
                return jsonify(result), 400

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to pause task: {str(e)}", "error": str(e)}), 500


@task_routes.route('/<int:task_id>/resume', methods=['POST'])
def resume_task(task_id):
    """恢复已暂停的任务"""
    try:
        result = task_scheduler.resume_task(task_id)

        if not result.get('success', False):
            # 判断错误类型
            if "not found" in result.get('message', ''):
                return jsonify(result), 404
            elif "not paused" in result.get('message', '').lower():
                return jsonify(result), 400
            else:
                return jsonify(result), 400

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to resume task: {str(e)}", "error": str(e)}), 500


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


@task_routes.route('/<int:task_id>/executions/<execution_id>/logs', methods=['GET'])
def get_task_execution_logs(task_id, execution_id):
    """获取任务执行的日志内容
    
    支持实时获取最新日志 - 通过 real_time=true 查询参数
    """
    # 检查是否需要实时日志
    real_time = request.args.get('real_time', 'false').lower() == 'true'

    try:
        # 先获取任务状态以验证任务存在
        task_status = task_scheduler.get_task_status(task_id)
        if not task_status.get('success', False):
            return jsonify({"success": False, "message": f"Task with ID {task_id} not found"}), 404

        # 获取任务执行记录
        task = task_status.get('task', {})
        executions = task_status.get('execution_history', [])

        # 查找特定执行记录
        execution = next((e for e in executions if e.get('execution_id') == execution_id), None)
        if not execution:
            return jsonify({
                "success": False,
                "message": f"Execution with ID {execution_id} not found for task {task_id}"
            }), 404

        # 获取执行日志
        logs = execution.get('logs', '')

        # 处理实时日志请求 - 只获取日志内容，不包含在执行记录中的其他大量数据
        if real_time and task.get('status') == 'running':
            # 对于正在运行的任务，从历史记录管理器中直接获取最新日志
            # 这样可以避免在每次轮询时传输完整的执行历史记录
            latest_logs = task_scheduler.history.get_execution_logs(task_id, execution_id)
            if latest_logs:
                logs = latest_logs

        # 检查任务是否已完成
        is_complete = execution.get('status') in ['completed', 'failed', 'stopped']
        # 如果是实时模式，且任务仍在运行，强制设置为未完成
        if real_time and task.get('status') == 'running':
            is_complete = False

        # 返回日志信息
        return jsonify({
            "success": True,
            "task_id": task_id,
            "execution_id": execution_id,
            "logs": logs,
            "is_complete": is_complete,
            "last_update": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
