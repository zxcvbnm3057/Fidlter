import threading
import logging
import json
import os
import tempfile
import shutil
import time
from datetime import datetime, timedelta
from croniter import croniter


class Scheduler:
    """负责任务的创建和调度"""

    def __init__(self, executor, history_manager):
        self.tasks = []
        self.executor = executor
        self.history = history_manager
        self.conda_manager = None
        self.next_task_id = 1
        self.lock = threading.Lock()
        self.running = True

        # 设置任务提供器
        self.executor.set_task_provider(self._get_task_by_id)

        # 启动调度线程
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop)
        self.scheduler_thread.daemon = True
        self.scheduler_thread.start()

        self.logger = logging.getLogger("Scheduler")

    def set_conda_manager(self, conda_manager):
        """设置Conda管理器实例，用于环境操作"""
        self.conda_manager = conda_manager

    def _get_task_by_id(self, task_id):
        """根据ID获取任务"""
        return next((t for t in self.tasks if t.get('task_id') == task_id), None)

    def schedule_task(self,
                      script_path,
                      conda_env,
                      task_name=None,
                      requirements=None,
                      reuse_env=False,
                      cron_expression=None,
                      delay_seconds=None,
                      priority="normal",
                      memory_limit=None):
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
            
        返回:
            创建的任务对象或错误信息
        """
        # 基本参数验证
        validation_result = self._validate_task_parameters(script_path, conda_env, task_name, cron_expression,
                                                           delay_seconds, priority, memory_limit)
        if not validation_result["success"]:
            return validation_result

        # 处理任务名称
        if not task_name:
            task_name = os.path.basename(script_path)

        # 计算下一次运行时间
        next_run_time = self._calculate_next_run_time(cron_expression, delay_seconds)
        if isinstance(next_run_time, dict) and not next_run_time.get("success", False):
            return next_run_time

        # 处理环境和requirements
        env_result = None
        if requirements and self.conda_manager:
            env_result = self._handle_task_environment(conda_env, requirements, reuse_env)
            if not env_result.get("success", False):
                return env_result

            # 如果是创建新环境，更新环境名称
            if not reuse_env and "environment" in env_result:
                conda_env = env_result["environment"]

        # 创建新任务
        with self.lock:
            task_id = self.next_task_id
            self.next_task_id += 1

        task = {
            'task_id': task_id,
            'task_name': task_name,
            'script_path': script_path,
            'conda_env': conda_env,
            'status': 'scheduled',
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'requirements': requirements if requirements else None,
            'cron_expression': cron_expression,
            'next_run_time': next_run_time.strftime('%Y-%m-%d %H:%M:%S') if next_run_time else None,
            'last_run_time': None,
            'last_run_duration': None,
            'last_execution_id': None,
            'executions': [],  # 存储该任务的所有执行记录ID
            'priority': priority,
            'memory_limit': memory_limit
        }

        self.tasks.append(task)

        # 初始化该任务的历史记录
        # 注意：这应该由history manager处理，但为了兼容旧API在此处初始化

        result = {"success": True, "message": "Task scheduled successfully", "task": task}

        # 如果有环境操作结果，添加到返回结果中
        if env_result and env_result.get("success", True):
            if reuse_env:
                result["environment_message"] = f"Requirements installed in existing environment '{conda_env}'"
            else:
                result["environment_message"] = f"New environment '{conda_env}' created with requirements"

        return result

    def _validate_task_parameters(self, script_path, conda_env, task_name, cron_expression, delay_seconds, priority,
                                  memory_limit):
        """验证任务参数"""
        # 检查任务名称是否已存在
        if task_name:
            for existing_task in self.tasks:
                if existing_task.get('task_name') == task_name:
                    return {
                        "success": False,
                        "error": f"Task with name '{task_name}' already exists",
                        "message": "Task with this name already exists"
                    }

        # 验证调度参数
        if cron_expression and delay_seconds:
            return {
                "success": False,
                "error": "Cannot specify both cron_expression and delay_seconds",
                "message": "Please specify either cron expression or delay seconds, not both"
            }

        # 验证优先级参数
        if priority not in ["high", "normal", "low"]:
            return {
                "success": False,
                "error": f"Invalid priority value: {priority}",
                "message": "Priority must be one of: high, normal, low"
            }

        # 验证内存限制参数
        if memory_limit is not None:
            try:
                memory_limit = int(memory_limit)
                if memory_limit <= 0:
                    return {
                        "success": False,
                        "error": "Memory limit must be a positive integer",
                        "message": "Please provide a valid memory limit value"
                    }
            except ValueError:
                return {
                    "success": False,
                    "error": "Invalid memory limit value",
                    "message": "Memory limit must be a valid number"
                }

        return {"success": True}

    def _calculate_next_run_time(self, cron_expression, delay_seconds):
        """计算下一次运行时间"""
        if cron_expression:
            try:
                iter = croniter(cron_expression, datetime.now())
                return iter.get_next(datetime)
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Invalid cron expression: {str(e)}",
                    "message": "The provided cron expression is invalid"
                }
        elif delay_seconds is not None:
            try:
                delay_sec = int(delay_seconds)
                if delay_sec < 0:
                    return {
                        "success": False,
                        "error": "Delay seconds must be non-negative",
                        "message": "Please provide a non-negative delay value"
                    }
                return datetime.now() + timedelta(seconds=delay_sec)
            except ValueError:
                return {
                    "success": False,
                    "error": "Invalid delay seconds value",
                    "message": "Delay seconds must be a valid number"
                }
        else:
            # 如果既没有提供cron表达式也没有提供延迟时间，则立即执行
            return datetime.now()

    def _handle_task_environment(self, conda_env, requirements, reuse_env):
        """处理任务环境和requirements"""
        if reuse_env:
            # 检查环境是否存在
            env_exists = self._check_environment_exists(conda_env)
            if not env_exists:
                return {
                    "success": False,
                    "error": f"Environment '{conda_env}' not found",
                    "message": "Cannot reuse non-existing environment"
                }

            # 在现有环境中安装requirements
            return self._install_requirements_in_env(conda_env, requirements)
        else:
            # 为任务创建新环境
            # 如果环境已存在，添加后缀
            original_env_name = conda_env
            suffix = 1
            while True:
                if self._check_environment_exists(conda_env):
                    conda_env = f"{original_env_name}_{suffix}"
                    suffix += 1
                else:
                    break

            # 创建新环境并安装requirements
            return self._create_env_with_requirements(conda_env, requirements)

    def _check_environment_exists(self, env_name):
        """检查环境是否存在"""
        env_list_result = self.conda_manager.list_environments()
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            return any(name == env_name for name in env_names)
        return False

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

        with self.lock:
            # 先收集所有到期的任务
            for task in self.tasks:
                if task['status'] == 'scheduled' and task.get('next_run_time'):
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

            with self.lock:
                # 如果任务有cron表达式，计算下一次执行时间
                if task.get('cron_expression'):
                    iter = croniter(task['cron_expression'], now)
                    next_run = iter.get_next(datetime)
                    task['next_run_time'] = next_run.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    # 如果是一次性任务，将next_run_time设为None
                    task['next_run_time'] = None

    def get_tasks(self):
        """获取所有任务列表，包含执行信息"""
        tasks_with_details = []
        with self.lock:
            for task in self.tasks:
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
        with self.lock:
            # 查找任务
            task = self._get_task_by_id(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 获取任务副本
            task_copy = task.copy()

            # 获取该任务的执行历史
            execution_history = self.history.task_history.get(task_id, [])

            # 获取执行时长历史数据，用于绘制折线图
            performance_metrics = self._extract_performance_metrics(execution_history)

            # 构建结果
            result = {
                "success": True,
                "task": task_copy,
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
        with self.lock:
            # 查找任务
            task = self._get_task_by_id(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 检查任务状态
            if task['status'] == 'running':
                # 正在运行的任务，调用执行器的暂停方法
                return self.executor.pause_task(task_id)
            elif task['status'] == 'scheduled':
                previous_status = task['status']

                # 暂停任务
                task['status'] = 'paused'

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
        with self.lock:
            # 查找任务
            task = self._get_task_by_id(task_id)
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

            # 恢复任务为调度状态
            task['status'] = 'scheduled'

            # 重新计算下一次执行时间
            if task.get('cron_expression'):
                from croniter import croniter
                from datetime import datetime
                now = datetime.now()
                cron = croniter(task['cron_expression'], now)
                next_run = cron.get_next(datetime)
                task['next_run_time'] = next_run.strftime('%Y-%m-%d %H:%M:%S')

            return {
                "success": True,
                "message": "Task resumed successfully",
                "task": {
                    "task_id": task_id,
                    "task_name": task.get('task_name'),
                    "status": 'scheduled',
                    "previous_status": previous_status,
                    "next_run_time": task.get('next_run_time')
                }
            }

    def disable_task(self, task_id):
        """禁用任务，将任务状态设置为disabled
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        with self.lock:
            # 查找任务
            task = self._get_task_by_id(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 检查任务状态
            if task['status'] not in ['scheduled', 'paused']:
                return {
                    "success": False,
                    "message": "Task cannot be disabled",
                    "error": f"Cannot disable a task with status: '{task['status']}'",
                    "current_status": task['status']
                }

            previous_status = task['status']

            # 禁用任务
            task['status'] = 'disabled'

            return {
                "success": True,
                "message": "Task disabled successfully",
                "task": {
                    "task_id": task_id,
                    "task_name": task.get('task_name'),
                    "status": 'disabled',
                    "previous_status": previous_status
                }
            }

    def shutdown(self):
        """停止调度器"""
        self.running = False
        if self.scheduler_thread.is_alive():
            self.scheduler_thread.join(timeout=5)

    def _install_requirements_in_env(self, env_name, requirements):
        """在现有环境中安装requirements
        
        如果安装失败，会尝试回滚环境
        """
        if not self.conda_manager:
            return {"success": False, "error": "Conda manager not available", "message": "Internal server error"}

        # 创建临时目录存放requirements文件
        temp_dir = tempfile.mkdtemp()
        req_file_path = os.path.join(temp_dir, "requirements.txt")

        try:
            # 解析requirements写入临时文件
            packages = self._parse_requirements(requirements, req_file_path)
            if not packages:
                return {
                    "success": False,
                    "error": "No valid packages found in requirements",
                    "message": "Requirements file is empty or contains only comments"
                }

            # 在环境中安装包
            result = self.conda_manager.install_packages(env_name, packages)

            if not result.get("success", False):
                # 安装失败，提供回滚建议
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error"),
                    "message": "Failed to install requirements in existing environment",
                    "failed_packages": result.get("failed_packages", []),
                    "error_details": result.get("error_details", []),
                    "environment_state": "Environment may be in an inconsistent state, consider restoring from backup"
                }

            return {
                "success": True,
                "message": "Requirements installed successfully",
                "environment": env_name,
                "installed_packages": packages
            }

        except Exception as e:
            return {"success": False, "error": str(e), "message": "Error during requirements installation"}
        finally:
            # 清理临时文件
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _create_env_with_requirements(self, env_name, requirements):
        """创建新环境并安装requirements"""
        if not self.conda_manager:
            return {"success": False, "error": "Conda manager not available", "message": "Internal server error"}

        # 创建临时目录存放requirements文件
        temp_dir = tempfile.mkdtemp()
        req_file_path = os.path.join(temp_dir, "requirements.txt")

        try:
            # 解析requirements写入临时文件
            packages = self._parse_requirements(requirements, req_file_path)
            if not packages:
                return {
                    "success": False,
                    "error": "No valid packages found in requirements",
                    "message": "Requirements file is empty or contains only comments"
                }

            # 创建新环境
            create_result = self.conda_manager.create_environment(env_name)
            if not create_result.get("success", False):
                return {
                    "success": False,
                    "error": create_result.get("error", "Unknown error"),
                    "message": f"Failed to create environment '{env_name}'"
                }

            # 在新环境中安装包
            install_result = self.conda_manager.install_packages(env_name, packages)
            if not install_result.get("success", False):
                # 安装失败，删除新创建的环境
                self.conda_manager.delete_environment(env_name)
                return {
                    "success": False,
                    "error": install_result.get("error", "Unknown error"),
                    "message": "Failed to install requirements in new environment",
                    "failed_packages": install_result.get("failed_packages", []),
                    "error_details": install_result.get("error_details", [])
                }

            return {
                "success": True,
                "message": "Environment created with requirements",
                "environment": env_name,
                "installed_packages": packages
            }

        except Exception as e:
            # 出现异常，尝试删除可能已创建的环境
            try:
                self.conda_manager.delete_environment(env_name)
            except:
                pass

            return {"success": False, "error": str(e), "message": "Error during environment creation"}
        finally:
            # 清理临时文件
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _parse_requirements(self, requirements, file_path):
        """解析requirements文本为包列表"""
        # 将requirements内容写入临时文件
        with open(file_path, 'w') as f:
            f.write(requirements)

        # 解析requirements文件，获取包列表
        packages = []
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    packages.append(line)

        return packages
