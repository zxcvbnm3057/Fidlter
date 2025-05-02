from app.services.tasks.scheduler import Scheduler
from app.services.tasks.executor import TaskExecutor
from app.services.tasks.history import TaskHistory
from app.services.tasks.stats import TaskStats


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
        self.tasks = self.scheduler.tasks
        self.task_history = self.history.task_history
        self.next_task_id = self.scheduler.next_task_id
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
                      memory_limit=None):
        """调度一个新任务"""
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

    def get_task_history(self):
        """获取最近一个月的任务执行历史记录"""
        return self.history.get_task_history()

    def shutdown(self):
        """停止调度器"""
        self.scheduler.shutdown()

    def stop_task(self, task_id):
        """停止正在运行的任务"""
        return self.executor.stop_task(task_id)
