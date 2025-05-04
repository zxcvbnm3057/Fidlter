from app.services.tasks.scheduler import Scheduler
from app.services.tasks.executor import TaskExecutor
from app.services.tasks.history import TaskHistory
from app.services.tasks.stats import TaskStats
from app.services.tasks.file_manager import TaskFileManager
from app.services.tasks.operation_manager import TaskOperationManager

__all__ = ['TaskFileManager', 'TaskOperationManager']


class TaskScheduler:
    """任务调度管理类，组合多个专门的子模块
    
    此类作为各个任务相关子模块的容器，通过组合模式而非继承实现功能扩展
    """

    def __init__(self, conda_manager=None):
        # 初始化各个子模块
        self.history = TaskHistory()
        self.executor = TaskExecutor(self.history)
        self.scheduler = Scheduler(self.executor, self.history)
        self.stats = TaskStats(self.history, self.scheduler)

        # 创建操作管理器
        self.operation_manager = TaskOperationManager(self)

        # 设置conda_manager
        self.conda_manager = conda_manager
        if conda_manager:
            self.scheduler.set_conda_manager(conda_manager)

        # 设置任务名称提供函数
        self.history.set_task_name_provider(lambda task_id: self._get_task_name(task_id))

    def _get_task_name(self, task_id):
        """获取任务名称的内部方法，用于TaskHistory的任务名称查询"""
        task = self.scheduler.repository.get_task(task_id)
        return task.get('task_name') if task else None

    @property
    def tasks(self):
        """提供任务列表的只读访问"""
        return self.scheduler.repository.get_all_tasks()

    @property
    def task_history(self):
        """提供任务历史记录的只读访问"""
        return self.history.get_task_history()

    @property
    def next_task_id(self):
        """获取下一个任务ID"""
        return self.scheduler.repository.next_task_id

    def set_conda_manager(self, conda_manager):
        """设置Conda管理器实例，用于环境操作"""
        self.conda_manager = conda_manager
        self.scheduler.set_conda_manager(conda_manager)

    # 注意：仅保留少量核心方法，其他方法应直接通过子模块调用
    # 例如：task_scheduler.scheduler.get_tasks()
    #      task_scheduler.history.get_task_history()
    #      task_scheduler.stats.get_task_stats()

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
        """调度一个新任务（保留此核心方法作为主要入口点）"""
        return self.scheduler.schedule_task(script_path, conda_env, task_name, requirements, reuse_env, cron_expression,
                                            delay_seconds, priority, memory_limit, command)

    def stop_task(self, task_id):
        """停止任务（保留此常用方法作为快捷方式）"""
        return self.scheduler.stop_task(task_id)

    def shutdown(self):
        """停止调度器（保留此系统生命周期方法）"""
        self.scheduler.shutdown()
