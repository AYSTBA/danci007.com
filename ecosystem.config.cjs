// PM2 进程管理配置
// 用法：pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'danci007web',
      script: './backend/server.js',
      cwd: '/var/www/danci007web',   // ← 改成你服务器上的实际路径

      // 进程设置
      instances: 1,           // SQLite 只支持单实例写入，保持 1
      exec_mode: 'fork',

      // 环境变量（通过 .env 或系统环境变量设置，不要写死在配置文件中）
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
