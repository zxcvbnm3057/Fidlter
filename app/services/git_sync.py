from git import Repo
import os
import re
import tempfile
import shutil
import logging
from datetime import datetime
from configparser import ConfigParser


class GitSync:
    """负责Git仓库同步与任务创建"""

    def __init__(self, base_dir=None):
        """
        初始化Git同步管理器
        
        参数:
            base_dir: 仓库存储基础目录，如不提供则使用系统临时目录
        """
        self.base_dir = base_dir or os.path.join(tempfile.gettempdir(), 'conda_task_manager', 'repos')
        os.makedirs(self.base_dir, exist_ok=True)
        self.logger = logging.getLogger("GitSync")

    def _get_repo_dir(self, repo_url, task_id=None):
        """
        获取本地仓库目录路径
        
        参数:
            repo_url: 仓库URL
            task_id: 任务ID，用于创建唯一目录
            
        返回:
            仓库本地目录路径
        """
        # 从URL提取仓库名称
        repo_name = repo_url.split('/')[-1]
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]

        # 创建唯一目录名称
        if task_id:
            dir_name = f"{repo_name}_{task_id}"
        else:
            dir_name = f"{repo_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return os.path.join(self.base_dir, dir_name)

    def clone_repo(self, repo_url, branch='main', task_id=None):
        """
        克隆Git仓库到本地目录
        
        参数:
            repo_url: 仓库URL
            branch: 分支名称，默认为main
            task_id: 关联的任务ID
            
        返回:
            成功返回仓库本地路径，失败返回错误信息
        """
        try:
            repo_dir = self._get_repo_dir(repo_url, task_id)

            # 如果目录已存在，先删除
            if os.path.exists(repo_dir):
                shutil.rmtree(repo_dir)

            # 克隆仓库
            self.logger.info(f"Cloning repository {repo_url} to {repo_dir}")
            Repo.clone_from(repo_url, repo_dir, branch=branch)

            return {"success": True, "repo_dir": repo_dir, "message": f"Repository cloned successfully to {repo_dir}"}
        except Exception as e:
            self.logger.error(f"Failed to clone repository: {str(e)}")
            return {"success": False, "error": str(e), "message": "Failed to clone repository"}

    def pull_repo(self, repo_dir, branch='main'):
        """
        拉取仓库最新变更
        
        参数:
            repo_dir: 仓库本地目录
            branch: 分支名称，默认为main
            
        返回:
            拉取结果
        """
        try:
            repo = Repo(repo_dir)
            origin = repo.remote(name='origin')
            fetch_info = origin.pull(branch)

            # 获取变更文件
            changed_files = []
            for item in repo.index.diff(None):
                changed_files.append(item.a_path)

            # 获取新文件
            untracked_files = repo.untracked_files

            return {
                "success": True,
                "message": "Repository updated successfully",
                "changed_files": changed_files,
                "new_files": untracked_files
            }
        except Exception as e:
            self.logger.error(f"Failed to pull repository: {str(e)}")
            return {"success": False, "error": str(e), "message": "Failed to pull repository"}

    def read_repo_config(self, repo_dir):
        """
        读取仓库中的配置文件
        - requirements.txt: 环境依赖
        - filter.conf: 任务配置（环境名称、cron表达式等）
        
        参数:
            repo_dir: 仓库本地目录
            
        返回:
            配置信息
        """
        config = {"success": True, "requirements": None, "filter_config": None, "main_script": None}

        # 读取requirements.txt
        req_path = os.path.join(repo_dir, 'requirements.txt')
        if os.path.exists(req_path):
            with open(req_path, 'r') as f:
                config["requirements"] = f.read()

        # 读取filter.conf
        filter_path = os.path.join(repo_dir, 'filter.conf')
        if os.path.exists(filter_path):
            filter_config = ConfigParser()
            filter_config.read(filter_path)

            config["filter_config"] = {}

            # 读取task部分
            if filter_config.has_section('task'):
                for key, value in filter_config.items('task'):
                    config["filter_config"][key] = value

        # 查找主脚本
        # 优先查找在filter.conf中指定的脚本
        if config["filter_config"] and "script" in config["filter_config"]:
            script_path = os.path.join(repo_dir, config["filter_config"]["script"])
            if os.path.exists(script_path):
                config["main_script"] = script_path

        # 如果未指定或指定的脚本不存在，查找main.py或app.py
        if not config["main_script"]:
            for script_name in ['main.py', 'app.py', 'run.py']:
                script_path = os.path.join(repo_dir, script_name)
                if os.path.exists(script_path):
                    config["main_script"] = script_path
                    break

        # 如果还找不到，查找任何.py文件
        if not config["main_script"]:
            py_files = [
                f for f in os.listdir(repo_dir) if f.endswith('.py') and os.path.isfile(os.path.join(repo_dir, f))
            ]
            if py_files:
                config["main_script"] = os.path.join(repo_dir, py_files[0])

        # 检查是否找到了必要的配置
        if not config["main_script"]:
            config["success"] = False
            config["message"] = "No Python script found in repository"
            config["error"] = "Repository must contain at least one Python script"

        return config

    def get_repo_status(self, repo_dir):
        """
        获取仓库状态信息
        
        参数:
            repo_dir: 仓库本地目录
            
        返回:
            仓库状态信息
        """
        try:
            repo = Repo(repo_dir)
            origin = repo.remote(name='origin')

            # 获取远程分支信息
            for remote in repo.remotes:
                remote.fetch()

            # 获取本地和远程分支差异
            active_branch = repo.active_branch
            tracking_branch = active_branch.tracking_branch()

            if tracking_branch:
                ahead_count = sum(1 for c in repo.iter_commits(f'{tracking_branch}..{active_branch}'))
                behind_count = sum(1 for c in repo.iter_commits(f'{active_branch}..{tracking_branch}'))
            else:
                ahead_count = 0
                behind_count = 0

            # 检查本地是否有未提交的变更
            has_changes = repo.is_dirty()

            # 获取最后一次提交时间
            if repo.head.is_valid():
                last_commit_time = datetime.fromtimestamp(repo.head.commit.committed_date)
                last_commit_time_str = last_commit_time.strftime('%Y-%m-%d %H:%M:%S')
            else:
                last_commit_time_str = None

            return {
                "success": True,
                "local_changes": has_changes,
                "ahead_commits": ahead_count,
                "behind_commits": behind_count,
                "last_commit": last_commit_time_str,
                "active_branch": active_branch.name
            }
        except Exception as e:
            self.logger.error(f"Failed to get repository status: {str(e)}")
            return {"success": False, "error": str(e), "message": "Failed to get repository status"}

    def commit_changes(self, repo_dir, message):
        """提交仓库变更"""
        try:
            repo = Repo(repo_dir)
            repo.git.add(A=True)
            repo.index.commit(message)
            return {"success": True, "message": "Changes committed successfully"}
        except Exception as e:
            return {"success": False, "error": str(e), "message": "Failed to commit changes"}

    def push_changes(self, repo_dir, branch='main'):
        """推送仓库变更到远程"""
        try:
            repo = Repo(repo_dir)
            origin = repo.remote(name='origin')
            origin.push(branch)
            return {"success": True, "message": "Changes pushed successfully"}
        except Exception as e:
            return {"success": False, "error": str(e), "message": "Failed to push changes"}
