from subprocess import Popen, PIPE
import logging


class PackageManager:
    """负责Conda环境中的包管理：安装、移除等"""

    def __init__(self, task_scheduler=None):
        self.conda_command = "conda"
        self.task_scheduler = task_scheduler
        self.logger = logging.getLogger("PackageManager")

    def set_task_scheduler(self, task_scheduler):
        """设置任务调度器实例，用于检查环境是否被任务引用"""
        self.task_scheduler = task_scheduler

    def check_environment_in_use(self, env_name):
        """检查环境是否被任务引用
        
        返回:
            (bool, list): (是否被引用, 引用该环境的任务列表)
        """
        if not self.task_scheduler:
            return False, []

        # 获取所有任务
        tasks = self.task_scheduler.tasks

        # 检查环境是否被任务引用
        referencing_tasks = []
        for task in tasks:
            if task.get('conda_env') == env_name:
                referencing_tasks.append(task)

        return len(referencing_tasks) > 0, referencing_tasks

    def install_packages(self, env_name, packages):
        """在指定环境中安装包"""
        if not packages or not isinstance(packages, list):
            return {"success": False, "error": "No packages specified", "message": "No packages specified"}

        # 检查环境是否被任务引用
        in_use, referencing_tasks = self.check_environment_in_use(env_name)
        if in_use:
            # 被任务引用的环境需要谨慎修改包
            return {
                "success": False,
                "error": "Environment is in use by tasks",
                "message": "Cannot modify packages in environment that is referenced by running tasks",
                "referencing_tasks": [task.get('script_path', 'Unknown') for task in referencing_tasks]
            }

        # 安装包
        command = [self.conda_command, "install", "--name", env_name, "--yes"] + packages
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        # 检查安装结果
        stderr_text = stderr.decode("utf-8") if stderr else ""
        if stderr and (b"error" in stderr.lower() or b"failed" in stderr.lower()
                       or b"could not find" in stderr.lower()):
            # 提取更具体的错误信息
            error_details = self._extract_package_error(stderr_text, packages)
            return {
                "success": False,
                "error": stderr_text,
                "message": "Failed to install packages",
                "failed_packages": error_details.get("failed_packages", []),
                "error_details": error_details.get("error_messages", [])
            }

        return {
            "success": True,
            "message": "Packages installed successfully",
            "environment": env_name,
            "installed_packages": packages
        }

    def remove_packages(self, env_name, packages):
        """从指定环境中移除包"""
        if not packages or not isinstance(packages, list):
            return {"success": False, "error": "No packages specified", "message": "No packages specified"}

        # 检查环境是否被任务引用
        in_use, referencing_tasks = self.check_environment_in_use(env_name)
        if in_use:
            # 被任务引用的环境需要谨慎移除包
            return {
                "success": False,
                "error": "Environment is in use by tasks",
                "message": "Cannot remove packages from environment that is referenced by running tasks",
                "referencing_tasks": [task.get('script_path', 'Unknown') for task in referencing_tasks]
            }

        # 移除包
        command = [self.conda_command, "remove", "--name", env_name, "--yes"] + packages
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()
        if stderr and b"error" in stderr.lower():
            return {"success": False, "error": stderr.decode("utf-8"), "message": "Failed to remove packages"}

        return {
            "success": True,
            "message": "Packages removed successfully",
            "environment": env_name,
            "removed_packages": packages
        }

    def _extract_package_error(self, error_text, requested_packages):
        """从错误文本中提取包特定的错误信息"""
        failed_packages = []
        error_messages = []

        # 常见的错误模式
        for package in requested_packages:
            if f"PackagesNotFoundError: The following packages are not available from current channels:\n  - {package}" in error_text:
                failed_packages.append(package)
                error_messages.append(f"Package '{package}' not found in available channels")
            elif f"- {package}" in error_text and "not available" in error_text:
                failed_packages.append(package)
                error_messages.append(f"Package '{package}' not available")
            elif f"CondaError: NetworkError: {package}" in error_text or f"ConnectionError: {package}" in error_text:
                failed_packages.append(package)
                error_messages.append(f"Network error when trying to install '{package}'")
            elif package in error_text and ("conflict" in error_text or "incompatible" in error_text):
                failed_packages.append(package)
                error_messages.append(f"Package '{package}' has conflicts with existing packages")

        # 如果没有识别到特定包的错误，但有错误发生
        if not failed_packages and error_text:
            # 提取一般性错误消息
            if "PackagesNotFoundError" in error_text:
                error_messages.append("One or more packages not found in available channels")
            elif "CondaError" in error_text:
                error_messages.append("Conda error occurred during installation")
            elif "ConnectionError" in error_text or "NetworkError" in error_text:
                error_messages.append("Network error occurred during installation")
            elif "UnsatisfiableError" in error_text:
                error_messages.append("Cannot satisfy package dependencies")
            else:
                error_messages.append("Unknown error occurred during package installation")

            # 尝试将所有请求的包标记为失败，因为我们不知道具体哪些失败了
            failed_packages = requested_packages

        return {"failed_packages": failed_packages, "error_messages": error_messages}
