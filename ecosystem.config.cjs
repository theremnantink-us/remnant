module.exports = {
  apps: [
    {
      name: 'remnant',
      script: './server/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      cwd: '/var/www/remnant',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/remnant/error.log',
      out_file: '/var/log/remnant/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
