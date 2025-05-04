from flask import Blueprint, request, jsonify
from app.services import TaskScheduler, CondaManager
from datetime import datetime

# 创建实例
task_scheduler = TaskScheduler()
conda_manager = CondaManager(task_scheduler)  # 传递任务调度器实例给环境管理器

# 设置conda_manager
task_scheduler.set_conda_manager(conda_manager)

# 创建业务逻辑管理器 - 现在直接使用task_scheduler中的operation_manager
task_operation_manager = task_scheduler.operation_manager

# 创建蓝图
task_routes = Blueprint('tasks', __name__, url_prefix='/tasks')


# 通用错误响应处理
def handle_error_response(result, default_status_code=400):
    """根据错误类型返回适当的HTTP状态码和错误信息"""
    if not result.get('success', False):
        # 判断错误类型
        if "not found" in result.get('message', '').lower():
            return jsonify(result), 404
        elif any(keyword in result.get('message', '').lower()
                 for keyword in ["cannot be updated", "cannot be paused", "not paused", "already exists"]):
            return jsonify(result), 400
        elif "environment not found" in result.get('message', '').lower():
            return jsonify(result), 400
        elif "invalid cron expression" in result.get('message', '').lower():
            return jsonify(result), 400
        else:
            return jsonify(result), default_status_code

    return jsonify(result), 200


