部署：

在服务器的/3D-multi-player路径下执行：

  unzip -FF 3D-multi-player.zip

  cd 3D-multi-player

  直接 node app.js

  或者：

  docker build -t web3d-frontend .

  docker run -p 2002:2002 web3d-frontend
  