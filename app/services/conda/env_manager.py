from subprocess import Popen, PIPE
import json
import os
import logging


class EnvironmentManager:
    """负责Conda环境的基础管理：创建、删除、列表、重命名等"""

    def __init__(self, task_scheduler=None):
        self.conda_command = "conda"
        self.task_scheduler = task_scheduler
        self.logger = logging.getLogger("EnvironmentManager")

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
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
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

        return {
            "success": True,
            "message": "Environment renamed successfully",
            "old_name": old_name,
            "new_name": new_name,
            "updated_tasks_count": updated_tasks_count
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
