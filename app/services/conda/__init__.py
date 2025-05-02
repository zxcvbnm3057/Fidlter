from app.services.conda.env_manager import EnvironmentManager
from app.services.conda.package_manager import PackageManager
from app.services.conda.stats_manager import StatsManager


class CondaManager:
    """Conda环境和包管理类，重构为组合多个专门的管理器"""

    def __init__(self, task_scheduler=None):
        self.env_manager = EnvironmentManager(task_scheduler)
        self.package_manager = PackageManager(task_scheduler)
        self.stats_manager = StatsManager(task_scheduler)

    def set_task_scheduler(self, task_scheduler):
        """设置任务调度器实例，用于检查环境是否被任务引用"""
        self.env_manager.set_task_scheduler(task_scheduler)
        self.package_manager.set_task_scheduler(task_scheduler)
        self.stats_manager.set_task_scheduler(task_scheduler)

    def check_environment_in_use(self, env_name):
        """检查环境是否被任务引用"""
        return self.env_manager.check_environment_in_use(env_name)

    def update_tasks_environment_reference(self, old_name, new_name):
        """更新任务中的环境引用"""
        return self.env_manager.update_tasks_environment_reference(old_name, new_name)

    def create_environment(self, env_name, packages=None):
        """创建新的Conda环境"""
        return self.env_manager.create_environment(env_name, packages)

    def delete_environment(self, env_name):
        """删除Conda环境"""
        return self.env_manager.delete_environment(env_name)

    def list_environments(self):
        """列出所有Conda环境，排除base环境"""
        return self.env_manager.list_environments()

    def rename_environment(self, old_name, new_name):
        """重命名Conda环境"""
        return self.env_manager.rename_environment(old_name, new_name)

    def install_packages(self, env_name, packages):
        """在指定环境中安装包"""
        return self.package_manager.install_packages(env_name, packages)

    def remove_packages(self, env_name, packages):
        """从指定环境中移除包"""
        return self.package_manager.remove_packages(env_name, packages)

    def get_environment_stats(self):
        """获取Conda环境的统计信息"""
        return self.stats_manager.get_environment_stats()

    def get_environment_details(self, env_name):
        """获取特定环境的详细信息"""
        return self.stats_manager.get_environment_details(env_name)
