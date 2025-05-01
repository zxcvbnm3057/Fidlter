from subprocess import Popen, PIPE
import json
import os


class CondaManager:

    def __init__(self, task_scheduler=None):
        self.conda_command = "conda"
        self.task_scheduler = task_scheduler

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

    def update_tasks_environment_reference(self, old_name, new_name):
        """更新任务中的环境引用
        
        当环境被重命名时，更新所有使用该环境的任务中的环境名称引用
        """
        if not self.task_scheduler:
            return 0

        # 获取所有任务
        tasks = self.task_scheduler.tasks
        updated_count = 0

        # 更新环境引用
        for task in tasks:
            if task.get('conda_env') == old_name:
                task['conda_env'] = new_name
                updated_count += 1

        return updated_count

    def create_environment(self, env_name, packages=None):
        """创建新的Conda环境
        
        参数:
            env_name: 环境名称
            packages: 要安装的包列表（可选）
            
        返回:
            包含操作结果的字典
        """
        # 检查环境名是否已存在
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [env.get("name") for env in env_list_result.get("output", {}).get("envs", [])]
            if any(name == env_name for name in env_names):
                return {
                    "success": False,
                    "error": f"Environment '{env_name}' already exists",
                    "message": "Environment with this name already exists"
                }

        # 创建环境
        command = [self.conda_command, "create", "--name", env_name, "--yes"]
        if packages:
            command += packages
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()
        return self._handle_process_output(stdout, stderr)

    def delete_environment(self, env_name):
        """删除Conda环境"""
        # 先检查环境是否被任务引用
        in_use, referencing_tasks = self.check_environment_in_use(env_name)
        if in_use:
            return {
                "success": False,
                "error": "Environment is in use by tasks",
                "message": "Cannot delete environment that is referenced by tasks",
                "referencing_tasks": [task.get('script_path', 'Unknown') for task in referencing_tasks]
            }

        command = [self.conda_command, "remove", "--name", env_name, "--yes"]
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()
        return self._handle_process_output(stdout, stderr)

    def list_environments(self):
        command = [self.conda_command, "env", "list", "--json"]
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()
        return self._handle_process_output(stdout, stderr)

    def rename_environment(self, old_name, new_name):
        """重命名Conda环境"""
        # Conda没有直接重命名环境的命令，需要通过克隆和删除实现
        # 1. 列出当前环境中的所有包
        command = [self.conda_command, "list", "--name", old_name, "--json"]
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()
        if stderr:
            return {"success": False, "error": stderr.decode("utf-8"), "message": "Environment not found"}

        packages_info = json.loads(stdout.decode("utf-8"))

        # 2. 创建新环境并安装所有包
        package_names = []
        for package in packages_info:
            if package.get("name") != "python":  # 排除python包，因为创建环境时会自动安装
                package_spec = f"{package.get('name')}={package.get('version')}"
                package_names.append(package_spec)

        # 获取Python版本
        python_version = None
        for package in packages_info:
            if package.get("name") == "python":
                python_version = package.get("version")
                break

        # 创建新环境
        create_command = [self.conda_command, "create", "--name", new_name, f"python={python_version}", "--yes"]
        process = Popen(create_command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()
        if stderr and b"error" in stderr.lower():
            return {"success": False, "error": stderr.decode("utf-8"), "message": "Failed to create new environment"}

        # 安装包
        if package_names:
            install_command = [self.conda_command, "install", "--name", new_name, "--yes"] + package_names
            process = Popen(install_command, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            if stderr and b"error" in stderr.lower():
                # 如果安装失败，删除新创建的环境
                self.delete_environment(new_name)
                return {
                    "success": False,
                    "error": stderr.decode("utf-8"),
                    "message": "Failed to install packages in new environment"
                }

        # 3. 删除旧环境
        delete_result = self.delete_environment(old_name)
        if not delete_result.get("success", False):
            return {
                "success": False,
                "error": delete_result.get("error", "Unknown error"),
                "message": "Failed to delete old environment"
            }

        # 4. 更新任务中的环境引用
        updated_tasks_count = self.update_tasks_environment_reference(old_name, new_name)

        return {
            "success": True,
            "message": "Environment renamed successfully",
            "old_name": old_name,
            "new_name": new_name,
            "updated_tasks_count": updated_tasks_count
        }

    def install_packages(self, env_name, packages):
        """在指定环境中安装包"""
        if not packages or not isinstance(packages, list):
            return {"success": False, "error": "No packages specified", "message": "No packages specified"}

        # 检查环境是否存在
        env_exists = False
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [env.get("name") for env in env_list_result.get("output", {}).get("envs", [])]
            env_exists = any(env_name == env_name for env_name in env_names)

        if not env_exists:
            return {
                "success": False,
                "error": f"Environment '{env_name}' not found",
                "message": "Environment not found"
            }

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

    def remove_packages(self, env_name, packages):
        """从指定环境中移除包"""
        if not packages or not isinstance(packages, list):
            return {"success": False, "error": "No packages specified", "message": "No packages specified"}

        # 检查环境是否存在
        env_exists = False
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [env.get("name") for env in env_list_result.get("output", {}).get("envs", [])]
            env_exists = any(env_name == env_name for env_name in env_names)

        if not env_exists:
            return {
                "success": False,
                "error": f"Environment '{env_name}' not found",
                "message": "Environment not found"
            }

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

    def _handle_process_output(self, stdout, stderr):
        if stderr:
            return {"success": False, "error": stderr.decode("utf-8")}
        return {"success": True, "output": json.loads(stdout.decode("utf-8"))}
