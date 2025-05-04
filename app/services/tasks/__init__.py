from app.services.tasks.scheduler import Scheduler
from app.services.tasks.executor import TaskExecutor
from app.services.tasks.history import TaskHistory
from app.services.tasks.stats import TaskStats
from app.services.tasks.file_manager import TaskFileManager
from app.services.tasks.operation_manager import TaskOperationManager

__all__ = ['TaskFileManager', 'TaskOperationManager']


class TaskScheduler:
    """任务调度管理类，重构为组合多个专门的子模块"""

    def __init__(self, conda_manager=None):
        self.history = TaskHistory()
        self.executor = TaskExecutor(self.history)
        self.scheduler = Scheduler(self.executor, self.history)
        self.stats = TaskStats(self.history, self.scheduler)

        # 设置conda_manager
        self.conda_manager = conda_manager
        self.scheduler.set_conda_manager(conda_manager)

        # 属性转发 - 保持与原始API兼容
        self.tasks = self.scheduler.repository.tasks
        self.task_history = self.history.task_history
        self.next_task_id = self.scheduler.repository.next_task_id
        self.lock = self.scheduler.lock

    def set_conda_manager(self, conda_manager):
        """设置Conda管理器实例，用于环境操作"""
        self.conda_manager = conda_manager
        self.scheduler.set_conda_manager(conda_manager)

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
            command: 自定义启动命令，如果为None则自动基于脚本构建命令
            
        返回:
            创建的任务对象或错误信息
        """
        return self.scheduler.schedule_task(script_path, conda_env, task_name, requirements, reuse_env, cron_expression,
                                            delay_seconds, priority, memory_limit)

    def clean_old_task_history(self):
        """清理超过一个月的任务执行记录"""
        self.history.clean_old_records()

    def get_tasks(self):
        """获取所有任务列表，包含执行信息"""
        return self.scheduler.get_tasks()

    def get_task_status(self, task_id):
        """获取指定任务的状态和执行历史"""
        return self.scheduler.get_task_status(task_id)

    def get_stats(self):
        """获取任务统计信息"""
        return self.stats.get_task_stats()

    def pause_task(self, task_id):
        """暂停任务调度"""
        return self.scheduler.pause_task(task_id)

    def resume_task(self, task_id):
        """恢复已暂停的任务"""
        return self.scheduler.resume_task(task_id)

    def get_task_history(self):
        """获取最近一个月的任务执行历史记录"""
        return self.history.get_task_history()

    def shutdown(self):
        """停止调度器"""
        self.scheduler.shutdown()

    def stop_task(self, task_id):
        """停止任务，包括停止正在运行的任务进程和禁用任务调度
        
        此方法整合了原先的stop_task和disable_task功能:
        1. 对于正在运行的任务，会先停止其执行进程
        2. 对于所有状态的任务，会将其状态设为stopped，不再参与后续调度
        
        参数:
            task_id: 任务ID
            
        返回:
            包含操作结果的字典
        """
        with self.lock:
            # 查找任务
            task = self.scheduler._get_task_by_id(task_id)
            if not task:
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            previous_status = task['status']

            # 如果任务已经是stopped状态，返回错误
            if task['status'] == 'stopped':
                return {
                    "success": False,
                    "message": "Task is already stopped",
                    "error": "Cannot stop a task that is already stopped",
                    "current_status": task['status']
                }

            # 如果任务正在运行，先停止执行
            if task['status'] == 'running':
                stop_result = self.executor.stop_task(task_id)
                if not stop_result.get("success", False):
                    return stop_result

                # 执行器的stop_task已将状态设为stopped，直接返回结果
                return stop_result

            # 如果任务状态是已调度或已暂停，则将其状态设为stopped
            elif task['status'] in ['scheduled', 'paused']:
                # 禁用任务，不再参与调度
                task['status'] = 'stopped'

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
            else:
                # 对于其他状态（如completed或failed）
                return {
                    "success": False,
                    "message": "Task cannot be stopped",
                    "error": f"Cannot stop a task with status: '{task['status']}'",
                    "current_status": task['status']
                }
