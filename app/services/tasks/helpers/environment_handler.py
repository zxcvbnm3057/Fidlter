import os
import shutil
import tempfile
import logging
from typing import Dict, Any, List, Optional


class EnvironmentHandler:
    """负责处理任务环境和requirements相关操作"""

    def __init__(self, conda_manager):
        """初始化环境处理器
        
        Args:
            conda_manager: Conda管理器实例
        """
        self.conda_manager = conda_manager
        self.logger = logging.getLogger("EnvironmentHandler")

    def handle_task_environment(self, conda_env: str, requirements: Optional[str], reuse_env: bool) -> Dict[str, Any]:
        """处理任务环境和requirements
        
        Args:
            conda_env: Conda环境名称
            requirements: requirements.txt内容（可选）
            reuse_env: 是否复用现有环境
            
        Returns:
            Dict[str, Any]: 处理结果，包含success字段和错误信息（如果有）
        """
        if not self.conda_manager:
            return {"success": False, "error": "Conda manager not available", "message": "Internal server error"}

        if not requirements:
            # 如果没有requirements，只需检查环境是否存在
            if reuse_env and not self._check_environment_exists(conda_env):
                return {
                    "success": False,
                    "error": f"Environment '{conda_env}' not found",
                    "message": "Cannot reuse non-existing environment"
                }
            return {"success": True}

        if reuse_env:
            # 检查环境是否存在
            env_exists = self._check_environment_exists(conda_env)
            if not env_exists:
                return {
                    "success": False,
                    "error": f"Environment '{conda_env}' not found",
                    "message": "Cannot reuse non-existing environment"
                }

            # 在现有环境中安装requirements
            return self._install_requirements_in_env(conda_env, requirements)
        else:
            # 为任务创建新环境
            # 如果环境已存在，添加后缀
            original_env_name = conda_env
            suffix = 1
            while True:
                if self._check_environment_exists(conda_env):
                    conda_env = f"{original_env_name}_{suffix}"
                    suffix += 1
                else:
                    break

            # 创建新环境并安装requirements
            return self._create_env_with_requirements(conda_env, requirements)

    def _check_environment_exists(self, env_name: str) -> bool:
        """检查环境是否存在
        
        Args:
            env_name: 环境名称
            
        Returns:
            bool: 环境是否存在
        """
        env_list_result = self.conda_manager.list_environments()
        if env_list_result.get("success", False):
            env_names = [os.path.basename(env) for env in env_list_result.get("output", {}).get("envs", [])]
            return any(name == env_name for name in env_names)
        return False

    def _install_requirements_in_env(self, env_name: str, requirements: str) -> Dict[str, Any]:
        """在现有环境中安装requirements
        
        Args:
            env_name: 环境名称
            requirements: requirements文本内容
            
        Returns:
            Dict[str, Any]: 安装结果
        """
        # 创建临时目录存放requirements文件
        temp_dir = tempfile.mkdtemp()
        req_file_path = os.path.join(temp_dir, "requirements.txt")

        try:
            # 解析requirements写入临时文件
            packages = self._parse_requirements(requirements, req_file_path)
            if not packages:
                return {
                    "success": False,
                    "error": "No valid packages found in requirements",
                    "message": "Requirements file is empty or contains only comments"
                }

            # 在环境中安装包
            result = self.conda_manager.install_packages(env_name, packages)

            if not result.get("success", False):
                # 安装失败，提供回滚建议
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error"),
                    "message": "Failed to install requirements in existing environment",
                    "failed_packages": result.get("failed_packages", []),
                    "error_details": result.get("error_details", []),
                    "environment_state": "Environment may be in an inconsistent state, consider restoring from backup"
                }

            return {
                "success": True,
                "message": "Requirements installed successfully",
                "environment": env_name,
                "installed_packages": packages
            }

        except Exception as e:
            self.logger.error(f"Error installing requirements: {str(e)}")
            return {"success": False, "error": str(e), "message": "Error during requirements installation"}
        finally:
            # 清理临时文件
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _create_env_with_requirements(self, env_name: str, requirements: str) -> Dict[str, Any]:
        """创建新环境并安装requirements
        
        Args:
            env_name: 环境名称
            requirements: requirements文本内容
            
        Returns:
            Dict[str, Any]: 创建结果
        """
        # 创建临时目录存放requirements文件
        temp_dir = tempfile.mkdtemp()
        req_file_path = os.path.join(temp_dir, "requirements.txt")

        try:
            # 解析requirements写入临时文件
            packages = self._parse_requirements(requirements, req_file_path)
            if not packages:
                return {
                    "success": False,
                    "error": "No valid packages found in requirements",
                    "message": "Requirements file is empty or contains only comments"
                }

            # 创建新环境
            create_result = self.conda_manager.create_environment(env_name)
            if not create_result.get("success", False):
                return {
                    "success": False,
                    "error": create_result.get("error", "Unknown error"),
                    "message": f"Failed to create environment '{env_name}'"
                }

            # 在新环境中安装包
            install_result = self.conda_manager.install_packages(env_name, packages)
            if not install_result.get("success", False):
                # 安装失败，删除新创建的环境
                self.conda_manager.delete_environment(env_name)
                return {
                    "success": False,
                    "error": install_result.get("error", "Unknown error"),
                    "message": "Failed to install requirements in new environment",
                    "failed_packages": install_result.get("failed_packages", []),
                    "error_details": install_result.get("error_details", [])
                }

            return {
                "success": True,
                "message": "Environment created with requirements",
                "environment": env_name,
                "installed_packages": packages
            }

        except Exception as e:
            # 出现异常，尝试删除可能已创建的环境
            self.logger.error(f"Error creating environment: {str(e)}")
            try:
                self.conda_manager.delete_environment(env_name)
            except:
                pass

            return {"success": False, "error": str(e), "message": "Error during environment creation"}
        finally:
            # 清理临时文件
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _parse_requirements(self, requirements: str, file_path: str) -> List[str]:
        """解析requirements文本为包列表
        
        Args:
            requirements: requirements文本内容
            file_path: 临时文件路径，用于写入requirements
            
        Returns:
            List[str]: 包列表
        """
        # 将requirements内容写入临时文件
        with open(file_path, 'w') as f:
            f.write(requirements)

        # 解析requirements文件，获取包列表
        packages = []
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    packages.append(line)

        return packages
