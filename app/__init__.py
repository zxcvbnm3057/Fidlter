from flask import Flask, send_from_directory, request, g
from flask_cors import CORS
import os
import time
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('fidlter')


def create_app():
    app = Flask(__name__, static_folder='static')
    CORS(app,
         resources={
             r"/api/*": {
                 "origins": ["http://localhost:3000", "http://localhost:5000"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization"]
             }
         })

    # Register blueprints
    from .api.routes import api as api_blueprint
    from .api.auth import auth_bp

    # 注册API蓝图，url_prefix已经在蓝图定义中指定为'/api'
    app.register_blueprint(api_blueprint)

    # 注册认证蓝图，添加'/api/auth'前缀
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # 请求处理前记录开始时间
    @app.before_request
    def before_request():
        g.start_time = time.time()

    # 请求处理后记录结束时间和总耗时
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            # 计算请求处理时间（毫秒）
            elapsed_time = (time.time() - g.start_time) * 1000

            # 仅对API请求记录耗时（不记录静态资源请求）
            if request.path.startswith('/api'):
                logger.info(
                    f'请求: {request.method} {request.path} - 状态码: {response.status_code} - 耗时: {elapsed_time:.2f}ms')

        return response

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        # 这个路由处理所有非API请求作为静态文件
        # API请求(/api/...)会被蓝图处理，不会到达这里
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app
