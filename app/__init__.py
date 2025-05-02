from flask import Flask, send_from_directory
from flask_cors import CORS
import os


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

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        # 这个路由处理所有非API请求作为静态文件
        # API请求(/api/...)会被蓝图处理，不会到达这里
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app
