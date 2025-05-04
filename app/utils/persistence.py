import os
import json
import shutil
import logging
import threading
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Union


class DataPersistence:
    """负责数据持久化的工具类，提供数据的存储和加载功能"""

    # 默认存储路径
    DATA_DIR = "/var/fidlter/data"
    CONFIG_DIR = "/var/fidlter/config"
    SCRIPTS_DIR = "/var/fidlter/scripts"  # 新增脚本存储路径

    # 数据子目录
    TASK_HISTORY_DIR = "task_history"
    ENV_INFO_DIR = "env_info"
    STATS_DIR = "stats"
    GIT_SCRIPTS_DIR = "git_scripts"  # Git克隆的脚本子目录

    # 文件名
    TASKS_CONFIG_FILE = "tasks.json"
    SYSTEM_CONFIG_FILE = "system_config.json"
    TASKS_STATS_FILE = "tasks_stats.json"
    CONDA_STATS_FILE = "conda_stats.json"

    # 文件版本标记
    CURRENT_VERSION = "1.0.0"

    def __init__(self):
        """初始化数据持久化工具"""
        self.logger = logging.getLogger("DataPersistence")
        self.lock = threading.RLock()

        # 确保目录存在
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """确保所有必要的数据目录存在"""
        # 主目录
        os.makedirs(self.DATA_DIR, exist_ok=True)
        os.makedirs(self.CONFIG_DIR, exist_ok=True)
        os.makedirs(self.SCRIPTS_DIR, exist_ok=True)  # 确保脚本目录存在
        os.makedirs(os.path.join(self.SCRIPTS_DIR, self.GIT_SCRIPTS_DIR), exist_ok=True)  # 创建Git脚本子目录

        # 数据子目录
        os.makedirs(os.path.join(self.DATA_DIR, self.TASK_HISTORY_DIR), exist_ok=True)
        os.makedirs(os.path.join(self.DATA_DIR, self.ENV_INFO_DIR), exist_ok=True)
        os.makedirs(os.path.join(self.DATA_DIR, self.STATS_DIR), exist_ok=True)

        self.logger.info(f"数据目录初始化完成：{self.DATA_DIR}、{self.CONFIG_DIR} 和 {self.SCRIPTS_DIR}")

    def _atomic_write_json(self, file_path: str, data: Dict[str, Any]) -> bool:
        """以原子方式写入JSON数据到文件
        
        Args:
            file_path: 文件路径
            data: 要写入的数据
            
        Returns:
            bool: 操作是否成功
        """
        # 添加版本标记
        data_with_version = {"__version__": self.CURRENT_VERSION, "data": data, "updated_at": time.time()}

        # 创建临时文件
        temp_file = f"{file_path}.tmp"
        try:
            directory = os.path.dirname(file_path)
            if not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)

            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(data_with_version, f, ensure_ascii=False, indent=2)

            # 原子替换
            shutil.move(temp_file, file_path)
            self.logger.debug(f"成功写入数据到 {file_path}")
            return True
        except Exception as e:
            self.logger.error(f"写入数据到 {file_path} 失败: {str(e)}")
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass
            return False

    def _read_json(self, file_path: str) -> Optional[Dict[str, Any]]:
        """从文件读取JSON数据
        
        Args:
            file_path: 文件路径
            
        Returns:
            Optional[Dict[str, Any]]: 读取的数据，如果失败则返回None
        """
        try:
            if not os.path.exists(file_path):
                self.logger.warning(f"文件不存在: {file_path}")
                return None

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 验证版本并提取数据
            if "__version__" in data:
                # TODO: 如果未来版本变化，在这里添加版本兼容处理
                return data.get("data")
            else:
                # 处理没有版本标记的旧数据
                self.logger.warning(f"文件 {file_path} 没有版本信息，将其视为原始数据")
                return data
        except Exception as e:
            self.logger.error(f"从 {file_path} 读取数据失败: {str(e)}")
            return None

    # 任务配置相关方法
    def save_tasks_config(self, tasks_data: Dict[str, Any]) -> bool:
        """保存任务配置
        
        Args:
            tasks_data: 任务配置数据
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            file_path = os.path.join(self.CONFIG_DIR, self.TASKS_CONFIG_FILE)
            return self._atomic_write_json(file_path, tasks_data)

    def load_tasks_config(self) -> Optional[Dict[str, Any]]:
        """加载任务配置
        
        Returns:
            Optional[Dict[str, Any]]: 任务配置数据，如果失败则返回None
        """
        with self.lock:
            file_path = os.path.join(self.CONFIG_DIR, self.TASKS_CONFIG_FILE)
            return self._read_json(file_path)

    # 系统配置相关方法
    def save_system_config(self, config_data: Dict[str, Any]) -> bool:
        """保存系统配置
        
        Args:
            config_data: 系统配置数据
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            file_path = os.path.join(self.CONFIG_DIR, self.SYSTEM_CONFIG_FILE)
            return self._atomic_write_json(file_path, config_data)

    def load_system_config(self) -> Optional[Dict[str, Any]]:
        """加载系统配置
        
        Returns:
            Optional[Dict[str, Any]]: 系统配置数据，如果失败则返回None
        """
        with self.lock:
            file_path = os.path.join(self.CONFIG_DIR, self.SYSTEM_CONFIG_FILE)
            return self._read_json(file_path)

    # 任务历史相关方法
    def save_task_history(self, task_id: str, history_data: Dict[str, Any]) -> bool:
        """保存任务历史记录
        
        Args:
            task_id: 任务ID
            history_data: 任务历史数据
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.TASK_HISTORY_DIR, f"{task_id}.json")
            return self._atomic_write_json(file_path, history_data)

    def load_task_history(self, task_id: str) -> Optional[Dict[str, Any]]:
        """加载任务历史记录
        
        Args:
            task_id: 任务ID
            
        Returns:
            Optional[Dict[str, Any]]: 任务历史数据，如果失败则返回None
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.TASK_HISTORY_DIR, f"{task_id}.json")
            return self._read_json(file_path)

    def load_all_task_histories(self) -> Dict[str, Dict[str, Any]]:
        """加载所有任务的历史记录
        
        Returns:
            Dict[str, Dict[str, Any]]: 任务ID到历史记录的映射
        """
        with self.lock:
            result = {}
            history_dir = os.path.join(self.DATA_DIR, self.TASK_HISTORY_DIR)

            if not os.path.exists(history_dir):
                return result

            for filename in os.listdir(history_dir):
                if filename.endswith('.json'):
                    task_id = filename[:-5]  # 去掉.json后缀
                    file_path = os.path.join(history_dir, filename)
                    history_data = self._read_json(file_path)
                    if history_data:
                        result[task_id] = history_data

            return result

    # 环境信息相关方法
    def save_env_info(self, env_name: str, env_data: Dict[str, Any]) -> bool:
        """保存环境信息
        
        Args:
            env_name: 环境名称
            env_data: 环境数据
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.ENV_INFO_DIR, f"{env_name}.json")
            return self._atomic_write_json(file_path, env_data)

    def load_env_info(self, env_name: str) -> Optional[Dict[str, Any]]:
        """加载环境信息
        
        Args:
            env_name: 环境名称
            
        Returns:
            Optional[Dict[str, Any]]: 环境数据，如果失败则返回None
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.ENV_INFO_DIR, f"{env_name}.json")
            return self._read_json(file_path)

    def load_all_env_info(self) -> Dict[str, Dict[str, Any]]:
        """加载所有环境信息
        
        Returns:
            Dict[str, Dict[str, Any]]: 环境名称到环境数据的映射
        """
        with self.lock:
            result = {}
            env_dir = os.path.join(self.DATA_DIR, self.ENV_INFO_DIR)

            if not os.path.exists(env_dir):
                return result

            for filename in os.listdir(env_dir):
                if filename.endswith('.json'):
                    env_name = filename[:-5]  # 去掉.json后缀
                    file_path = os.path.join(env_dir, filename)
                    env_data = self._read_json(file_path)
                    if env_data:
                        result[env_name] = env_data

            return result

    # 统计数据相关方法
    def save_tasks_stats(self, stats_data: Dict[str, Any]) -> bool:
        """保存任务统计数据
        
        Args:
            stats_data: 任务统计数据
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.STATS_DIR, self.TASKS_STATS_FILE)
            return self._atomic_write_json(file_path, stats_data)

    def load_tasks_stats(self) -> Optional[Dict[str, Any]]:
        """加载任务统计数据
        
        Returns:
            Optional[Dict[str, Any]]: 任务统计数据，如果失败则返回None
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.STATS_DIR, self.TASKS_STATS_FILE)
            return self._read_json(file_path)

    def save_conda_stats(self, stats_data: Dict[str, Any]) -> bool:
        """保存Conda环境统计数据
        
        Args:
            stats_data: Conda统计数据
            
        Returns:
            bool: 操作是否成功
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.STATS_DIR, self.CONDA_STATS_FILE)
            return self._atomic_write_json(file_path, stats_data)

    def load_conda_stats(self) -> Optional[Dict[str, Any]]:
        """加载Conda环境统计数据
        
        Returns:
            Optional[Dict[str, Any]]: Conda统计数据，如果失败则返回None
        """
        with self.lock:
            file_path = os.path.join(self.DATA_DIR, self.STATS_DIR, self.CONDA_STATS_FILE)
            return self._read_json(file_path)

    # 脚本文件管理相关方法
    def save_script_file(self,
                         file_content: Union[bytes, str],
                         filename: str,
                         task_id: Optional[str] = None) -> Optional[str]:
        """保存上传的脚本文件
        
        Args:
            file_content: 文件内容（二进制数据或字符串）
            filename: 原始文件名
            task_id: 可选的任务ID，用于组织存储
            
        Returns:
            Optional[str]: 保存后的文件路径，如果失败则返回None
        """
        try:
            with self.lock:
                # 创建基于任务ID的子目录（如果提供）
                if task_id:
                    script_dir = os.path.join(self.SCRIPTS_DIR, str(task_id))
                    os.makedirs(script_dir, exist_ok=True)
                else:
                    script_dir = self.SCRIPTS_DIR

                # 确保文件名安全
                safe_filename = os.path.basename(filename)

                # 完整文件路径
                file_path = os.path.join(script_dir, safe_filename)

                # 写入文件
                mode = 'wb' if isinstance(file_content, bytes) else 'w'
                with open(file_path, mode) as f:
                    f.write(file_content)

                self.logger.info(f"脚本文件已保存: {file_path}")
                return file_path
        except Exception as e:
            self.logger.error(f"保存脚本文件失败: {str(e)}")
            return None

    def save_script_from_zip(self, zip_content: bytes, task_id: Optional[str] = None) -> Dict[str, Any]:
        """从zip文件中解压并保存脚本文件
        
        Args:
            zip_content: zip文件内容（二进制数据）
            task_id: 可选的任务ID，用于组织存储
            
        Returns:
            Dict[str, Any]: 包含操作结果和保存的文件列表
        """
        import zipfile
        import io

        try:
            with self.lock:
                # 创建基于任务ID的子目录（如果提供）
                if task_id:
                    script_dir = os.path.join(self.SCRIPTS_DIR, str(task_id))
                else:
                    script_dir = self.SCRIPTS_DIR

                # 确保目录存在
                os.makedirs(script_dir, exist_ok=True)

                # 创建一个临时目录用于解压
                import tempfile
                with tempfile.TemporaryDirectory() as temp_dir:
                    # 解压zip文件到临时目录
                    with zipfile.ZipFile(io.BytesIO(zip_content)) as zip_ref:
                        zip_ref.extractall(temp_dir)

                    # 将解压后的文件复制到脚本目录
                    saved_files = []
                    for root, _, files in os.walk(temp_dir):
                        for file in files:
                            src_path = os.path.join(root, file)
                            # 计算相对路径，保持目录结构
                            rel_path = os.path.relpath(src_path, temp_dir)
                            dst_path = os.path.join(script_dir, rel_path)

                            # 确保目标目录存在
                            os.makedirs(os.path.dirname(dst_path), exist_ok=True)

                            # 复制文件
                            shutil.copy2(src_path, dst_path)
                            saved_files.append(dst_path)

                self.logger.info(f"ZIP文件已解压并保存到: {script_dir}, 共 {len(saved_files)} 个文件")

                # 查找可能的主脚本文件（优先返回python文件）
                main_script = None
                python_files = [f for f in saved_files if f.endswith('.py')]
                if python_files:
                    # 优先查找main.py, app.py等常见入口文件
                    for name in ['main.py', 'app.py', 'run.py', 'start.py']:
                        for file in python_files:
                            if os.path.basename(file) == name:
                                main_script = file
                                break
                        if main_script:
                            break

                    # 如果没有找到明确的入口文件，返回第一个python文件
                    if not main_script and python_files:
                        main_script = python_files[0]

                return {
                    "success": True,
                    "saved_files": saved_files,
                    "main_script": main_script,
                    "script_dir": script_dir
                }
        except Exception as e:
            self.logger.error(f"处理ZIP文件失败: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_script_path(self, task_id: str, filename: str) -> str:
        """获取特定任务的脚本文件路径
        
        Args:
            task_id: 任务ID
            filename: 文件名
            
        Returns:
            str: 完整的文件路径
        """
        return os.path.join(self.SCRIPTS_DIR, str(task_id), filename)

    def save_git_scripts(self, repo_dir: str, task_id: str) -> Dict[str, Any]:
        """将克隆的Git仓库内容复制到脚本目录
        
        Args:
            repo_dir: Git仓库的源目录
            task_id: 任务ID
            
        Returns:
            Dict[str, Any]: 包含操作结果和保存的文件列表
        """
        try:
            with self.lock:
                # 创建目标目录
                target_dir = os.path.join(self.SCRIPTS_DIR, self.GIT_SCRIPTS_DIR, str(task_id))
                os.makedirs(target_dir, exist_ok=True)

                # 复制仓库内容
                saved_files = []
                for item in os.listdir(repo_dir):
                    src_path = os.path.join(repo_dir, item)
                    dst_path = os.path.join(target_dir, item)

                    if os.path.isdir(src_path):
                        shutil.copytree(src_path, dst_path)
                        # 添加目录下的所有文件
                        for root, _, files in os.walk(dst_path):
                            for file in files:
                                saved_files.append(os.path.join(root, file))
                    else:
                        shutil.copy2(src_path, dst_path)
                        saved_files.append(dst_path)

                self.logger.info(f"Git仓库内容已复制到: {target_dir}, 共 {len(saved_files)} 个文件")

                # 查找可能的主脚本文件
                main_script = None
                python_files = [f for f in saved_files if f.endswith('.py')]
                if python_files:
                    # 优先查找main.py, app.py等常见入口文件
                    for name in ['main.py', 'app.py', 'run.py', 'start.py']:
                        for file in python_files:
                            if os.path.basename(file) == name:
                                main_script = file
                                break
                        if main_script:
                            break

                    # 如果没有找到明确的入口文件，返回第一个python文件
                    if not main_script and python_files:
                        main_script = python_files[0]

                return {
                    "success": True,
                    "saved_files": saved_files,
                    "main_script": main_script,
                    "script_dir": target_dir
                }
        except Exception as e:
            self.logger.error(f"保存Git仓库内容失败: {str(e)}")
            return {"success": False, "error": str(e)}

    # 备份和恢复操作
    def create_backup(self) -> bool:
        """创建数据备份
        
        Returns:
            bool: 操作是否成功
        """
        try:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            backup_dir = os.path.join(self.DATA_DIR, f"backup_{timestamp}")

            # 创建备份目录
            os.makedirs(backup_dir, exist_ok=True)

            # 备份配置目录
            config_backup = os.path.join(backup_dir, "config")
            shutil.copytree(self.CONFIG_DIR, config_backup)

            # 备份数据目录中的子目录
            for subdir in [self.TASK_HISTORY_DIR, self.ENV_INFO_DIR, self.STATS_DIR]:
                src_dir = os.path.join(self.DATA_DIR, subdir)
                if os.path.exists(src_dir):
                    dst_dir = os.path.join(backup_dir, subdir)
                    shutil.copytree(src_dir, dst_dir)

            self.logger.info(f"成功创建备份: {backup_dir}")
            return True
        except Exception as e:
            self.logger.error(f"创建备份失败: {str(e)}")
            return False

    def restore_backup(self, backup_dir: str) -> bool:
        """从备份恢复数据
        
        Args:
            backup_dir: 备份目录路径
            
        Returns:
            bool: 操作是否成功
        """
        try:
            # 检查备份目录是否存在
            if not os.path.exists(backup_dir) or not os.path.isdir(backup_dir):
                self.logger.error(f"备份目录不存在: {backup_dir}")
                return False

            # 恢复配置目录
            config_backup = os.path.join(backup_dir, "config")
            if os.path.exists(config_backup):
                shutil.rmtree(self.CONFIG_DIR, ignore_errors=True)
                shutil.copytree(config_backup, self.CONFIG_DIR)

            # 恢复数据目录中的子目录
            for subdir in [self.TASK_HISTORY_DIR, self.ENV_INFO_DIR, self.STATS_DIR]:
                src_dir = os.path.join(backup_dir, subdir)
                if os.path.exists(src_dir):
                    dst_dir = os.path.join(self.DATA_DIR, subdir)
                    shutil.rmtree(dst_dir, ignore_errors=True)
                    shutil.copytree(src_dir, dst_dir)

            self.logger.info(f"成功从 {backup_dir} 恢复备份")
            return True
        except Exception as e:
            self.logger.error(f"恢复备份失败: {str(e)}")
            return False

    def clean_old_backups(self, keep_days: int = 7) -> None:
        """清理旧的备份
        
        Args:
            keep_days: 保留最近几天的备份
        """
        try:
            now = time.time()
            cutoff = now - (keep_days * 86400)  # 保留时间（秒）

            for item in os.listdir(self.DATA_DIR):
                if item.startswith("backup_"):
                    backup_path = os.path.join(self.DATA_DIR, item)
                    if os.path.isdir(backup_path):
                        # 获取目录的修改时间
                        mtime = os.path.getmtime(backup_path)
                        if mtime < cutoff:
                            shutil.rmtree(backup_path)
                            self.logger.info(f"已删除旧备份: {item}")
        except Exception as e:
            self.logger.error(f"清理旧备份失败: {str(e)}")
