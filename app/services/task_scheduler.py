from datetime import datetime, timedelta
import subprocess
import json
import os
import tempfile
import shutil
import time
import psutil
import threading
import logging
from croniter import croniter
import uuid


class TaskScheduler:

    def __init__(self, conda_manager=None):
        self.tasks = []
        self.task_history = {}  # 存储任务的历史执行记录
        self.conda_manager = conda_manager
        self.next_task_id = 1
        self.lock = threading.Lock()
        self.running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop)
        self.scheduler_thread.daemon = True
        self.scheduler_thread.start()
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("TaskScheduler")

    def set_conda_manager(self, conda_manager):
        """设置Conda管理器实例，用于环境操作"""
        self.conda_manager = conda_manager

    def schedule_task(self,
                      script_path,
                      conda_env,
                      task_name=None,
                      requirements=None,
                      reuse_env=False,
                      cron_expression=None,
                      delay_seconds=None):
        """调度一个新任务
        
        参数:
            script_path: 脚本路径
            conda_env: 使用的Conda环境名称
            task_name: 任务名称（可选，如不提供则使用脚本名称）
            requirements: requirements.txt内容（可选）
            reuse_env: 是否复用现有环境（如果True，尝试在现有环境中安装requirements）
            cron_expression: Cron表达式（可选，用于周期性执行任务）
            delay_seconds: 延迟执行的秒数（可选，用于一次性延迟执行）
            
        返回:
            创建的任务对象或错误信息
        """
        # 如果没有提供任务名称，使用脚本文件名作为任务名称
        if not task_name:
            task_name = os.path.basename(script_path)

        # 检查任务名称是否已存在
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

        # 验证cron表达式
        next_run_time = None
        if cron_expression:
            try:
                iter = croniter(cron_expression, datetime.now())
                next_run_time = iter.get_next(datetime)
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Invalid cron expression: {str(e)}",
                    "message": "The provided cron expression is invalid"
                }
        elif delay_seconds:
            try:
                delay_sec = int(delay_seconds)
                if delay_sec < 0:
                    return {
                        "success": False,
                        "error": "Delay seconds must be non-negative",
                        "message": "Please provide a non-negative delay value"
                    }
                next_run_time = datetime.now() + timedelta(seconds=delay_sec)
            except ValueError:
                return {
                    "success": False,
                    "error": "Invalid delay seconds value",
                    "message": "Delay seconds must be a valid number"
                }
        else:
            # 如果既没有提供cron表达式也没有提供延迟时间，则立即执行
            next_run_time = datetime.now()

        # 处理环境和requirements
        env_result = None
        if requirements and self.conda_manager:
            if reuse_env:
                # 检查环境是否存在
                env_list_result = self.conda_manager.list_environments()
                env_exists = False
                if env_list_result.get("success", False):
                    env_names = [env.get("name") for env in env_list_result.get("output", {}).get("envs", [])]
                    env_exists = any(name == conda_env for name in env_names)

                if not env_exists:
                    return {
                        "success": False,
                        "error": f"Environment '{conda_env}' not found",
                        "message": "Cannot reuse non-existing environment"
                    }

                # 在现有环境中安装requirements
                env_result = self._install_requirements_in_env(conda_env, requirements)
                if not env_result.get("success", False):
                    return env_result
            else:
                # 为任务创建新环境
                # 如果环境已存在，添加后缀
                original_env_name = conda_env
                suffix = 1
                while True:
                    env_list_result = self.conda_manager.list_environments()
                    if env_list_result.get("success", False):
                        env_names = [env.get("name") for env in env_list_result.get("output", {}).get("envs", [])]
                        if conda_env not in env_names:
                            break
                        conda_env = f"{original_env_name}_{suffix}"
                        suffix += 1
                    else:
                        break

                # 创建新环境并安装requirements
                env_result = self._create_env_with_requirements(conda_env, requirements)
                if not env_result.get("success", False):
                    return env_result

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
            'executions': []  # 存储该任务的所有执行记录ID
        }

        self.tasks.append(task)
        self.task_history[task_id] = []  # 初始化该任务的历史记录

        result = {"success": True, "message": "Task scheduled successfully", "task": task}

        # 如果有环境操作结果，添加到返回结果中
        if env_result and env_result.get("success", True):
            if reuse_env:
                result["environment_message"] = f"Requirements installed in existing environment '{conda_env}'"
            else:
                result["environment_message"] = f"New environment '{conda_env}' created with requirements"

        return result

    def clean_old_task_history(self):
        """清理超过一个月的任务执行记录"""
        one_month_ago = datetime.now() - timedelta(days=30)
        with self.lock:
            for task_id, executions in self.task_history.items():
                self.task_history[task_id] = [
                    execution for execution in executions
                    if datetime.strptime(execution['start_time'], '%Y-%m-%d %H:%M:%S') >= one_month_ago
                ]

    def _scheduler_loop(self):
        """调度器主循环，检查并执行到期任务"""
        while self.running:
            try:
                self._check_and_run_due_tasks()
                self.clean_old_task_history()  # 定期清理旧的任务记录
                time.sleep(1)  # 每秒检查一次
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {str(e)}")

    def _check_and_run_due_tasks(self):
        """检查并执行到期的任务"""
        now = datetime.now()
        with self.lock:
            for task in self.tasks:
                if task['status'] == 'scheduled' and task.get('next_run_time'):
                    next_run = datetime.strptime(task['next_run_time'], '%Y-%m-%d %H:%M:%S')
                    if now >= next_run:
                        # 创建新线程执行任务
                        thread = threading.Thread(target=self._execute_task, args=(task, ))
                        thread.daemon = True
                        thread.start()

                        # 如果任务有cron表达式，计算下一次执行时间
                        if task.get('cron_expression'):
                            iter = croniter(task['cron_expression'], now)
                            next_run = iter.get_next(datetime)
                            task['next_run_time'] = next_run.strftime('%Y-%m-%d %H:%M:%S')
                        else:
                            # 如果是一次性任务，将next_run_time设为None
                            task['next_run_time'] = None

    def _execute_task(self, task):
        """执行任务并监控资源使用情况"""
        task_id = task['task_id']
        execution_id = str(uuid.uuid4())
        task['status'] = 'running'
        task['last_execution_id'] = execution_id

        # 记录执行开始信息
        start_time = datetime.now()
        task['last_run_time'] = start_time.strftime('%Y-%m-%d %H:%M:%S')

        execution_record = {
            'execution_id': execution_id,
            'start_time': start_time.strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'running',
            'memory_usage': [],  # 记录内存使用情况
            'end_time': None,
            'duration': None,
            'peak_memory': None,
            'avg_memory': None,
            'exit_code': None,
            'logs': ''
        }

        # 添加到执行历史记录中
        with self.lock:
            task['executions'].append(execution_id)
            self.task_history[task_id].append(execution_record)

        try:
            # 创建命令
            command = f"conda run -n {task['conda_env']} python {task['script_path']}"

            # 启动进程
            process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

            # 监控进程的内存使用情况
            memory_monitor_thread = threading.Thread(target=self._monitor_process_memory,
                                                     args=(process.pid, task_id, execution_id))
            memory_monitor_thread.daemon = True
            memory_monitor_thread.start()

            # 读取并记录输出
            logs = []
            for line in process.stdout:
                logs.append(line.strip())
                with self.lock:
                    history_record = next((h for h in self.task_history[task_id] if h['execution_id'] == execution_id),
                                          None)
                    if history_record:
                        history_record['logs'] += line

            # 等待进程完成
            exit_code = process.wait()

            # 更新执行记录
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            with self.lock:
                # 更新任务状态
                task['status'] = 'completed' if exit_code == 0 else 'failed'
                task['last_run_duration'] = duration

                # 更新执行记录
                history_record = next((h for h in self.task_history[task_id] if h['execution_id'] == execution_id),
                                      None)
                if history_record:
                    history_record['status'] = 'completed' if exit_code == 0 else 'failed'
                    history_record['end_time'] = end_time.strftime('%Y-%m-%d %H:%M:%S')
                    history_record['duration'] = duration
                    history_record['exit_code'] = exit_code

                    # 计算内存使用统计
                    memory_samples = history_record['memory_usage']
                    if memory_samples:
                        history_record['peak_memory'] = max(memory_samples)
                        history_record['avg_memory'] = sum(memory_samples) / len(memory_samples)

        except Exception as e:
            self.logger.error(f"Error executing task {task_id}: {str(e)}")

            with self.lock:
                task['status'] = 'failed'

                # 更新执行记录
                history_record = next((h for h in self.task_history[task_id] if h['execution_id'] == execution_id),
                                      None)
                if history_record:
                    history_record['status'] = 'failed'
                    history_record['end_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    history_record['duration'] = (datetime.now() - start_time).total_seconds()
                    history_record['logs'] += f"\nError: {str(e)}"

    def _monitor_process_memory(self, pid, task_id, execution_id):
        """监控进程的内存使用情况"""
        try:
            process = psutil.Process(pid)
            while process.is_running() and psutil.pid_exists(pid):
                try:
                    # 获取内存使用情况（MB）
                    memory_mb = process.memory_info().rss / (1024 * 1024)

                    # 记录内存使用情况
                    with self.lock:
                        history_record = next(
                            (h for h in self.task_history[task_id] if h['execution_id'] == execution_id), None)
                        if history_record:
                            history_record['memory_usage'].append(memory_mb)

                    time.sleep(0.5)  # 每0.5秒采样一次
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass  # 进程可能已经结束

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
            task = next((t for t in self.tasks if t.get('task_id') == task_id), None)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 获取任务副本
            task_copy = task.copy()

            # 获取该任务的执行历史
            execution_history = self.task_history.get(task_id, [])

            # 获取执行时长历史数据，用于绘制折线图
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

            # 构建结果
            result = {
                "success": True,
                "task": task_copy,
                "execution_history": execution_history,
                "performance_metrics": {
                    "durations": durations,
                    "timestamps": timestamps,
                    "peak_memories": peak_memories,
                    "avg_memories": avg_memories
                }
            }

            # 如果存在最近一次执行，获取详细信息
            if task.get('last_execution_id'):
                last_execution = next(
                    (e for e in execution_history if e.get('execution_id') == task.get('last_execution_id')), None)
                if last_execution:
                    result["latest_execution"] = last_execution

            return result

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
            # 将requirements内容写入临时文件
            with open(req_file_path, 'w') as f:
                f.write(requirements)

            # 解析requirements文件，获取包列表
            packages = []
            with open(req_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        packages.append(line)

            if not packages:
                return {
                    "success": False,
                    "error": "No valid packages found in requirements",
                    "message": "Requirements file is empty or contains only comments"
                }

            # 备份环境当前状态（仅记录包列表，用于错误时的提示）
            cmd = ['conda', 'list', '--name', env_name, '--json']
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stdout, stderr = process.communicate()

            if stderr:
                return {
                    "success": False,
                    "error": stderr.decode('utf-8'),
                    "message": "Failed to backup environment state"
                }

            original_packages = json.loads(stdout.decode('utf-8'))

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
            # 将requirements内容写入临时文件
            with open(req_file_path, 'w') as f:
                f.write(requirements)

            # 解析requirements文件，获取包列表
            packages = []
            with open(req_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        packages.append(line)

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

    def get_stats(self):
        """
        获取任务统计信息
        返回各种状态任务的数量统计
        """
        with self.lock:
            stats = {'total': len(self.tasks), 'scheduled': 0, 'running': 0, 'completed': 0, 'failed': 0}

            for task in self.tasks:
                status = task.get('status', 'unknown')
                if status in stats:
                    stats[status] += 1
                else:
                    stats[status] = 1

            # 计算任务执行时间的统计信息
            durations = []
            for task_id, history in self.task_history.items():
                for execution in history:
                    if execution.get('duration') is not None:
                        durations.append(execution.get('duration'))

            if durations:
                stats['avg_duration'] = sum(durations) / len(durations)
                stats['min_duration'] = min(durations)
                stats['max_duration'] = max(durations)
            else:
                stats['avg_duration'] = 0
                stats['min_duration'] = 0
                stats['max_duration'] = 0

            # 计算成功率
            completed_count = stats.get('completed', 0)
            failed_count = stats.get('failed', 0)
            total_executed = completed_count + failed_count

            if total_executed > 0:
                stats['success_rate'] = (completed_count / total_executed) * 100
            else:
                stats['success_rate'] = 0

            return stats

    def get_task_history(self):
        """获取最近一个月的任务执行历史记录
        
        返回所有任务的执行历史记录，已按照最近一个月进行过滤
        """
        # 先清理旧记录，确保只返回最近一个月的数据
        self.clean_old_task_history()

        history_records = []
        with self.lock:
            # 遍历所有任务的历史记录
            for task_id, executions in self.task_history.items():
                # 查找对应的任务信息
                task = next((t for t in self.tasks if t.get('task_id') == task_id), None)
                if not task:
                    continue  # 如果任务不存在（可能已被删除），跳过

                task_name = task.get('task_name', f"Task-{task_id}")

                # 添加每次执行的记录
                for execution in executions:
                    history_record = {
                        'task_id': task_id,
                        'task_name': task_name,
                        'status': execution.get('status', 'unknown'),
                        'execution_time': execution.get('start_time'),
                        'duration': execution.get('duration'),
                        'peak_memory': execution.get('peak_memory'),
                        'avg_memory': execution.get('avg_memory'),
                        'exit_code': execution.get('exit_code'),
                        'execution_id': execution.get('execution_id')
                    }
                    history_records.append(history_record)

            # 按执行时间降序排序，最近的记录在前
            history_records.sort(key=lambda x: x.get('execution_time', ''), reverse=True)

            return history_records

    def shutdown(self):
        """停止调度器"""
        self.running = False
        if self.scheduler_thread.is_alive():
            self.scheduler_thread.join(timeout=5)
