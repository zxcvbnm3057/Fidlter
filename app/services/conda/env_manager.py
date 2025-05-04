from subprocess import Popen, PIPE
import json
import os
import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

from ...utils.persistence import DataPersistence


class EnvironmentManager:
    """负责Conda环境的配置管理和跟踪"""

    def __init__(self, task_scheduler=None):
        self.conda_command = "conda"
        self.task_scheduler = task_scheduler
        self.logger = logging.getLogger("EnvironmentManager")
        self.persistence = DataPersistence()

        # 环境元数据缓存
        self.env_metadata = {}

        # 加载环境配置元数据
        self._load_env_metadata()

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

    def create_environment(self, env_name, python_version=None, packages=None):
        """创建新的Conda环境
        
        参数:
            env_name: 环境名称
            python_version: Python版本，如"3.8"、"3.10"等（可选）
            packages: 要安装的包列表（可选）
            
        返回:
            包含操作结果的字典
        """
        # 检查环境名是否已存在
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            if any(name == env_name for name in env_names):
                return {
                    "success": False,
                    "error": f"Environment '{env_name}' already exists",
                    "message": "Environment with this name already exists"
                }

        # 创建环境
        command = [self.conda_command, "create", "--name", env_name, "--yes"]

        # 如果指定了Python版本，添加到命令中
        if python_version:
            command.append(f"python={python_version}")

        # 如果指定了其他包，添加到命令中
        if packages and isinstance(packages, list):
            command.extend(packages)

        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        # 处理命令执行结果
        if process.returncode != 0 or (stderr and (b"error" in stderr.lower())):
            error_text = stderr.decode("utf-8") if stderr else "Unknown error"

            # 检查常见错误
            if "PackagesNotFoundError" in error_text:
                # 提取未找到的包名
                import re
                not_found_packages = re.findall(r"- ([^\s]+)", error_text)
                return {
                    "success": False,
                    "error": error_text,
                    "message": "Failed to create environment: packages not found",
                    "not_found_packages": not_found_packages
                }
            elif python_version and f"PackagesNotFoundError: The following packages are not available from current channels:\n  - python={python_version}" in error_text:
                return {
                    "success": False,
                    "error": error_text,
                    "message": f"Python version {python_version} not available",
                    "not_found_packages": [f"python={python_version}"]
                }

            return {"success": False, "error": error_text, "message": "Failed to create environment"}

        # 创建成功，保存环境元数据
        # 获取包列表
        actual_packages = self._get_env_packages(env_name)

        # 获取实际的Python版本
        actual_python_version = self._get_env_python_version(env_name)

        # 创建环境元数据
        env_data = {
            "name": env_name,
            "python_version": actual_python_version or python_version or "未知",
            "created_at": self._get_current_timestamp(),
            "updated_at": self._get_current_timestamp(),
            "packages": actual_packages
        }

        # 保存环境元数据
        self._save_env_metadata(env_name, env_data)

        return {
            "success": True,
            "message": f"Environment '{env_name}' created successfully",
            "env": {
                "name": env_name,
                "python_version": env_data["python_version"],
                "created_at": env_data["created_at"],
                "package_count": len(actual_packages)
            }
        }

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

        # 删除环境元数据
        self._remove_env_metadata(env_name)

        return {"success": True, "message": f"Environment '{env_name}' deleted successfully"}

    def list_environments(self):
        """列出所有Conda环境，排除base环境，并同步环境元数据"""
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

        # 获取环境名称列表
        env_names = [os.path.basename(env) for env in filtered_envs]

        # 同步环境元数据
        self._sync_env_metadata(env_names)

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
        # 被任务引用的环境可以安全地重命名，因为我们会更新引用，但在返回结果中标记此情况

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

        # 更新环境元数据
        if old_name in self.env_metadata:
            env_data = self.env_metadata[old_name]
            env_data["name"] = new_name
            self._save_env_metadata(new_name, env_data)
            self._remove_env_metadata(old_name)

        return {
            "success": True,
            "message": "Environment renamed successfully",
            "old_name": old_name,
            "new_name": new_name,
            "updated_tasks_count": updated_tasks_count
        }

    def install_packages(self, env_name, packages):
        """在环境中安装包
        
        Args:
            env_name: 环境名称
            packages: 要安装的包列表
            
        Returns:
            Dict[str, Any]: 包含操作结果的字典
        """
        if not packages:
            return {
                "success": False,
                "error": "Package list is empty",
                "message": "No packages specified for installation"
            }

        # 检查环境是否存在
        env_exists = False
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            env_exists = any(name == env_name for name in env_names)

        if not env_exists:
            return {
                "success": False,
                "error": f"Environment '{env_name}' not found",
                "message": "Environment not found"
            }

        # 执行安装命令
        command = [self.conda_command, "install", "--name", env_name, "--yes"]
        command.extend(packages)

        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        # 检查命令执行结果
        if process.returncode != 0 or (stderr and (b"error" in stderr.lower())):
            # 尝试提取安装失败的包
            failed_packages = []
            if "PackagesNotFoundError" in stderr.decode("utf-8"):
                import re
                failed_packages = re.findall(r"- ([^\s]+)", stderr.decode("utf-8"))

            return {
                "success": False,
                "error": stderr.decode("utf-8") if stderr else f"Failed to install packages in '{env_name}'",
                "message": "Failed to install packages",
                "failed_packages": failed_packages
            }

        # 安装成功，更新环境元数据
        if env_name in self.env_metadata:
            # 获取当前环境元数据
            env_data = self.env_metadata[env_name]

            # 获取最新的包列表
            updated_packages = self._get_env_packages(env_name)

            # 更新环境元数据
            env_data["packages"] = updated_packages
            env_data["updated_at"] = self._get_current_timestamp()

            # 保存更新后的环境元数据
            self._save_env_metadata(env_name, env_data)

            # 提取已安装的包信息
            installed_packages = []
            for package in packages:
                # 查找包的实际安装版本
                for pkg_info in updated_packages:
                    if pkg_info["name"] == package.split("=")[0].split("<")[0].split(">")[0]:
                        installed_packages.append(f"{pkg_info['name']}-{pkg_info['version']}")
                        break

            return {
                "success": True,
                "message": "Packages installed successfully",
                "installed_packages": installed_packages,
                "failed_packages": []
            }
        else:
            # 环境元数据不存在，可能是因为首次安装包时环境还未加载到元数据中
            # 强制刷新环境列表以更新元数据
            self.list_environments()

            return {
                "success": True,
                "message": "Packages installed successfully, environment metadata updated",
                "installed_packages": packages,
                "failed_packages": []
            }

    def remove_packages(self, env_name, packages):
        """从环境中移除包
        
        Args:
            env_name: 环境名称
            packages: 要移除的包列表
            
        Returns:
            Dict[str, Any]: 包含操作结果的字典
        """
        if not packages:
            return {"success": False, "error": "Package list is empty", "message": "No packages specified for removal"}

        # 检查环境是否存在
        env_exists = False
        env_list_result = self.list_environments()
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            env_exists = any(name == env_name for name in env_names)

        if not env_exists:
            return {
                "success": False,
                "error": f"Environment '{env_name}' not found",
                "message": "Environment not found"
            }

        # 执行移除命令
        command = [self.conda_command, "remove", "--name", env_name, "--yes"]
        command.extend(packages)

        process = Popen(command, stdout=PIPE, stderr=PIPE)
        stdout, stderr = process.communicate()

        # 检查命令执行结果
        if process.returncode != 0 or (stderr and (b"error" in stderr.lower())):
            # 尝试提取移除失败的包
            failed_packages = []
            if "PackageNotFoundError" in stderr.decode("utf-8"):
                import re
                failed_packages = re.findall(r"- ([^\s]+)", stderr.decode("utf-8"))

            return {
                "success": False,
                "error": stderr.decode("utf-8") if stderr else f"Failed to remove packages from '{env_name}'",
                "message": "Failed to remove packages",
                "failed_packages": failed_packages
            }

        # 移除成功，更新环境元数据
        if env_name in self.env_metadata:
            # 获取当前环境元数据
            env_data = self.env_metadata[env_name]

            # 获取最新的包列表
            updated_packages = self._get_env_packages(env_name)

            # 更新环境元数据
            env_data["packages"] = updated_packages
            env_data["updated_at"] = self._get_current_timestamp()

            # 保存更新后的环境元数据
            self._save_env_metadata(env_name, env_data)

            return {
                "success": True,
                "message": "Packages removed successfully",
                "removed_packages": packages,
                "failed_packages": []
            }
        else:
            # 环境元数据不存在，可能是因为卸载包时环境还未加载到元数据中
            # 强制刷新环境列表以更新元数据
            self.list_environments()

            return {
                "success": True,
                "message": "Packages removed successfully, environment metadata updated",
                "removed_packages": packages,
                "failed_packages": []
            }

    def _handle_process_output(self, stdout, stderr):
        """处理conda命令的输出，转换为统一格式"""
        if stderr:
            return {"success": False, "error": stderr.decode("utf-8")}
        try:
            return {"success": True, "output": json.loads(stdout.decode("utf-8"))}
        except json.JSONDecodeError:
            # 如果不是JSON格式，则直接返回原始输出
            return {"success": True, "output": stdout.decode("utf-8")}

    def _load_env_metadata(self):
        """从持久化存储加载环境配置元数据"""
        try:
            env_info_dict = self.persistence.load_all_env_info()
            if env_info_dict:
                self.env_metadata = env_info_dict
                self.logger.info(f"从持久化存储加载了 {len(env_info_dict)} 个环境的配置元数据")
        except Exception as e:
            self.logger.error(f"从持久化存储加载环境配置元数据失败: {str(e)}")

    def _save_env_metadata(self, env_name: str, env_data: Dict[str, Any]) -> bool:
        """保存环境配置元数据到持久化存储
        
        Args:
            env_name: 环境名称
            env_data: 环境配置数据
            
        Returns:
            bool: 操作是否成功
        """
        try:
            # 更新内存缓存
            self.env_metadata[env_name] = env_data

            # 保存到持久化存储
            result = self.persistence.save_env_info(env_name, env_data)
            if result:
                self.logger.debug(f"环境 {env_name} 的配置元数据保存成功")
            else:
                self.logger.warning(f"环境 {env_name} 的配置元数据保存失败")
            return result
        except Exception as e:
            self.logger.error(f"保存环境 {env_name} 的配置元数据时出错: {str(e)}")
            return False

    def _remove_env_metadata(self, env_name: str) -> bool:
        """从持久化存储中删除环境配置元数据
        
        Args:
            env_name: 环境名称
            
        Returns:
            bool: 操作是否成功
        """
        try:
            # 从内存缓存中删除
            if env_name in self.env_metadata:
                del self.env_metadata[env_name]

            # 从文件系统中删除
            file_path = os.path.join(self.persistence.DATA_DIR, self.persistence.ENV_INFO_DIR, f"{env_name}.json")
            if os.path.exists(file_path):
                os.remove(file_path)
                self.logger.debug(f"环境 {env_name} 的配置元数据已从持久化存储中删除")
                return True
            return False
        except Exception as e:
            self.logger.error(f"删除环境 {env_name} 的配置元数据时出错: {str(e)}")
            return False

    def _sync_env_metadata(self, env_names):
        """同步环境元数据，确保系统记录的环境与实际环境一致
        
        Args:
            env_names: 环境名称列表
        """
        # 检查缓存中是否有不存在的环境，并移除
        for env_name in list(self.env_metadata.keys()):
            if env_name not in env_names:
                self._remove_env_metadata(env_name)
                self.logger.info(f"移除不存在的环境配置元数据: {env_name}")

        # 检查新发现的环境
        for env_name in env_names:
            if env_name not in self.env_metadata:
                # 对于新发现的环境，获取Python版本信息和包列表
                python_version = self._get_env_python_version(env_name)
                packages = self._get_env_packages(env_name)

                # 创建基本的环境元数据
                env_data = {
                    "name": env_name,
                    "python_version": python_version or "未知",
                    "created_at": self._get_current_timestamp(),
                    "updated_at": self._get_current_timestamp(),
                    "packages": packages
                }

                # 保存环境元数据
                self._save_env_metadata(env_name, env_data)
                self.logger.info(f"添加新环境的配置元数据: {env_name}")

    def _get_env_python_version(self, env_name):
        """获取环境的Python版本
        
        Args:
            env_name: 环境名称
            
        Returns:
            str: Python版本或None
        """
        try:
            # 使用conda list命令获取环境中的Python版本
            command = [self.conda_command, "list", "--name", env_name, "python", "--json"]
            process = Popen(command, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()

            if process.returncode != 0 or stderr:
                return None

            # 解析JSON输出
            package_list = json.loads(stdout.decode("utf-8"))

            # 查找Python包
            for package in package_list:
                if package.get("name") == "python":
                    version = package.get("version")
                    # 提取主要版本号（如3.9.7 -> 3.9）
                    version_parts = version.split(".")
                    if len(version_parts) >= 2:
                        return ".".join(version_parts[:2])
                    return version

            return None
        except Exception as e:
            self.logger.error(f"获取环境 {env_name} 的Python版本时出错: {str(e)}")
            return None

    def _get_env_packages(self, env_name):
        """获取环境中的包列表
        
        Args:
            env_name: 环境名称
            
        Returns:
            List[Dict[str, str]]: 包列表
        """
        try:
            # 使用conda list命令获取环境中的包列表
            command = [self.conda_command, "list", "--name", env_name, "--json"]
            process = Popen(command, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()

            if process.returncode != 0 or stderr:
                return []

            # 解析JSON输出
            package_list = json.loads(stdout.decode("utf-8"))

            # 格式化包列表
            formatted_packages = []
            for package in package_list:
                formatted_packages.append({"name": package.get("name"), "version": package.get("version")})

            return formatted_packages
        except Exception as e:
            self.logger.error(f"获取环境 {env_name} 的包列表时出错: {str(e)}")
            return []

    def _get_current_timestamp(self):
        """获取当前时间戳"""
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
