from app.services.conda.env_manager import EnvironmentManager
from app.services.conda.package_manager import PackageManager
from app.services.conda.stats_manager import StatsManager


class CondaManager:
    """Conda环境和包管理类，组合多个专门的管理器，提供统一的访问接口"""

    def __init__(self, task_scheduler=None):
        # 初始化各个子管理器
        self.env_manager = EnvironmentManager(task_scheduler)
        self.package_manager = PackageManager(task_scheduler)
        self.stats_manager = StatsManager(task_scheduler)

        # 设置公共属性
        self.task_scheduler = task_scheduler

    def set_task_scheduler(self, task_scheduler):
        """设置任务调度器实例，用于检查环境是否被任务引用"""
        self.task_scheduler = task_scheduler
        self.env_manager.set_task_scheduler(task_scheduler)
        self.package_manager.set_task_scheduler(task_scheduler)
        self.stats_manager.set_task_scheduler(task_scheduler)

    # 注意：不在此处实现具体的转发方法
    # 调用方应直接使用子管理器的方法，例如：
    # conda_manager.env_manager.create_environment()
    # conda_manager.package_manager.install_packages()
    # conda_manager.stats_manager.get_environment_stats()

    # 保留少量必要的快捷方法，供其他代码使用
    def check_environment_in_use(self, env_name):
        """检查环境是否被任务引用（保留此方法作为常用快捷方式）"""
        return self.env_manager.check_environment_in_use(env_name)
