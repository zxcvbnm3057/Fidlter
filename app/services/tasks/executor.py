import threading
import subprocess
import psutil
import time
import uuid
import logging
from datetime import datetime


class TaskExecutor:
    """负责任务的执行和监控"""

    def __init__(self, history_manager):
        self.history = history_manager
        self.logger = logging.getLogger("TaskExecutor")
        self.lock = threading.Lock()

    def execute_task(self, task):
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
            self.history.add_execution_record(task_id, execution_record)

        # 启动执行线程
        execution_thread = threading.Thread(target=self._run_task_process, args=(task, execution_id))
        execution_thread.daemon = True
        execution_thread.start()

        return execution_id

    def _run_task_process(self, task, execution_id):
        """在单独的线程中运行任务进程"""
        task_id = task['task_id']

        try:
            # 创建命令
            command = f"conda run -n {task['conda_env']} python {task['script_path']}"

            # 启动进程
            process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

            # 监控进程的内存使用情况
            memory_monitor_thread = threading.Thread(target=self._monitor_process_memory,
                                                     args=(process.pid, task, execution_id))
            memory_monitor_thread.daemon = True
            memory_monitor_thread.start()

            # 读取并记录输出
            for line in process.stdout:
                self.history.append_to_execution_log(task_id, execution_id, line)

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
                updates = {
                    'status': 'completed' if exit_code == 0 else 'failed',
                    'end_time': end_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'duration': duration,
                    'exit_code': exit_code
                }

                # 计算内存使用统计
                record = self.history.get_execution_record(task_id, execution_id)
                if record and record.get('memory_usage'):
                    memory_samples = record['memory_usage']
                    updates['peak_memory'] = max(memory_samples)
                    updates['avg_memory'] = sum(memory_samples) / len(memory_samples)

                self.history.update_execution_record(task_id, execution_id, updates)

        except Exception as e:
            self.logger.error(f"Error executing task {task_id}: {str(e)}")

            with self.lock:
                task['status'] = 'failed'

                # 更新执行记录
                updates = {
                    'status':
                    'failed',
                    'end_time':
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'duration': (datetime.now() - datetime.strptime(
                        self.history.get_execution_record(task_id, execution_id)['start_time'],
                        '%Y-%m-%d %H:%M:%S')).total_seconds(),
                    'logs':
                    self.history.get_execution_record(task_id, execution_id)['logs'] + f"\nError: {str(e)}"
                }
                self.history.update_execution_record(task_id, execution_id, updates)

    def _monitor_process_memory(self, pid, task, execution_id):
        """监控进程的内存使用情况，如果设置了内存限制且超限则终止进程"""
        task_id = task['task_id']
        memory_limit = task.get('memory_limit')

        try:
            process = psutil.Process(pid)

            while process.is_running() and psutil.pid_exists(pid):
                try:
                    # 获取内存使用情况（MB）
                    memory_mb = process.memory_info().rss / (1024 * 1024)

                    # 记录内存使用情况
                    record = self.history.get_execution_record(task_id, execution_id)
                    if record:
                        with self.lock:
                            record['memory_usage'].append(memory_mb)

                    # 检查是否超过内存限制
                    if memory_limit and memory_mb > memory_limit:
                        self.logger.warning(
                            f"Task {task_id} exceeded memory limit of {memory_limit}MB (current: {memory_mb:.2f}MB). Terminating..."
                        )

                        # 终止进程
                        process.terminate()

                        # 更新任务状态和记录
                        with self.lock:
                            task['status'] = 'failed'

                            updates = {
                                'status':
                                'failed',
                                'end_time':
                                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'duration':
                                (datetime.now() -
                                 datetime.strptime(record['start_time'], '%Y-%m-%d %H:%M:%S')).total_seconds(),
                                'logs':
                                record['logs'] +
                                f"\nTask terminated: Memory usage exceeded limit of {memory_limit}MB (reached {memory_mb:.2f}MB)"
                            }

                            # 计算内存使用统计
                            memory_samples = record['memory_usage']
                            if memory_samples:
                                updates['peak_memory'] = max(memory_samples)
                                updates['avg_memory'] = sum(memory_samples) / len(memory_samples)

                            self.history.update_execution_record(task_id, execution_id, updates)
                        break

                    time.sleep(0.5)  # 每0.5秒采样一次
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    break
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass  # 进程可能已经结束

    def stop_task(self, task_id):
        """停止正在运行的任务
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        with self.lock:
            # 此函数应该由外部提供task对象
            task = self._get_task(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 检查任务状态
            if task['status'] != 'running':
                return {
                    "success": False,
                    "message": "Task is not in a running state",
                    "error": f"Cannot stop a task with status: '{task['status']}'",
                    "current_status": task['status']
                }

            previous_status = task['status']

            # 如果任务正在运行，尝试终止它
            if task.get('last_execution_id'):
                # 查找最近一次执行的记录
                execution_id = task.get('last_execution_id')
                record = self.history.get_execution_record(task_id, execution_id)

                if record and record.get('status') == 'running':
                    try:
                        # 更新执行记录和任务状态
                        task['status'] = 'stopped'

                        updates = {
                            'status': 'stopped',
                            'end_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'logs': record['logs'] + "\nTask was stopped manually."
                        }
                        self.history.update_execution_record(task_id, execution_id, updates)

                        # 尝试终止相关进程
                        command = f"conda run -n {task['conda_env']} python {task['script_path']}"
                        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                            if proc.info['cmdline'] and command in ' '.join(proc.info['cmdline']):
                                try:
                                    proc.terminate()  # 发送终止信号
                                except (psutil.NoSuchProcess, psutil.AccessDenied):
                                    pass

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
                    except Exception as e:
                        return {"success": False, "message": f"Failed to stop task: {str(e)}", "error": str(e)}

            # 如果没有找到对应的执行记录，但任务状态是running
            # 仍然更新任务状态为stopped
            task['status'] = 'stopped'
            return {
                "success": True,
                "message": "Task marked as stopped",
                "task": {
                    "task_id": task_id,
                    "task_name": task.get('task_name'),
                    "status": 'stopped',
                    "previous_status": previous_status
                }
            }

    def set_task_provider(self, provider_func):
        """设置任务提供函数，用于获取任务对象
        
        参数:
            provider_func: 函数，接受task_id参数，返回任务对象
        """
        self._get_task = provider_func
