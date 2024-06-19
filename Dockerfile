# 使用官方的 Node.js 镜像作为基础镜像
FROM node:18.20.2

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json 文件到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 将所有项目文件复制到工作目录
COPY . .

# 暴露应用程序需要的端口（假设是 3000）
EXPOSE 2002

# 运行应用程序
CMD [ "npm", "start" ]