@task_routes.route('', methods=['POST'])
def schedule_task():
    """创建新任务，支持上传脚本文件或ZIP包，以及cron表达式或延时执行"""
    try:
        # 处理多部分表单数据
        script_file = request.files.get('script_file')
        conda_env = request.form.get('conda_env')
        task_name = request.form.get('task_name')

        # 获取requirements - 可以是文件或文本
        requirements = None
        requirements_file = request.files.get('requirements_file')
        if requirements_file:
            requirements = requirements_file.read().decode('utf-8')
        elif request.form.get('requirements'):
            requirements = request.form.get('requirements')

        # 其他参数
        reuse_env = request.form.get('reuse_env', 'false').lower() == 'true'
        cron_expression = request.form.get('cron_expression')
        delay_seconds = request.form.get('delay_seconds')
        if delay_seconds and delay_seconds.isdigit():
            delay_seconds = int(delay_seconds)
        else:
            delay_seconds = None
        priority = request.form.get('priority', 'normal')
        memory_limit = request.form.get('memory_limit')
        if memory_limit and memory_limit.isdigit():
            memory_limit = int(memory_limit)
        else:
            memory_limit = None

        # 获取自定义启动命令
        command = request.form.get('command')

        # 调用服务层创建任务
        result = task_operation_manager.create_task(script_file=script_file,
                                                    conda_env=conda_env,
                                                    task_name=task_name,
                                                    requirements=requirements,
                                                    reuse_env=reuse_env,
                                                    cron_expression=cron_expression,
                                                    delay_seconds=delay_seconds,
                                                    priority=priority,
                                                    memory_limit=memory_limit,
                                                    command=command)

        # 根据结果返回响应
        if result.get('success', False):
            return jsonify(result), 201
        else:
            return handle_error_response(result)

    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "message": "An error occurred while processing your request",
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@task_routes.route('', methods=['GET'])
def get_tasks():
    """获取所有任务列表
    
    支持查询参数:
    - type=defined (默认) - 获取所有已定义任务
    - type=history - 获取历史执行记录
    """
    # 获取查询参数 - 默认为defined
    task_type = request.args.get('type', 'defined')

    try:
        if task_type == 'history':
            # 获取任务历史记录
            task_history = task_scheduler.history.get_task_history()
            return jsonify(task_history)
        else:
            # 获取已定义的任务列表（默认）
            tasks = task_scheduler.scheduler.get_tasks()
            # 格式化任务列表，确保与文档一致
            formatted_tasks = []
            for task in tasks:
                formatted_task = {
                    "task_id": task.get("task_id"),
                    "task_name": task.get("task_name"),
                    "status": task.get("status"),
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
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to get tasks", "error": str(e)}), 500


@task_routes.route('/<int:task_id>', methods=['GET'])
def get_task_status(task_id):
    """获取特定任务状态和执行历史"""
    try:
        status = task_scheduler.scheduler.get_task_status(task_id)
        if not status.get('success', False):
            return jsonify(status), 404
        return jsonify(status), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to get task status", "error": str(e)}), 500


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
        return handle_error_response(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to stop task", "error": str(e)}), 500


@task_routes.route('/<int:task_id>/pause', methods=['POST'])
def pause_task(task_id):
    """暂停任务调度"""
    try:
        result = task_scheduler.scheduler.pause_task(task_id)
        return handle_error_response(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to pause task", "error": str(e)}), 500


@task_routes.route('/<int:task_id>/resume', methods=['POST'])
def resume_task(task_id):
    """恢复已暂停的任务"""
    try:
        result = task_scheduler.scheduler.resume_task(task_id)
        return handle_error_response(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to resume task", "error": str(e)}), 500


@task_routes.route('/stats', methods=['GET'])
def get_task_stats():
    """获取任务统计信息"""
    try:
        stats = task_scheduler.stats.get_task_stats()
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
        task_history = task_scheduler.history.get_task_history()
        return jsonify({"status": "success", "data": task_history}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@task_routes.route('/<int:task_id>/executions/<execution_id>/logs', methods=['GET'])
def get_task_execution_logs(task_id, execution_id):
    """获取任务执行的日志内容
    
    支持查询参数:
    - stream=true (实时获取最新日志)
    - include_stdout=true/false (是否包含标准输出，默认true)
    - include_stderr=true/false (是否包含标准错误，默认true)
    """
    # 检查查询参数
    stream = request.args.get('stream', 'false').lower() == 'true'
    include_stdout = request.args.get('include_stdout', 'true').lower() == 'true'
    include_stderr = request.args.get('include_stderr', 'true').lower() == 'true'

    try:
        # 先获取任务状态以验证任务存在
        task_status = task_scheduler.scheduler.get_task_status(task_id)
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

        # 初始化日志内容
        logs = execution.get('logs', '')
        stdout = execution.get('stdout', '')
        stderr = execution.get('stderr', '')

        # 处理实时日志请求 - 获取最新日志内容
        if stream or task.get('status') == 'running':
            # 从历史记录管理器中获取最新日志
            latest_logs = task_scheduler.history.get_execution_logs(task_id,
                                                                    execution_id,
                                                                    include_stdout=include_stdout,
                                                                    include_stderr=include_stderr)

            if latest_logs:
                logs = latest_logs.get('logs', logs)
                stdout = latest_logs.get('stdout', stdout)
                stderr = latest_logs.get('stderr', stderr)

        # 检查任务是否已完成
        is_complete = execution.get('status') in ['completed', 'failed', 'stopped']
        # 如果任务仍在运行，强制设置为未完成
        if task.get('status') == 'running':
            is_complete = False

        # 构建响应数据
        response_data = {
            "success": True,
            "task_id": task_id,
            "execution_id": execution_id,
            "logs": logs,
            "is_complete": is_complete,
            "last_update": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

        # 根据参数添加stdout和stderr
        if include_stdout:
            response_data["stdout"] = stdout
        if include_stderr:
            response_data["stderr"] = stderr

        # 返回日志信息
        return jsonify(response_data)
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to retrieve logs", "error": str(e)}), 500


@task_routes.route('/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """更新任务配置
    
    支持更新以下字段：
    - task_name: 任务名称
    - script: 脚本内容或路径
    - conda_env: Conda环境名称
    - cron_expression: Cron表达式
    - delay_seconds: 延迟执行秒数
    - requirements: requirements.txt内容
    - priority: 任务优先级
    
    注意：
    - cron_expression和delay_seconds不能同时提供
    - 更新任务的conda环境会自动处理环境依赖关系
    """
    try:
        data = request.json

        # 验证cron_expression和delay_seconds不能同时提供
        if data.get('cron_expression') and data.get('delay_seconds') is not None:
            return jsonify({
                "success": False,
                "message": "Invalid update parameters",
                "error": "Cannot specify both cron_expression and delay_seconds"
            }), 400

        # 执行任务更新
        result = task_scheduler.scheduler.update_task(task_id=task_id,
                                                      task_name=data.get('task_name'),
                                                      script_path=data.get('script'),
                                                      conda_env=data.get('conda_env'),
                                                      cron_expression=data.get('cron_expression'),
                                                      delay_seconds=data.get('delay_seconds'),
                                                      requirements=data.get('requirements'),
                                                      priority=data.get('priority'))

        return handle_error_response(result)
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to update task", "error": str(e)}), 500


@task_routes.route('/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """删除任务及其关联的执行历史记录
    
    注意：
    - 正在运行的任务不能直接删除，需要先停止任务
    - 删除操作不可撤销
    """
    try:
        result = task_scheduler.scheduler.delete_task(task_id)

        if not result.get('success', False):
            # 特殊处理运行中任务的删除尝试
            if "cannot delete" in result.get('message', '').lower() and "running" in result.get('message', '').lower():
                return jsonify({
                    "success": False,
                    "message": "Task cannot be deleted",
                    "error": "Cannot delete a task that is currently running",
                    "current_status": result.get("current_status", "unknown")
                }), 400

            return handle_error_response(result)

        return jsonify({"success": True, "message": "Task deleted successfully", "task_id": task_id}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to delete task", "error": str(e)}), 500


@task_routes.route('/<int:task_id>/update-script', methods=['POST'])
def update_task_script(task_id):
    """更新任务脚本文件
    
    支持上传新的脚本文件或ZIP包来替换现有任务的程序
    - 对于ZIP包，要求用户提供自定义启动命令
    - 如果任务正在运行，且force=true，会自动停止任务后更新脚本
    """
    try:
        # 获取force参数，判断是否强制更新
        force_update = request.form.get('force', 'false').lower() == 'true'

        # 检查请求中是否包含文件
        if 'script_file' not in request.files:
            return jsonify({
                "success": False,
                "message": "No script file provided",
                "error": "Script file is required for update"
            }), 400

        # 获取文件和自定义命令
        script_file = request.files.get('script_file')
        command = request.form.get('command')

        # 调用服务层处理脚本更新
        result = task_operation_manager.update_task_script(task_id=task_id,
                                                           script_file=script_file,
                                                           force_update=force_update,
                                                           command=command)

        return handle_error_response(result)
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "message": "Failed to update task script",
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@task_routes.route('/<int:task_id>/trigger', methods=['POST'])
def trigger_task(task_id):
    """手动触发任务立即执行
    
    可以触发状态为"scheduled"、"paused"或"stopped"的任务
    - 对于"scheduled"的任务：将立即执行一次，不影响其原有的调度规则
    - 对于"paused"的任务：将恢复执行并立即运行一次
    - 对于"stopped"的任务：将重新激活任务并立即执行一次
    """
    try:
        result = task_scheduler.scheduler.trigger_task(task_id)
        return handle_error_response(result)
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to trigger task", "error": str(e)}), 500
