from subprocess import Popen, PIPE
import json
import os
import logging
from datetime import datetime, timedelta


class StatsManager:
    """负责Conda环境统计信息和详情的获取"""

    def __init__(self, task_scheduler=None):
        self.conda_command = "conda"
        self.task_scheduler = task_scheduler
        self.logger = logging.getLogger("StatsManager")

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

        # 计算每个环境的使用情况
        env_usage, package_stats, total_disk_usage, latest_created = self._calculate_environment_usage(envs)

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
        """计算环境使用情况和包统计"""
        env_usage = []
        package_stats = []
        total_disk_usage = 0
        latest_created = None
        latest_time = None

        for idx, env_path in enumerate(envs):
            env_name = os.path.basename(env_path)

            # 计算使用率、包数量和创建时间
            usage_percent, package_count = self._get_env_usage_and_packages(env_name)

            # 估算磁盘使用量
            disk_usage = package_count * 0.005  # GB
            total_disk_usage += disk_usage

            # 获取环境创建时间（实际应从环境元数据获取）
            created_time = self._get_env_creation_time(env_path, idx)
            created_at = created_time.strftime("%Y-%m-%d %H:%M:%S")

            # 记录最新创建的环境
            if latest_time is None or created_time > latest_time:
                latest_time = created_time
                latest_created = {"name": env_name, "created_at": created_at}

            # 添加到使用情况和包统计列表
            env_usage.append({"name": env_name, "usage_percent": round(usage_percent)})
            package_stats.append({"name": env_name, "package_count": package_count})

        return env_usage, package_stats, total_disk_usage, latest_created

    def _get_env_usage_and_packages(self, env_name):
        """获取环境使用率和包数量"""
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
        package_count = 0
        try:
            command = [self.conda_command, "list", "--name", env_name, "--json"]
            process = Popen(command, stdout=PIPE, stderr=PIPE)
            stdout, stderr = process.communicate()
            if not stderr:
                packages_info = json.loads(stdout.decode("utf-8"))
                package_count = len(packages_info)
        except Exception:
            self.logger.exception(f"Error getting package count for environment {env_name}")

        return usage_percent, package_count

    def _get_env_creation_time(self, env_path, idx):
        """获取环境创建时间"""
        try:
            return datetime.fromtimestamp(os.path.getctime(env_path))
        except Exception:
            # 如果无法获取创建时间，使用当前时间减去索引值作为模拟
            return datetime.now() - timedelta(days=idx)

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
        """计算环境的磁盘使用量"""
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
            # 获取环境的包数量，用于简单估算
            _, package_count = self._get_env_usage_and_packages(env_name)
            # 如果无法计算准确的磁盘使用量，使用基于包数量的估算
            disk_usage = package_count * 0.005  # GB，简单估算

        return disk_usage
