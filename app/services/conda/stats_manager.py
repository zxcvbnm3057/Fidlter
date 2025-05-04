import requests
import logging
import json
import os
from subprocess import Popen, PIPE
from datetime import datetime, timedelta


class StatsManager:
    """负责Conda环境统计信息和详情的获取"""

    def __init__(self, task_scheduler=None):
        self.conda_command = "conda"
        self.task_scheduler = task_scheduler
        self.logger = logging.getLogger("StatsManager")
        # 预定义Python版本列表（当无法获取时使用）
        self.fallback_python_versions = ["3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12"]

    def set_task_scheduler(self, task_scheduler):
        """设置任务调度器实例，用于获取环境统计信息"""
        self.task_scheduler = task_scheduler

    def list_environments(self):
        """列出所有Conda环境，辅助方法，避免循环导入"""
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

    def get_environment_stats(self):
        """获取Conda环境的统计信息"""
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
        active_envs = self._get_active_environments()

        # 计算每个环境的使用情况，但不再计算总磁盘和包统计
        env_usage, latest_created = self._calculate_environment_usage(envs)

        # 构建统计信息 - 不再包含total_disk_usage和package_stats
        stats = {
            "total_environments": len(envs),
            "active_environments": len(active_envs),
            "latest_created": latest_created,
            "environment_usage": env_usage
        }

        return {"success": True, "output": stats}

    def _get_active_environments(self):
        """获取活跃环境（被任务使用的环境）"""
        active_envs = []
        if self.task_scheduler:
            tasks = self.task_scheduler.tasks
            for task in tasks:
                env_name = task.get('conda_env')
                if env_name and env_name not in active_envs:
                    active_envs.append(env_name)
        return active_envs

    def _calculate_environment_usage(self, envs):
        """计算环境使用情况，返回任务计数而非使用率百分比"""
        env_usage = []
        latest_created = None
        latest_time = None

        for env_path in envs:
            env_name = os.path.basename(env_path)

            # 计算使用该环境的任务数量
            task_count = self._get_env_task_count(env_name)

            # 获取环境创建时间
            created_time = self._get_env_creation_time(env_path)
            created_at = created_time.strftime("%Y-%m-%d %H:%M:%S")

            # 记录最新创建的环境
            if latest_time is None or created_time > latest_time:
                latest_time = created_time
                latest_created = {"name": env_name, "created_at": created_at}

            # 添加到使用情况列表
            env_usage.append({"name": env_name, "task_count": task_count})

        return env_usage, latest_created

    def _get_env_task_count(self, env_name):
        """获取引用环境的任务数量"""
        task_count = 0
        if self.task_scheduler:
            for task in self.task_scheduler.tasks:
                if task.get('conda_env') == env_name:
                    task_count += 1
        return task_count

    def _get_env_creation_time(self, env_path):
        """获取环境创建时间，如果无法获取则返回当前时间并记录日志"""
        try:
            # 尝试从环境目录的创建时间获取
            return datetime.fromtimestamp(os.path.getctime(env_path))
        except Exception as e:
            self.logger.error(f"Error getting environment creation time: {str(e)}")

            # 尝试通过conda-meta目录中的历史文件获取创建时间
            try:
                meta_dir = os.path.join(env_path, "conda-meta")
                if os.path.exists(meta_dir):
                    # 查找最早的包安装记录作为环境创建时间估计
                    oldest_time = None
                    for file in os.listdir(meta_dir):
                        if file.endswith('.json'):
                            file_path = os.path.join(meta_dir, file)
                            file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                            if oldest_time is None or file_time < oldest_time:
                                oldest_time = file_time

                    if oldest_time:
                        return oldest_time
            except Exception as e2:
                self.logger.error(f"Error getting environment creation time from meta: {str(e2)}")

            # 如果无法获取，直接返回当前时间并记录无法确定
            self.logger.warning(f"Could not determine creation time for environment at {env_path}, using current time")
            return datetime.now()

    def get_environment_details(self, env_name):
        """获取特定环境的详细信息"""
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
        python_version, packages = self._get_env_python_and_packages(env_path)

        # 获取环境信息 - 包括创建时间和位置
        env_info = self._get_env_info(env_name)

        # 获取环境使用统计
        usage_stats = self._get_env_usage_stats(env_name)

        # 构建环境详情
        env_details = {
            "name": env_name,
            "python_version": python_version,
            "created_at": env_info.get("created_at",
                                       datetime.now().strftime("%Y-%m-%d")),
            "usage_stats": usage_stats,
            "packages": packages  # 这里packages即使为空也会是一个空数组[]，而不是None
        }

        return {"success": True, "output": env_details}

    def _get_env_python_and_packages(self, env_path):
        """获取环境的Python版本和包列表"""
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
                self.logger.error(f"Error getting package list: {error_msg}")
        except Exception as e:
            self.logger.error(f"Exception getting package information: {str(e)}")
            # 如果发生异常，确保返回空数组而不是None
            packages = []

        return python_version, packages

    def _get_env_info(self, env_name):
        """获取环境信息，包括创建时间和路径"""
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
            self.logger.error(f"Exception getting environment info: {str(e)}")

        return env_info

    def _get_env_usage_stats(self, env_name):
        """获取环境使用统计"""
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
        disk_usage = self._calculate_disk_usage(env_name)

        # 如果没有记录最后使用时间，或无法解析时间，设置一个默认值
        if last_used is None:
            last_used_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        else:
            last_used_str = last_used.strftime("%Y-%m-%d %H:%M:%S")

        # 返回使用统计
        return {
            "total_tasks": total_tasks,
            "success_rate": round(success_rate),
            "avg_execution_time": round(avg_execution_time, 1),
            "disk_usage": round(disk_usage, 2),
            "last_used": last_used_str,
            "active_tasks": active_tasks,
            "failed_tasks": failed_tasks
        }

    def _calculate_disk_usage(self, env_name):
        """计算环境的磁盘使用量，如果无法计算则返回0"""
        disk_usage = 0
        env_info = self._get_env_info(env_name)

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
            self.logger.error(f"Error calculating disk usage: {str(e)}")
            # 无法计算则返回0，不进行估算
            disk_usage = 0

        return disk_usage

    def get_formatted_environments(self, stream=False):
        """获取格式化的环境列表，支持流式响应
        
        Args:
            stream (bool): 是否为流式响应
            
        Returns:
            dict: 包含success和output字段的结果字典
        """
        # 获取环境列表
        env_list_result = self.list_environments()
        if not env_list_result.get("success", False):
            return {
                "success": False,
                "error": env_list_result.get("error", "未知错误"),
                "message": "Failed to list environments"
            }

        conda_envs = env_list_result.get("output", {})
        env_paths = conda_envs.get("envs", [])

        # 根据是否流式响应来处理
        if stream:
            # 创建生成器函数
            def generate_envs():
                # 对于没有环境的情况，生成器不产生任何内容
                # 这将导致流式响应不返回任何数据行，前端需要处理这种情况
                for env_path in env_paths:
                    env_name = os.path.basename(env_path)
                    # 获取环境基本信息
                    env_data = self._get_basic_env_data(env_name)
                    yield env_data

            return {"success": True, "output": generate_envs()}
        else:
            # 常规响应
            formatted_envs = []

            for env_path in env_paths:
                env_name = os.path.basename(env_path)
                # 获取环境基本信息
                env_data = self._get_basic_env_data(env_name)
                formatted_envs.append(env_data)

            # 没有环境时返回空数组
            return {"success": True, "output": formatted_envs}

    def _get_basic_env_data(self, env_name):
        """获取环境的基本信息（不包含耗时的磁盘空间和包数量计算）
        
        Args:
            env_name (str): 环境名称
            
        Returns:
            dict: 环境基本信息
        """
        # 获取环境信息 - 只获取基本信息，不计算磁盘使用量和包数量
        env_info = self._get_env_info(env_name)

        # 获取Python版本
        python_version = "未知"
        try:
            for path in self.list_environments().get("output", {}).get("envs", []):
                if os.path.basename(path) == env_name:
                    _, packages = self._get_env_python_and_packages(path)
                    for package in packages:
                        if package.get("name") == "python":
                            python_version = package.get("version")
                            break
                    break
        except Exception as e:
            self.logger.error(f"Error getting Python version for environment {env_name}: {str(e)}")

        return {
            "name": env_name,
            "python_version": python_version,
            "created_at": env_info.get("created_at",
                                       datetime.now().strftime("%Y-%m-%d")),
            "basic_info_only": True
        }

    def get_environment_extended_info(self, env_name):
        """获取环境的扩展信息（包括磁盘使用量和包数量）
        
        Args:
            env_name (str): 环境名称
            
        Returns:
            dict: 包含success和output字段的结果字典
        """
        # 检查环境是否存在
        env_exists = False
        env_path = None

        env_list_result = self.list_environments()
        if not env_list_result.get("success", False):
            return {
                "success": False,
                "error": "Failed to list environments",
                "message": "Unable to verify environment existence"
            }

        for path in env_list_result.get("output", {}).get("envs", []):
            if os.path.basename(path) == env_name:
                env_exists = True
                env_path = path
                break

        if not env_exists:
            return {
                "success": False,
                "error": f"Environment '{env_name}' not found",
                "message": "Environment not found"
            }

        # 计算磁盘使用量
        disk_usage = self._calculate_disk_usage(env_name)
        is_size_accurate = disk_usage is not None
        disk_usage = disk_usage if disk_usage is not None else 0

        # 计算包数量
        package_count = 0
        try:
            _, packages = self._get_env_python_and_packages(env_path)
            package_count = len(packages)
        except Exception as e:
            self.logger.error(f"Error counting packages for environment {env_name}: {str(e)}")

        return {
            "success": True,
            "output": {
                "name": env_name,
                "disk_usage": round(disk_usage, 2),
                "package_count": package_count,
                "is_size_accurate": is_size_accurate
            }
        }

    def get_available_python_versions(self):
        """从Conda官网获取可用的Python版本列表
        
        尝试从Conda包信息API获取可用的Python版本，
        如果失败则返回预定义的版本列表
        
        Returns:
            dict: 包含success和output字段的结果字典，
                  output中包含versions列表和source来源信息
        """
        try:
            # 尝试从Anaconda Cloud API获取Python包信息
            url = "https://api.anaconda.org/package/anaconda/python"
            response = requests.get(url, timeout=5)  # 5秒超时

            if response.status_code == 200:
                package_info = response.json()

                # 提取版本信息，通常格式为 x.y.z
                all_versions = package_info.get('versions', [])

                # 过滤并提取主要版本号 (x.y)
                major_versions = set()
                for version in all_versions:
                    # 分割版本号并提取前两部分
                    parts = version.split('.')
                    if len(parts) >= 2:
                        # 只保留 x.y 格式
                        major_version = f"{parts[0]}.{parts[1]}"
                        # 只保留3.x版本
                        if major_version.startswith('3.'):
                            major_versions.add(major_version)

                # 转换为列表并排序
                sorted_versions = sorted(list(major_versions), key=lambda v: [int(x) for x in v.split('.')])

                if sorted_versions:
                    return {"success": True, "output": {"versions": sorted_versions, "source": "conda"}}

            # 如果API请求失败或解析失败，使用fallback
            self.logger.warning("Failed to get Python versions from Anaconda API, using fallback list")
            return {
                "success": True,
                "output": {
                    "versions": self.fallback_python_versions,
                    "source": "fallback",
                    "message": "无法从Conda官网获取版本信息，使用预定义版本列表"
                }
            }

        except Exception as e:
            self.logger.error(f"Error fetching Python versions: {str(e)}")
            # 出现异常时返回预定义版本列表
            return {
                "success": True,
                "output": {
                    "versions": self.fallback_python_versions,
                    "source": "fallback",
                    "message": "无法从Conda官网获取版本信息，使用预定义版本列表"
                }
            }
