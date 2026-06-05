// PM2 进程管理配置
// 用法: cd /path/to/danci007web && pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: 'danci007web',
      script: './backend/server.js',
      // 不指定 cwd，使用启动时所在目录
      // (部署时 cd /root/danci007web && pm2 start ...)

      instances: 1,           // SQLite 只支持单实例写入，保持 1
      exec_mode: 'fork',

      // 环境变量 (生产密码、CORS 等通过 .env 文件配置，PM2 自动加载)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // 日志
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // 自动重启
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '300M'
    }
  ]
}

