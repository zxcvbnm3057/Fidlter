from subprocess import Popen, PIPE
import json
import os
from datetime import datetime, timedelta


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

        # 修正命令：使用 conda env remove 而不是 conda remove
        command = [self.conda_command, "env", "remove", "--name", env_name, "--yes"]
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        # 检查命令执行结果
        if process.returncode != 0 or (stderr and (b"error" in stderr.lower())):
            return {
                "success": False,
                "error": stderr.decode("utf-8") if stderr else f"Failed to delete environment '{env_name}'",
                "message": "Failed to delete environment"
            }

        return {"success": True, "message": f"Environment '{env_name}' deleted successfully"}

    def list_environments(self):
        """列出所有Conda环境，排除base环境"""
        command = [self.conda_command, "info", "--json"]
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        # 处理命令执行结果
        if stderr:
            return {"success": False, "error": stderr.decode("utf-8")}

        # 解析JSON输出
        conda_info = json.loads(stdout.decode("utf-8"))

        # 获取root_prefix（base环境路径）和所有环境路径
        root_prefix = conda_info.get("root_prefix")
        all_envs = conda_info.get("envs", [])

        # 过滤掉base环境
        if root_prefix:
            filtered_envs = [env for env in all_envs if env != root_prefix]
        else:
            filtered_envs = all_envs

        # 构建与原来格式兼容的输出
        output = {"envs": filtered_envs, "root_prefix": root_prefix}

        return {"success": True, "output": output}

    def rename_environment(self, old_name, new_name):
        """重命名Conda环境"""
        # 检查环境是否存在
        env_exists = False
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            env_exists = any(name == old_name for name in env_names)

        if not env_exists:
            return {
                "success": False,
                "error": f"Environment '{old_name}' not found",
                "message": "Environment not found"
            }

        # 检查新名称是否已存在
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            if any(name == new_name for name in env_names):
                return {
                    "success": False,
                    "error": f"Environment '{new_name}' already exists",
                    "message": "Environment with this name already exists"
                }

        # 先检查环境是否被任务引用
        in_use, referencing_tasks = self.check_environment_in_use(old_name)
        if in_use:
            # 被任务引用的环境可以安全地重命名，因为我们会更新引用
            # 但是需要提醒用户这一操作
            pass  # 允许继续，但在返回结果中标记此情况

        # 使用conda rename命令直接重命名环境
        command = [self.conda_command, "rename", "--name", old_name, new_name, "--yes"]
        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        if process.returncode != 0 or (stderr and (b"error" in stderr.lower())):
            return {
                "success": False,
                "error": stderr.decode("utf-8") if stderr else "Unknown error during environment rename",
                "message": "Failed to rename environment"
            }

        # 更新任务中的环境引用
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

    def get_environment_stats(self):
        """获取Conda环境的统计信息
        
        返回:
            dict: 包含环境统计信息的字典
        """
        # 获取环境列表
        env_list_result = self.list_environments()
        if not env_list_result.get("success", False):
            return {
                "success": False,
                "error": "Failed to get environment statistics",
                "message": "Failed to list environments"
            }

        conda_envs = env_list_result.get("output", {})
        envs = conda_envs.get("envs", [])

        # 获取活跃环境（被任务使用的环境）
        active_envs = []
        if self.task_scheduler:
            tasks = self.task_scheduler.tasks
            for task in tasks:
                env_name = task.get('conda_env')
                if env_name and env_name not in active_envs:
                    active_envs.append(env_name)

        # 计算每个环境的使用情况（被多少任务使用）
        env_usage = []
        package_stats = []
        total_disk_usage = 0
        latest_created = None
        latest_time = None

        for idx, env_path in enumerate(envs):
            env_name = os.path.basename(env_path)

            # 计算使用率 - 被多少任务使用
            usage_count = 0
            if self.task_scheduler:
                for task in self.task_scheduler.tasks:
                    if task.get('conda_env') == env_name:
                        usage_count += 1

            # 计算使用百分比
            total_tasks = len(self.task_scheduler.tasks) if self.task_scheduler else 0
            usage_percent = (usage_count / total_tasks * 100) if total_tasks > 0 else 0

            # 获取环境的包数量
            try:
                command = [self.conda_command, "list", "--name", env_name, "--json"]
                process = Popen(command, stdout=PIPE, stderr=PIPE)
                stdout, stderr = process.communicate()
                if not stderr:
                    packages_info = json.loads(stdout.decode("utf-8"))
                    package_count = len(packages_info)
                else:
                    package_count = 0
            except Exception:
                package_count = 0

            # 估算磁盘使用量（实际应通过其他命令获取）
            # 这里简单估算：每个包平均5MB
            disk_usage = package_count * 0.005  # GB
            total_disk_usage += disk_usage

            # 获取环境创建时间（实际应从环境元数据获取）
            # 这里使用当前时间减去索引值作为模拟
            created_time = datetime.now() - timedelta(days=idx)
            created_at = created_time.strftime("%Y-%m-%d %H:%M:%S")

            # 记录最新创建的环境
            if latest_time is None or created_time > latest_time:
                latest_time = created_time
                latest_created = {"name": env_name, "created_at": created_at}

            # 添加到使用情况列表
            env_usage.append({"name": env_name, "usage_percent": round(usage_percent)})

            # 添加到包统计列表
            package_stats.append({"name": env_name, "package_count": package_count})

        # 构建统计信息
        stats = {
            "total_environments": len(envs),
            "active_environments": len(active_envs),
            "total_disk_usage": round(total_disk_usage, 2),
            "latest_created": latest_created,
            "environment_usage": env_usage,
            "package_stats": package_stats
        }

        return {"success": True, "output": stats}

    def get_environment_details(self, env_name):
        """获取特定环境的详细信息
        
        参数:
            env_name: 环境名称
            
        返回:
            dict: 包含环境详情的字典
        """
        # 获取环境列表
        env_list_result = self.list_environments()
        if not env_list_result.get("success", False):
            return {
                "success": False,
                "error": "Failed to get environment details",
                "message": "Failed to list environments"
            }

        conda_envs = env_list_result.get("output", {})
        envs = conda_envs.get("envs", [])

        # 根据名称查找环境
        env_path = None
        for path in envs:
            if os.path.basename(path) == env_name:
                env_path = path
                break

        if not env_path:
            return {
                "success": False,
                "error": f"Environment with name '{env_name}' not found",
                "message": "Environment not found"
            }

        # 获取环境的Python版本和所有包列表
        python_version = "Unknown"
        packages = []
        try:
            command = [self.conda_command, "list", "-p", env_path, "--json"]
            process = Popen(command, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            if process.returncode == 0 and not stderr:
                packages_info = json.loads(stdout.decode("utf-8"))
                for package in packages_info:
                    if package.get("name") == "python":
                        python_version = package.get("version")
                    # 包含所有包，不再过滤
                    packages.append({"name": package.get("name"), "version": package.get("version")})
            else:
                error_msg = stderr.decode(
                    'utf-8') if stderr else f"Command failed with return code {process.returncode}"
                print(f"Error getting package list: {error_msg}")
        except Exception as e:
            print(f"Exception getting package information: {str(e)}")
            # 如果发生异常，确保返回空数组而不是None
            packages = []

        # 获取环境信息 - 包括创建时间和位置
        env_info = {}
        try:
            command = [self.conda_command, "env", "list", "--json"]
            process = Popen(command, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            if not stderr:
                env_list = json.loads(stdout.decode("utf-8"))
                # 查找匹配的环境
                for env in env_list.get("envs", []):
                    if os.path.basename(env) == env_name:
                        env_info["path"] = env
                        # 获取环境目录的创建时间作为环境创建时间
                        try:
                            created_at = datetime.fromtimestamp(os.path.getctime(env))
                            env_info["created_at"] = created_at.strftime("%Y-%m-%d")
                        except Exception:
                            env_info["created_at"] = datetime.now().strftime("%Y-%m-%d")
                        break
        except Exception as e:
            print(f"Exception getting environment info: {str(e)}")

        # 如果没有获取到创建时间，使用当前时间
        if "created_at" not in env_info:
            env_info["created_at"] = datetime.now().strftime("%Y-%m-%d")

        # 获取环境使用统计
        total_tasks = 0
        successful_tasks = 0
        failed_tasks = 0
        active_tasks = 0
        total_duration = 0
        last_used = None

        if self.task_scheduler:
            for task in self.task_scheduler.tasks:
                if task.get('conda_env') == env_name:
                    total_tasks += 1
                    task_status = task.get('status', '')

                    # 检查任务状态
                    if task_status == 'completed':
                        successful_tasks += 1
                        # 如果有持续时间数据，计算平均执行时间
                        duration = task.get('last_run_duration')
                        if duration:
                            try:
                                total_duration += float(duration)
                            except (ValueError, TypeError):
                                pass
                    elif task_status == 'failed':
                        failed_tasks += 1
                    elif task_status in ['running', 'scheduled']:
                        active_tasks += 1

                    # 更新最后使用时间
                    task_run_time = task.get('last_run_time')
                    if task_run_time:
                        try:
                            task_time = datetime.strptime(task_run_time, '%Y-%m-%d %H:%M:%S')
                            if last_used is None or task_time > last_used:
                                last_used = task_time
                        except ValueError:
                            pass

        # 计算成功率和平均执行时间
        success_rate = (successful_tasks / total_tasks * 100) if total_tasks > 0 else 0
        avg_execution_time = (total_duration / successful_tasks) if successful_tasks > 0 else 0

        # 计算实际磁盘使用量
        disk_usage = 0
        try:
            if "path" in env_info:
                # 使用du命令获取文件夹大小 (Linux/MacOS)
                if os.name != 'nt':  # 非Windows系统
                    command = ["du", "-sk", env_info["path"]]
                    process = Popen(command, stdout=PIPE, stderr=PIPE)
                    stdout, stderr = process.communicate()
                    if not stderr:
                        # du命令输出格式：size path
                        size_kb = int(stdout.decode("utf-8").split()[0])
                        disk_usage = size_kb / (1024 * 1024)  # 转换为GB
                else:  # Windows系统
                    total_size = 0
                    for dirpath, dirnames, filenames in os.walk(env_info["path"]):
                        for f in filenames:
                            try:
                                fp = os.path.join(dirpath, f)
                                total_size += os.path.getsize(fp)
                            except (FileNotFoundError, PermissionError):
                                pass
                    disk_usage = total_size / (1024 * 1024 * 1024)  # 转换为GB
        except Exception as e:
            print(f"Error calculating disk usage: {str(e)}")
            # 如果无法计算准确的磁盘使用量，使用基于包数量的估算
            disk_usage = len(packages) * 0.005 if packages else 0.0  # GB，简单估算

        # 如果没有记录最后使用时间，或无法解析时间，设置一个默认值
        if last_used is None:
            last_used_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        else:
            last_used_str = last_used.strftime("%Y-%m-%d %H:%M:%S")

        # 构建环境详情，确保usage_stats和packages永远不为空
        env_details = {
            "name": env_name,
            "python_version": python_version,
            "created_at": env_info.get("created_at",
                                       datetime.now().strftime("%Y-%m-%d")),
            "usage_stats": {
                "total_tasks": total_tasks,
                "success_rate": round(success_rate),
                "avg_execution_time": round(avg_execution_time, 1),
                "disk_usage": round(disk_usage, 2),
                "last_used": last_used_str,
                "active_tasks": active_tasks,
                "failed_tasks": failed_tasks
            },
            "packages": packages  # 这里packages即使为空也会是一个空数组[]，而不是None
        }

        return {"success": True, "output": env_details}
