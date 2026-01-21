# 使用 Node.js 官方镜像
FROM node:18-alpine

# 设置容器内的文件夹
WORKDIR /app

# 先复制 package.json 进来安装依赖
COPY package*.json ./
RUN npm install

# 复制剩下的所有代码进来
COPY . .

# 你的项目 server.js 运行的端口（假设是 3000，如果代码里是别的请修改）
EXPOSE 3000

# 运行项目的命令
CMD ["node", "server.js"]
