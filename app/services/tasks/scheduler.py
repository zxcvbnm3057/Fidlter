import threading
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

from .task_repository import TaskRepository
from .helpers.task_validator import TaskValidator
from .helpers.schedule_calculator import ScheduleCalculator
from .helpers.environment_handler import EnvironmentHandler


class Scheduler:
    """负责任务的创建和调度"""

    def __init__(self, executor, history_manager):
        self.repository = TaskRepository()
        self.executor = executor
        self.history = history_manager
        self.calculator = ScheduleCalculator()
        self.validator = TaskValidator(self.repository)
        self.env_handler = None  # 将在set_conda_manager中初始化

        self.conda_manager = None
        self.lock = threading.Lock()
        self.running = True

        # 设置任务提供器
        self.executor.set_task_provider(self.repository.get_task)

        # 启动调度线程
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop)
        self.scheduler_thread.daemon = True
        self.scheduler_thread.start()

        self.logger = logging.getLogger("Scheduler")

    def set_conda_manager(self, conda_manager):
        """设置Conda管理器实例，用于环境操作"""
        self.conda_manager = conda_manager
        self.env_handler = EnvironmentHandler(conda_manager)

    def schedule_task(self,
                      script_path,
                      conda_env,
                      task_name=None,
                      requirements=None,
                      reuse_env=False,
                      cron_expression=None,
                      delay_seconds=None,
                      priority="normal",
                      memory_limit=None,
                      command=None):
        """调度一个新任务
        
        参数:
            script_path: 脚本路径
            conda_env: 使用的Conda环境名称
            task_name: 任务名称（可选，如不提供则使用脚本名称）
            requirements: requirements.txt内容（可选）
            reuse_env: 是否复用现有环境（如果True，尝试在现有环境中安装requirements）
            cron_expression: Cron表达式（可选，用于周期性执行任务）
            delay_seconds: 延迟执行的秒数（可选，用于一次性延迟执行）
            priority: 任务优先级，可以是"high"、"normal"或"low"，默认为"normal"
            memory_limit: 内存限制（MB），如果为None则不限制
            command: 自定义启动命令（可选，默认为None，会自动生成命令）
            
        返回:
            创建的任务对象或错误信息
        """
        # 基本参数验证
        validation_result = self.validator.validate_task_parameters(script_path, conda_env, task_name, cron_expression,
                                                                    delay_seconds, priority, memory_limit)
        if not validation_result["success"]:
            return validation_result

        # 处理任务名称
        if not task_name:
            task_name = os.path.basename(script_path)

        # 计算下一次运行时间
        next_run_time = self.calculator.calculate_next_run_time(cron_expression, delay_seconds)
        if isinstance(next_run_time, dict) and not next_run_time.get("success", False):
            return next_run_time

        # 处理环境和requirements
        env_result = None
        if requirements and self.conda_manager:
            env_result = self.env_handler.handle_task_environment(conda_env, requirements, reuse_env)
            if not env_result.get("success", False):
                return env_result

            # 如果是创建新环境，更新环境名称
            if not reuse_env and "environment" in env_result:
                conda_env = env_result["environment"]

        # 创建新任务
        task = {
            'task_name': task_name,
            'script_path': script_path,
            'conda_env': conda_env,
            'status': 'scheduled',
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'requirements': requirements if requirements else None,
            'cron_expression': cron_expression,
            'next_run_time':
            next_run_time.strftime('%Y-%m-%d %H:%M:%S') if isinstance(next_run_time, datetime) else None,
            'last_run_time': None,
            'last_run_duration': None,
            'last_execution_id': None,
            'executions': [],  # 存储该任务的所有执行记录ID
            'priority': priority,
            'memory_limit': memory_limit,
            'command': command
        }

        # 添加到仓库，获取任务ID
        task_id = self.repository.add_task(task)

        # 获取完整任务对象
        task = self.repository.get_task(task_id)

        result = {"success": True, "message": "Task scheduled successfully", "task": task}

        # 如果有环境操作结果，添加到返回结果中
        if env_result and env_result.get("success", True):
            if reuse_env:
                result["environment_message"] = f"Requirements installed in existing environment '{conda_env}'"
            else:
                result["environment_message"] = f"New environment '{conda_env}' created with requirements"

        return result

    def _scheduler_loop(self):
        """调度器主循环，检查并执行到期任务"""
        while self.running:
            try:
                self._check_and_run_due_tasks()
                time.sleep(1)  # 每秒检查一次
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {str(e)}")

    def _check_and_run_due_tasks(self):
        """检查并执行到期的任务，考虑任务优先级"""
        now = datetime.now()
        due_tasks = []

        # 获取所有处于调度状态的任务
        scheduled_tasks = self.repository.get_tasks_by_status('scheduled')

        # 收集所有到期的任务
        for task in scheduled_tasks:
            if task.get('next_run_time'):
                next_run = datetime.strptime(task['next_run_time'], '%Y-%m-%d %H:%M:%S')
                if now >= next_run:
                    due_tasks.append(task)

        # 如果有多个任务到期，按优先级排序
        if len(due_tasks) > 1:
            # 优先级映射: high -> 3, normal -> 2, low -> 1
            priority_map = {"high": 3, "normal": 2, "low": 1}
            due_tasks.sort(key=lambda t: priority_map.get(t.get('priority', 'normal'), 2), reverse=True)

        # 执行排序后的任务
        for task in due_tasks:
            # 创建新线程执行任务
            self.executor.execute_task(task)

            # 如果任务有cron表达式，计算下一次执行时间
            if task.get('cron_expression'):
                next_run_time = self.calculator.recalculate_next_run_time(task['cron_expression'])
                if next_run_time:
                    self.repository.update_task(task['task_id'], {'next_run_time': next_run_time})
            else:
                # 如果是一次性任务，将next_run_time设为None
                self.repository.update_task(task['task_id'], {'next_run_time': None})

    def get_tasks(self):
        """获取所有任务列表，包含执行信息"""
        tasks = self.repository.get_all_tasks()
        tasks_with_details = []

        for task in tasks:
            task_copy = task.copy()

            # 使用原始值，让前端处理格式化显示
            if task.get('next_run_time'):
                task_copy['next_run_time_formatted'] = task.get('next_run_time')
            else:
                task_copy['next_run_time_formatted'] = None

            if task.get('last_run_time'):
                task_copy['last_run_time_formatted'] = task.get('last_run_time')
            else:
                task_copy['last_run_time_formatted'] = None

            if task.get('last_run_duration') is not None:
                task_copy['last_run_duration_formatted'] = task.get('last_run_duration')
            else:
                task_copy['last_run_duration_formatted'] = None

            tasks_with_details.append(task_copy)

        return tasks_with_details

    def get_task_status(self, task_id):
        """获取指定任务的状态和执行历史"""
        # 查找任务
        task = self.repository.get_task(task_id)
        if not task:
            return {"success": False, "message": f"Task with ID {task_id} not found"}

        # 获取该任务的执行历史
        execution_history = self.history.task_history.get(task_id, [])

        # 获取执行时长历史数据，用于绘制折线图
        performance_metrics = self._extract_performance_metrics(execution_history)

        # 构建结果
        result = {
            "success": True,
            "task": task,
            "execution_history": execution_history,
            "performance_metrics": performance_metrics
        }

        # 如果存在最近一次执行，获取详细信息
        if task.get('last_execution_id'):
            last_execution = next(
                (e for e in execution_history if e.get('execution_id') == task.get('last_execution_id')), None)
            if last_execution:
                result["latest_execution"] = last_execution

        return result

    def _extract_performance_metrics(self, execution_history):
        """从执行历史中提取性能指标"""
        durations = []
        timestamps = []
        peak_memories = []
        avg_memories = []

        for record in execution_history:
            if record.get('duration') is not None:
                durations.append(record.get('duration'))
                timestamps.append(record.get('start_time'))
            if record.get('peak_memory') is not None:
                peak_memories.append(record.get('peak_memory'))
            if record.get('avg_memory') is not None:
                avg_memories.append(record.get('avg_memory'))

        return {
            "durations": durations,
            "timestamps": timestamps,
            "peak_memories": peak_memories,
            "avg_memories": avg_memories
        }

    def pause_task(self, task_id):
        """暂停任务调度或执行
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        # 查找任务
        task = self.repository.get_task(task_id)
        if not task:
            return {"success": False, "message": f"Task with ID {task_id} not found"}

        # 检查任务状态
        if task['status'] == 'running':
            # 正在运行的任务，调用执行器的暂停方法
            return self.executor.pause_task(task_id)
        elif task['status'] == 'scheduled':
            previous_status = task['status']

            # 暂停任务
            self.repository.update_task(task_id, {'status': 'paused'})

            return {
                "success": True,
                "message": "Task paused successfully",
                "task": {
                    "task_id": task_id,
                    "task_name": task.get('task_name'),
                    "status": 'paused',
                    "previous_status": previous_status
                }
            }
        else:
            return {
                "success": False,
                "message": "Task cannot be paused",
                "error": f"Cannot pause a task with status: '{task['status']}'",
                "current_status": task['status']
            }

    def resume_task(self, task_id):
        """恢复已暂停的任务
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        # 查找任务
        task = self.repository.get_task(task_id)
        if not task:
            return {"success": False, "message": f"Task with ID {task_id} not found"}

        # 检查任务是否有暂停的执行
        execution_paused = self.executor.is_task_paused(task_id)
        if execution_paused:
            # 恢复暂停的执行
            return self.executor.resume_task(task_id)

        # 检查任务状态
        if task['status'] != 'paused':
            return {
                "success": False,
                "message": "Task is not paused",
                "error": f"Cannot resume a task with status: '{task['status']}'",
                "current_status": task['status']
            }

        previous_status = task['status']
        updates = {'status': 'scheduled'}

        # 重新计算下一次执行时间
        if task.get('cron_expression'):
            next_run_time = self.calculator.recalculate_next_run_time(task['cron_expression'])
            if next_run_time:
                updates['next_run_time'] = next_run_time

        # 更新任务
        self.repository.update_task(task_id, updates)

        # 获取更新后的任务
        updated_task = self.repository.get_task(task_id)

        return {
            "success": True,
            "message": "Task resumed successfully",
            "task": {
                "task_id": task_id,
                "task_name": task.get('task_name'),
                "status": 'scheduled',
                "previous_status": previous_status,
                "next_run_time": updated_task.get('next_run_time')
            }
        }

    def stop_task(self, task_id):
        """停止任务，将任务状态设置为stopped
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        # 查找任务
        task = self.repository.get_task(task_id)
        if not task:
            return {"success": False, "message": f"Task with ID {task_id} not found"}

        previous_status = task['status']

        # 如果任务正在运行，先停止执行
        if task['status'] == 'running':
            stop_result = self.executor.stop_task(task_id)
            if not stop_result.get("success", False):
                return stop_result

        # 更新任务状态
        self.repository.update_task(task_id, {'status': 'stopped', 'next_run_time': None})

        return {
            "success": True,
            "message": "Task stopped successfully",
            "task": {
                "task_id": task_id,
                "task_name": task.get('task_name'),
                "status": 'stopped',
                "previous_status": previous_status
            }
        }

    def delete_task(self, task_id):
        """删除任务
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        # 查找任务
        task = self.repository.get_task(task_id)
        if not task:
            return {"success": False, "message": f"Task with ID {task_id} not found"}

        # 如果任务正在运行，不能删除
        if task['status'] == 'running':
            return {
                "success": False,
                "message": "Task cannot be deleted",
                "error": "Cannot delete a task that is currently running",
                "current_status": task['status']
            }

        # 删除任务
        self.repository.delete_task(task_id)

        return {"success": True, "message": "Task deleted successfully", "task_id": task_id}

    def shutdown(self):
        """停止调度器"""
        self.running = False
        if self.scheduler_thread.is_alive():
            self.scheduler_thread.join(timeout=5)

    def trigger_task(self, task_id):
        """手动触发任务立即执行
        
        参数:
            task_id: 要触发的任务ID
            
        返回:
            包含操作结果的字典
        """
        # 查找任务
        task = self.repository.get_task(task_id)
        if not task:
            return {"success": False, "message": f"Task with ID {task_id} not found"}

        # 检查任务状态
        if task['status'] == 'running':
            return {
                "success": False,
                "message": "Task cannot be triggered",
                "error": f"Cannot trigger a task with status: '{task['status']}'",
                "current_status": task['status']
            }

        previous_status = task['status']

        # 如果任务是停止或暂停状态，先将其状态改为scheduled
        if task['status'] in ['stopped', 'paused']:
            self.repository.update_task(task_id, {'status': 'scheduled'})

        # 立即执行任务
        execution_result = self.executor.execute_task(task)

        # 处理执行结果 - 防止字符串错误
        execution_id = None
        if execution_result:
            # 确保 execution_result 是字典类型
            if isinstance(execution_result, dict):
                if execution_result.get("success", False):
                    execution_id = execution_result.get("execution_id")
            else:
                # 记录异常情况
                self.logger.error(
                    f"Unexpected execution_result type: {type(execution_result)}, value: {execution_result}")

        # 如果任务有cron表达式，更新下一次执行时间
        if task.get('cron_expression'):
            next_run_time = self.calculator.recalculate_next_run_time(task['cron_expression'])
            if next_run_time:
                self.repository.update_task(task_id, {'next_run_time': next_run_time})

        return {
            "success": True,
            "message": "Task triggered successfully",
            "task": {
                "task_id": task_id,
                "task_name": task.get('task_name'),
                "status": 'running',
                "previous_status": previous_status,
                "execution_id": execution_id
            }
        }
