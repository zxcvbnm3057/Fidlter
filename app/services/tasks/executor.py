import threading
import subprocess
import psutil
import time
import uuid
import logging
import os
import signal
from datetime import datetime


class TaskExecutor:
    """负责任务的执行和监控"""

    def __init__(self, history_manager):
        self.history = history_manager
        self.logger = logging.getLogger("TaskExecutor")
        self.lock = threading.Lock()
        self.pause_events = {}  # 用于存储任务ID与暂停事件的映射

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

        # 为任务创建暂停事件，默认为非阻塞状态
        with self.lock:
            self.pause_events[task_id] = threading.Event()
            self.pause_events[task_id].set()  # 设置为非阻塞状态

        try:
            # 创建命令 - 如果任务有自定义命令则使用，否则使用默认命令
            if task.get('command'):
                # 使用自定义命令
                command = f"conda run -n {task['conda_env']} {task['command']}"
            else:
                # 使用默认命令
                command = f"conda run -n {task['conda_env']} python {task['script_path']}"

            # 记录使用的命令到日志
            self.history.append_to_execution_log(
                task_id, execution_id,
                f"Executing command: {command}\nWorking directory: {os.path.dirname(task['script_path'])}\n\n")

            # 设置工作目录为脚本所在目录
            working_dir = os.path.dirname(task['script_path'])

            # 启动进程
            process = subprocess.Popen(command,
                                       shell=True,
                                       stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT,
                                       text=True,
                                       cwd=working_dir)

            # 存储进程PID，便于发送信号
            task['process_pid'] = process.pid

            # 监控进程的内存使用情况
            memory_monitor_thread = threading.Thread(target=self._monitor_process_memory,
                                                     args=(process.pid, task, execution_id))
            memory_monitor_thread.daemon = True
            memory_monitor_thread.start()

            # 读取并记录输出
            for line in process.stdout:
                # 检查暂停事件，如果被暂停则阻塞在这里
                self.pause_events[task_id].wait()

                self.history.append_to_execution_log(task_id, execution_id, line)

            # 等待进程完成
            exit_code = process.wait()

            # 更新执行记录
            end_time = datetime.now()
            start_time = datetime.strptime(
                self.history.get_execution_record(task_id, execution_id)['start_time'], '%Y-%m-%d %H:%M:%S')
            duration = (end_time - start_time).total_seconds()

            with self.lock:
                # 更新任务状态
                task['status'] = 'completed' if exit_code == 0 else 'failed'
                task['last_run_duration'] = duration

                # 清除进程PID
                if 'process_pid' in task:
                    del task['process_pid']

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

                # 任务完成后清理暂停事件
                if task_id in self.pause_events:
                    del self.pause_events[task_id]

        except Exception as e:
            self.logger.error(f"Error executing task {task_id}: {str(e)}")

            with self.lock:
                task['status'] = 'failed'

                # 清除进程PID
                if 'process_pid' in task:
                    del task['process_pid']

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

                # 出现异常时也清理暂停事件
                if task_id in self.pause_events:
                    del self.pause_events[task_id]

    def _monitor_process_memory(self, pid, task, execution_id):
        """监控进程的内存使用情况，如果设置了内存限制且超限则终止进程"""
        task_id = task['task_id']
        memory_limit = task.get('memory_limit')

        try:
            process = psutil.Process(pid)

            while process.is_running() and psutil.pid_exists(pid):
                try:
                    # 检查暂停状态，如果暂停则等待恢复
                    if task_id in self.pause_events:
                        self.pause_events[task_id].wait()

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
        # 首先不持有锁的情况下获取任务，避免长时间持有锁
        task = None
        task_status = None
        process_pid = None
        last_execution_id = None

        with self.lock:
            task = self._get_task(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 记录我们需要的信息，然后尽快释放锁
            task_status = task.get('status')
            process_pid = task.get('process_pid')
            last_execution_id = task.get('last_execution_id')

        # 检查任务状态
        if task_status != 'running':
            return {
                "success": False,
                "message": "Task is not in a running state",
                "error": f"Cannot stop a task with status: '{task_status}'",
                "current_status": task_status
            }

        # 如果任务正在运行，尝试终止它
        result = {"success": False, "message": "Failed to stop task"}

        if process_pid:
            try:
                # 尝试获取进程
                process = psutil.Process(process_pid)

                # 获取所有子进程
                child_processes = self._get_child_processes(process_pid)

                # 先终止子进程
                for pid in child_processes:
                    try:
                        child_process = psutil.Process(pid)
                        child_process.terminate()
                        self.logger.info(f"Terminated child process {pid}")
                    except (ProcessLookupError, psutil.NoSuchProcess, psutil.AccessDenied) as e:
                        self.logger.warning(f"Failed to terminate child process {pid}: {str(e)}")

                # 终止主进程
                process.terminate()
                self.logger.info(f"Terminated main process {process_pid}")

                # 更新状态 - 现在再获取锁
                with self.lock:
                    task = self._get_task(task_id)
                    if task:  # 再次检查任务是否存在
                        task['status'] = 'stopped'
                        if 'process_pid' in task:
                            del task['process_pid']

                # 更新执行记录
                if last_execution_id:
                    record = self.history.get_execution_record(task_id, last_execution_id)
                    if record:
                        updates = {
                            'status':
                            'stopped',
                            'end_time':
                            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'duration': (datetime.now() -
                                         datetime.strptime(record['start_time'], '%Y-%m-%d %H:%M:%S')).total_seconds(),
                            'logs':
                            record['logs'] + "\nTask was manually stopped"
                        }
                        self.history.update_execution_record(task_id, last_execution_id, updates)

                result = {"success": True, "message": "Task stopped successfully"}

            except (ProcessLookupError, psutil.NoSuchProcess) as e:
                self.logger.warning(f"Process {process_pid} not found: {str(e)}")

                # 进程已不存在，更新任务状态
                with self.lock:
                    task = self._get_task(task_id)
                    if task:
                        task['status'] = 'stopped'
                        if 'process_pid' in task:
                            del task['process_pid']

                result = {"success": True, "message": "Process was already terminated, task status updated"}

            except Exception as e:
                self.logger.error(f"Error stopping task {task_id}: {str(e)}")
                result = {"success": False, "message": f"Error stopping task: {str(e)}"}

        # 清理暂停事件
        if task_id in self.pause_events:
            self.pause_events[task_id].set()  # 确保没有被阻塞的线程
            del self.pause_events[task_id]

        return result

    def set_task_provider(self, provider_func):
        """设置任务提供函数，用于获取任务对象
        
        参数:
            provider_func: 函数，接受task_id参数，返回任务对象
        """
        self._get_task = provider_func

    def pause_task(self, task_id):
        """暂停正在运行的任务，使用系统信号真正暂停进程执行
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        # 首先在锁内获取需要的信息，然后尽快释放锁
        task = None
        process_pid = None
        previous_status = None
        execution_id = None

        with self.lock:
            # 获取任务对象
            task = self._get_task(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 检查任务状态
            if task['status'] != 'running':
                return {
                    "success": False,
                    "message": "Task cannot be paused",
                    "error": f"Cannot pause a task with status: '{task['status']}'",
                    "current_status": task['status']
                }

            # 检查暂停事件是否存在
            if task_id not in self.pause_events:
                return {
                    "success": False,
                    "message": "Task execution thread not found",
                    "error": "Cannot pause task: execution thread not found"
                }

            # 检查是否有进程PID
            if 'process_pid' not in task:
                return {
                    "success": False,
                    "message": "Process PID not found",
                    "error": "Cannot pause task: process PID not found"
                }

            # 记录我们需要的信息
            process_pid = task['process_pid']
            previous_status = task['status']
            execution_id = task.get('last_execution_id')

            # 更新任务状态
            task['status'] = 'paused'

            # 暂停任务线程 - 必须在锁内完成，因为涉及到共享的事件对象
            self.pause_events[task_id].clear()  # 清除事件，阻塞线程

        # 锁外执行可能耗时的系统调用
        try:
            # 获取所有子进程 - 在锁外执行
            child_processes = self._get_child_processes(process_pid)

            # 暂停所有子进程和主进程
            for pid in child_processes:
                try:
                    os.kill(pid, signal.SIGSTOP)
                    self.logger.info(f"Sent SIGSTOP to child process {pid}")
                except (ProcessLookupError, PermissionError) as e:
                    self.logger.warning(f"Failed to send SIGSTOP to child process {pid}: {str(e)}")

            # 暂停主进程
            try:
                os.kill(process_pid, signal.SIGSTOP)
                self.logger.info(f"Sent SIGSTOP to main process {process_pid}")
            except (ProcessLookupError, PermissionError) as e:
                self.logger.warning(f"Failed to send SIGSTOP to main process {process_pid}: {str(e)}")

        except Exception as e:
            self.logger.error(f"Error pausing process: {str(e)}")
            # 即使进程暂停失败，我们也保持任务状态为paused，因为线程已经被暂停

        # 更新执行记录 - 锁外执行
        if execution_id:
            record = self.history.get_execution_record(task_id, execution_id)
            if record:
                updates = {
                    'status': 'paused',
                    'logs': record['logs'] + "\nTask was paused manually. Process execution suspended."
                }
                self.history.update_execution_record(task_id, execution_id, updates)

        self.logger.info(f"Task {task_id} paused successfully")

        return {
            "success": True,
            "message": "Task paused successfully",
            "task": {
                "task_id": task_id,
                "task_name": task.get('task_name') if task else None,
                "status": 'paused',
                "previous_status": previous_status
            }
        }

    def resume_task(self, task_id):
        """恢复已暂停的任务，使用系统信号真正恢复进程执行
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        # 首先在锁内获取需要的信息，然后尽快释放锁
        task = None
        process_pid = None
        previous_status = None
        execution_id = None

        with self.lock:
            # 获取任务对象
            task = self._get_task(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            # 检查任务状态
            if task['status'] != 'paused':
                return {
                    "success": False,
                    "message": "Task is not paused",
                    "error": f"Cannot resume a task with status: '{task['status']}'",
                    "current_status": task['status']
                }

            # 检查暂停事件是否存在
            if task_id not in self.pause_events:
                return {
                    "success": False,
                    "message": "Task execution thread not found",
                    "error": "Cannot resume task: execution thread not found"
                }

            # 检查是否有进程PID
            if 'process_pid' not in task:
                return {
                    "success": False,
                    "message": "Process PID not found",
                    "error": "Cannot resume task: process PID not found"
                }

            # 记录我们需要的信息
            process_pid = task['process_pid']
            previous_status = task['status']
            execution_id = task.get('last_execution_id')

            # 更新任务状态
            task['status'] = 'running'

        # 锁外执行可能耗时的系统调用
        try:
            # 获取所有子进程 - 在锁外执行
            child_processes = self._get_child_processes(process_pid)

            # 恢复所有子进程
            for pid in child_processes:
                try:
                    os.kill(pid, signal.SIGCONT)
                    self.logger.info(f"Sent SIGCONT to child process {pid}")
                except (ProcessLookupError, PermissionError) as e:
                    self.logger.warning(f"Failed to send SIGCONT to child process {pid}: {str(e)}")

            # 恢复主进程
            try:
                os.kill(process_pid, signal.SIGCONT)
                self.logger.info(f"Sent SIGCONT to main process {process_pid}")
            except (ProcessLookupError, PermissionError) as e:
                self.logger.warning(f"Failed to send SIGCONT to main process {process_pid}: {str(e)}")

        except Exception as e:
            self.logger.error(f"Error resuming process: {str(e)}")
            # 即使进程恢复失败，我们也继续恢复线程

        # 恢复任务线程 - 必须在锁外单独获取锁，因为涉及到共享的事件对象
        with self.lock:
            if task_id in self.pause_events:
                self.pause_events[task_id].set()  # 设置事件，解除线程阻塞

        # 更新执行记录 - 锁外执行
        if execution_id:
            record = self.history.get_execution_record(task_id, execution_id)
            if record:
                updates = {
                    'status': 'running',
                    'logs': record['logs'] + "\nTask was resumed manually. Process execution continued."
                }
                self.history.update_execution_record(task_id, execution_id, updates)

        self.logger.info(f"Task {task_id} resumed successfully")

        return {
            "success": True,
            "message": "Task resumed successfully",
            "task": {
                "task_id": task_id,
                "task_name": task.get('task_name') if task else None,
                "status": 'running',
                "previous_status": previous_status
            }
        }

    def _get_child_processes(self, parent_pid):
        """获取一个进程的所有子进程PID
        
        参数:
            parent_pid: 父进程PID
            
        返回:
            包含所有子进程PID的列表
        """
        try:
            parent = psutil.Process(parent_pid)
            children = parent.children(recursive=True)
            return [child.pid for child in children]
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return []

    def is_task_paused(self, task_id):
        """检查任务是否处于暂停状态
        
        参数:
            task_id: 任务ID
            
        返回:
            布尔值，表示任务是否暂停
        """
        with self.lock:
            # 检查任务ID是否在暂停事件字典中
            if task_id not in self.pause_events:
                return False

            # 检查暂停事件的状态，如果是被清除状态（not set）则表示任务已暂停
            return not self.pause_events[task_id].is_set()
