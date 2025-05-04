import os
import logging
from datetime import datetime
import tempfile
from .git_sync import GitSync


class GitTaskManager:
    """负责从Git仓库创建和更新任务"""

    def __init__(self, task_scheduler, conda_manager=None):
        """
        初始化Git任务管理器
        
        参数:
            task_scheduler: 任务调度器实例
            conda_manager: conda环境管理器实例
        """
        self.task_scheduler = task_scheduler
        self.conda_manager = conda_manager
        self.git_sync = GitSync()
        self.logger = logging.getLogger("GitTaskManager")

        # 存储任务ID与仓库目录的映射
        self.task_repo_dirs = {}

    def create_task_from_git(self,
                             repo_url,
                             branch='main',
                             task_name=None,
                             command=None,
                             env_option=None,
                             env_name=None):
        """
        从Git仓库创建任务
        
        参数:
            repo_url: Git仓库URL
            branch: 分支名称，默认为main
            task_name: 任务名称，如不提供则使用仓库名称
            command: 必填，启动命令，系统将不会自动检测主脚本文件
            env_option: 环境选项，可选值为'create'或'existing'
            env_name: 环境名称，当env_option为'create'时指定要创建或更新的环境名称；
                     当env_option为'existing'时指定要使用的现有环境名称
            
        返回:
            创建结果，包含任务信息或错误详情
        """
        # 验证必填参数
        if not command:
            return {
                "success": False,
                "message": "Command is required",
                "error": "The command parameter is required for creating a task from Git"
            }

        if not env_option or env_option not in ['create', 'existing']:
            return {
                "success": False,
                "message": "Invalid environment option",
                "error": "Environment option must be 'create' or 'existing'"
            }

        if not env_name:
            return {
                "success": False,
                "message": "Environment name is required",
                "error": "Please provide an environment name"
            }

        # 克隆仓库
        clone_result = self.git_sync.clone_repo(repo_url, branch)
        if not clone_result.get("success", False):
            return clone_result

        repo_dir = clone_result["repo_dir"]

        # 读取仓库配置
        config = self.git_sync.read_repo_config(repo_dir)
        if not config.get("success", False):
            return config

        # 确定任务名称
        if not task_name:
            # 如果提供了filter.conf且有name配置，使用配置中的名称
            if config["filter_config"] and "name" in config["filter_config"]:
                task_name = config["filter_config"]["name"]
            else:
                # 否则使用仓库名称
                repo_name = repo_url.split('/')[-1]
                if repo_name.endswith('.git'):
                    repo_name = repo_name[:-4]
                task_name = f"git_{repo_name}"

        # 确定cron表达式
        cron_expression = None
        if config["filter_config"] and "cron" in config["filter_config"]:
            cron_expression = config["filter_config"]["cron"]

        # 查找脚本路径，用于任务创建（不再用于自动检测启动命令）
        script_path = config["main_script"]

        # 环境处理
        env_result = None
        conda_env = env_name  # 使用用户指定的环境名称

        # 根据环境选项处理环境
        if env_option == 'create' and config["requirements"] and self.conda_manager:
            # 检查环境是否已存在
            envs = self.conda_manager.list_environments()
            env_exists = any(env.get('name') == conda_env for env in envs.get('environments', []))

            if env_exists:
                # 使用现有环境并更新packages
                env_result = self.conda_manager.install_packages(env_name=conda_env,
                                                                 packages_str=config["requirements"],
                                                                 from_file=True)
                if env_result.get("success", False):
                    env_result[
                        "message"] = f"Environment '{conda_env}' already exists and has been updated with new requirements"
                    env_result["warning"] = True
            else:
                # 创建新环境
                env_result = self.conda_manager.create_environment(env_name=conda_env,
                                                                   python_version="3.9",
                                                                   packages_str=config["requirements"])
                if env_result.get("success", False):
                    env_result["message"] = f"New environment '{conda_env}' created with requirements"
        elif env_option == 'existing':
            # 验证环境是否存在
            envs = self.conda_manager.list_environments()
            env_exists = any(env.get('name') == conda_env for env in envs.get('environments', []))

            if not env_exists:
                return {
                    "success": False,
                    "message": f"Environment '{conda_env}' does not exist",
                    "error":
                    "The specified environment does not exist. Please create it first or choose 'create' option."
                }

        if env_result and not env_result.get("success", False):
            return env_result

        # 创建任务
        task_result = self.task_scheduler.schedule_task(script_path=script_path,
                                                        conda_env=conda_env,
                                                        task_name=task_name,
                                                        cron_expression=cron_expression,
                                                        priority="normal",
                                                        command=command)  # 使用用户指定的启动命令

        if not task_result.get("success", False):
            return task_result

        # 获取任务ID，并保存与仓库的关联
        task_id = task_result["task"]["task_id"]

        # 更新任务以包含Git仓库信息
        self.task_scheduler.update_task(task_id=task_id,
                                        updates={
                                            "repo_url": repo_url,
                                            "repo_branch": branch,
                                            "repo_dir": repo_dir,
                                            "is_git_task": True,
                                            "last_synced": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                        })

        # 保存任务与仓库目录的映射
        self.task_repo_dirs[task_id] = repo_dir

        # 构建结果
        result = {
            "success": True,
            "message": "Task created from Git repository successfully",
            "task": task_result["task"],
            "repo_dir": repo_dir
        }

        # 添加环境操作的结果
        if env_result:
            if env_result.get("success", False):
                if env_result.get("warning", False):
                    result["environment_warning"] = env_result.get("message")
                else:
                    result["environment_message"] = env_result.get("message")
            else:
                result["environment_warning"] = env_result.get("message", "Warning: Environment operation had issues")

        return result

    def update_task_from_git(self, task_id, update_env=True):
        """
        从Git仓库更新任务
        
        参数:
            task_id: 任务ID
            update_env: 是否更新环境
            
        返回:
            更新结果
        """
        # 获取任务信息
        task_info = self.task_scheduler.get_task_status(task_id)
        if not task_info.get("success", False):
            return task_info

        task = task_info["task"]

        # 检查是否是Git任务
        if not task.get("is_git_task", False):
            return {
                "success": False,
                "message": "Not a Git repository task",
                "error": "This task was not created from a Git repository"
            }

        # 获取仓库信息
        repo_url = task.get("repo_url")
        repo_branch = task.get("repo_branch", "main")
        repo_dir = task.get("repo_dir")

        # 如果仓库目录不存在，则重新克隆
        if not repo_dir or not os.path.exists(repo_dir):
            clone_result = self.git_sync.clone_repo(repo_url, repo_branch, task_id)
            if not clone_result.get("success", False):
                return clone_result

            repo_dir = clone_result["repo_dir"]

            # 更新任务中的仓库目录
            self.task_scheduler.update_task(task_id=task_id, updates={"repo_dir": repo_dir})
        else:
            # 拉取仓库最新变更
            pull_result = self.git_sync.pull_repo(repo_dir, repo_branch)
            if not pull_result.get("success", False):
                return pull_result

        # 读取更新后的仓库配置
        config = self.git_sync.read_repo_config(repo_dir)
        if not config.get("success", False):
            return config

        # 检查是否需要更新环境
        env_result = None
        if update_env and config["requirements"] and self.conda_manager:
            conda_env = task.get("conda_env")

            # 更新环境中的packages
            env_result = self.conda_manager.install_packages(env_name=conda_env,
                                                             packages_str=config["requirements"],
                                                             from_file=True)

            if not env_result.get("success", False):
                return env_result

        # 检查是否需要更新任务配置
        updates = {"last_synced": datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

        # 更新脚本路径
        if config["main_script"] and config["main_script"] != task.get("script_path"):
            updates["script_path"] = config["main_script"]

        # 更新cron表达式（如果在filter.conf中指定了新的）
        if config["filter_config"] and "cron" in config["filter_config"]:
            new_cron = config["filter_config"]["cron"]
            if new_cron != task.get("cron_expression"):
                updates["cron_expression"] = new_cron

        # 应用更新
        if updates:
            self.task_scheduler.update_task(task_id=task_id, updates=updates)

        # 重新获取任务信息
        updated_task = self.task_scheduler.get_task_status(task_id)["task"]

        # 构建结果
        result = {
            "success": True,
            "message": "Task updated from Git repository successfully",
            "task": updated_task,
            "new_files": pull_result.get("new_files", []) if "pull_result" in locals() else [],
            "changed_files": pull_result.get("changed_files", []) if "pull_result" in locals() else []
        }

        # 添加环境操作的结果
        if env_result:
            if env_result.get("success", False):
                result["environment_message"] = env_result.get("message", "Environment updated successfully")
            else:
                result["environment_warning"] = env_result.get("message", "Warning: Environment operation had issues")

        return result

    def get_git_task_status(self, task_id):
        """
        获取Git任务的状态，包括仓库状态
        
        参数:
            task_id: 任务ID
            
        返回:
            任务Git同步状态
        """
        # 获取任务信息
        task_info = self.task_scheduler.get_task_status(task_id)
        if not task_info.get("success", False):
            return task_info

        task = task_info["task"]

        # 检查是否是Git任务
        if not task.get("is_git_task", False):
            return {
                "success": False,
                "message": "Not a Git repository task",
                "error": "This task was not created from a Git repository"
            }

        # 获取仓库目录
        repo_dir = task.get("repo_dir")

        # 如果仓库目录不存在，则返回错误
        if not repo_dir or not os.path.exists(repo_dir):
            return {
                "success": False,
                "message": "Repository directory not found",
                "error": f"Repository directory {repo_dir} does not exist"
            }

        # 获取仓库状态
        repo_status = self.git_sync.get_repo_status(repo_dir)
        if not repo_status.get("success", False):
            return repo_status

        # 构建结果
        result = {
            "success": True,
            "task": {
                "task_id": task.get("task_id"),
                "task_name": task.get("task_name"),
                "repo_url": task.get("repo_url"),
                "branch": task.get("repo_branch", "main"),
                "last_synced": task.get("last_synced"),
                "local_changes": repo_status.get("local_changes", False),
                "ahead_commits": repo_status.get("ahead_commits", 0),
                "behind_commits": repo_status.get("behind_commits", 0),
                "last_commit": repo_status.get("last_commit")
            }
        }

        return result
