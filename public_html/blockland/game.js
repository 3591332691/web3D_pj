//2
//TODO:修改这里成为调用后端的
async function getAIAnswer(question) {
    const baseUrl = 'http://localhost:8080/ai';
    const url = `${baseUrl}?question=${encodeURIComponent(question)}`;

    try {
        const response = await fetch(url, {
            method: 'GET', // 可以根据实际需要改为 POST，取决于后端接口要求
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.output.text;
    } catch (error) {
        console.error('Error fetching AI answer:', error);
        throw error;
    }
}

class Game{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;
		
		this.container;
		this.player;
		this.guide; // 跟随用户的导游
		this.examiner; // 考官
		this.assistant; // AI助手
		this.cameras;
		this.camera;
		this.scene;
		this.renderer;
		this.animations = {};
		this.assetsPath = 'assets/';

		this.display1;
		this.display2;
		this.display3;
		this.display4;
		this.display5;
		this.display6;
		
		this.remotePlayers = [];
		this.remoteColliders = [];
		this.initialisingPlayers = [];
		this.remoteData = [];

		// 考试问题暂时写死
		this.questions = [
			{
				question: '1.万年的稻作文化系统位于（）省。',
				options: ['A.江西', 'B.云南', 'C.浙江'],
				answer: '1'
			},
			{
				question: '2.高句丽古墓群属于哪个国家的世界文化遗产',
				options: ['A.韩国', 'B.朝鲜', 'C.中国'],
				answer: '2'
			},
			{
				question: '3.耳杯这种形制的玛瑙器出现于什么时代',
				options: ['A.汉代', 'B.三国', 'C.魏晋'],
				answer: '1'
			},
			{
				question: '4.号称“青铜之冠”，体现中国古代铜器制造最高制造水平的是',
				options: ['A.铜车马', 'B.青铜剑', 'C.寺工铜矛'],
				answer: '1'
			}
		];
		
		this.messages = { 
			text:[ 
			"Welcome to Blockland",
			"GOOD LUCK!"
			],
			index:0
		}
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		
		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
        
		const game = this;
		this.anims = ['Walking', 'Walking Backwards', 'Turn', 'Running', 'Pointing', 'Talking', 'Pointing Gesture'];
		
		const options = {
			assets:[
				`${this.assetsPath}images/nx.jpg`,
				`${this.assetsPath}images/px.jpg`,
				`${this.assetsPath}images/ny.jpg`,
				`${this.assetsPath}images/py.jpg`,
				`${this.assetsPath}images/nz.jpg`,
				`${this.assetsPath}images/pz.jpg`
			],
			oncomplete: function(){
				game.init();
			}
		}
		
		this.anims.forEach( function(anim){ options.assets.push(`${game.assetsPath}fbx/anims/${anim}.fbx`)});
		options.assets.push(`${game.assetsPath}fbx/town.fbx`);
		
		this.mode = this.modes.PRELOAD;
		
		this.clock = new THREE.Clock();

		const preloader = new Preloader(options);
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}

		  // 玩家模型创建函数
		  createPlayer() {
			const modelSelector = document.getElementById('modelSelector');
			const selectedModel = modelSelector.options[modelSelector.selectedIndex].value;
		
			this.player = new PlayerLocal(this, selectedModel);
		  }
		
		  changePlayerModel(model) {
			if (this.player !== undefined) {
				console.log("Old player object:", this.player.object); // 打印旧模型对象
				this.scene.remove(this.player.object);
		
				// 更新当前角色的外貌
				this.player.model = model;
		
				// 重新加载新外貌的模型
				this.loadPlayerModel();
			}
		}
		
		loadPlayerModel() {
			const player = this.player;
			const loader = new THREE.FBXLoader();
			const game = this;
		
			loader.load(`${game.assetsPath}fbx/people/${player.model}.fbx`, function (object) {
				object.mixer = new THREE.AnimationMixer(object);
				player.root = object;
				player.mixer = object.mixer;
		
				object.name = "Person";
		
				object.traverse(function (child) {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});
		
				const textureLoader = new THREE.TextureLoader();
		
				textureLoader.load(`${game.assetsPath}images/SimplePeople_${player.model}_${player.colour}.png`, function (texture) {
					object.traverse(function (child) {
						if (child.isMesh) {
							child.material.map = texture;
						}
					});
				});
		
				player.object = new THREE.Object3D();
				player.object.position.set(3122, 0, -173);
				player.object.rotation.set(0, 2.6, 0);
		
				player.object.add(object);
				if (player.deleted === undefined) game.scene.add(player.object);
		
				if (player.local) {
					game.createCameras();
					game.sun.target = game.player.object;
					game.animations.Idle = object.animations[0];
					if (player.initSocket !== undefined) player.initSocket();
				} else {
					const geometry = new THREE.BoxGeometry(100, 300, 100);
					const material = new THREE.MeshBasicMaterial({ visible: false });
					const box = new THREE.Mesh(geometry, material);
					box.name = "Collider";
					box.position.set(0, 150, 0);
					player.object.add(box);
					player.collider = box;
					player.object.userData.id = player.id;
					player.object.userData.remotePlayer = true;
					const players = game.initialisingPlayers.splice(game.initialisingPlayers.indexOf(this), 1);
					game.remotePlayers.push(players[0]);
				}
		
				if (game.animations.Idle !== undefined) player.action = "Idle";
			});
		}
		
	
	initSfx(){
		this.sfx = {};
		this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
		this.sfx.gliss = new SFX({
			context: this.sfx.context,
			src:{mp3:`${this.assetsPath}sfx/gliss.mp3`, ogg:`${this.assetsPath}sfx/gliss.ogg`},
			loop: false,
			volume: 0.3
		});
	}
	
	set activeCamera(object){
		this.cameras.active = object;
	}
	
	init() {
		this.mode = this.modes.INITIALISING;

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 200000 );
		
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x00a0f0 );

		const ambient = new THREE.AmbientLight( 0xaaaaaa );
        this.scene.add( ambient );

        const light = new THREE.DirectionalLight( 0xaaaaaa );
        light.position.set( 30, 100, 40 );
        light.target.position.set( 0, 0, 0 );

        light.castShadow = true;

		const lightSize = 500;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 500;
		light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
		light.shadow.camera.right = light.shadow.camera.top = lightSize;

        light.shadow.bias = 0.0039;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
		
		this.sun = light;
		this.scene.add(light);

		// model
		const loader = new THREE.FBXLoader();
		const game = this;
		
		//this.player = new PlayerLocal(this);
		this.createPlayer(); // 创建玩家
		
		this.loadEnvironment(loader);
		this.loadGuide(loader);
		//this.loadAssitant();
		this.loadDisplay(loader);
		this.loadExaminer(loader); // 创建考官
		
		this.speechBubble = new SpeechBubble(this, "", 150);
		this.speechBubble.mesh.position.set(0, 350, 0);
		
		this.joystick = new JoyStick({
			onMove: this.playerControl,
			game: this
		});
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild( this.renderer.domElement );
		
		if ('ontouchstart' in window){
			window.addEventListener( 'touchdown', (event) => game.onMouseDown(event), false );
		}else{
			window.addEventListener( 'mousedown', (event) => game.onMouseDown(event), false );	
		}
/*		this.guide.addEventListener('click', function() {
			console.log("点击导游");
			game.showChatBox("你好");
		});*/
		const AIsendButton = document.getElementById('AIsendButton');
		// 添加点击事件监听器
		AIsendButton.addEventListener('click', (event) => {
			event.preventDefault(); // 阻止按钮的默认行为（如提交表单）
			// 得到输入的内容
			const inputField = document.getElementById('m1');
			const inputValue = inputField.value.trim(); // 使用 trim() 方法去除首尾空白字符
			// 判断输入内容是否为空
			if (inputValue === '') {
				this.showChatBox('你想说什么？'); // 输入内容为空时给出提示
			} else {
				// 不为空的话就返回 AI 回答的内容
				getAIAnswer(inputValue)
					.then(answer => {
						this.showChatBox(answer);
					})
					.catch(error => {
						console.error('获取 AI 回答时出错:', error);
						this.showChatBox('AI 回答失败：',error);
					});
			}
		});
				  // 在初始化函数中添加以下代码
				  const modelSelector = document.getElementById('modelSelector');
				  modelSelector.addEventListener('change', function(event) {
					game.changePlayerModel(event.target.value);
				  });
		window.addEventListener( 'resize', () => game.onWindowResize(), false );
		// 添加空格键按下事件监听器  
		document.addEventListener('keydown', (event) => {
			if (event.keyCode === 32 || event.key === ' ') { // 检查是否按下了空格键  
				// 假设 game.player 有一个 getPosition 方法或类似的方法来获取位置  
				// 并且 game 有一个 printPlayerPosition 方法来打印位置  
				const position_x = game.player.object.position.x;
				const position_y = game.player.object.position.y; // 获取玩家位置
				const position_z = game.player.object.position.z;
				console.log("当前player位置：x坐标", position_x, "y坐标：", position_y, "z坐标", position_z); // 打印玩家位置  
			}
		}, false);
	}
	
	loadEnvironment(loader){
		const game = this;
		console.log("game.scene.position:",game.scene.position);
		loader.load(`${this.assetsPath}fbx/FBX.fbx`, function(object){
			//object.scale(10,10,10);
			object.rotation.x = Math.PI *3/2;
			game.environment = object;
			game.colliders = [];

			game.scene.add(object);
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
					}
				}
			} );
			
			const tloader = new THREE.CubeTextureLoader();
			tloader.setPath( `${game.assetsPath}/images/` );

			var textureCube = tloader.load( [
				'px.jpg', 'nx.jpg',
				'py.jpg', 'ny.jpg',
				'pz.jpg', 'nz.jpg'
			] );

			game.scene.background = textureCube;
			
			game.loadNextAnim(loader);
			//console.log("game.scene.position:",game.scene.position)
		})
		//console.log("game.scene.position:",game.scene.position)
	}

	/**
	 * 用来加载展品
	 * @param loader
	 */
	loadDisplay(loader){
		const textureLoader = new THREE.TextureLoader();
		const game = this;
		//加载铜马
		loader.load(`${this.assetsPath}fbx/display/tongma/tongma.fbx`, function(model){
			// 设置模型的位置、旋转和缩放
			model.position.set(5185, 30, -2123);
			//model.rotation.y = Math.PI * 1;
			model.scale.set(6, 6, 6);
			game.display1 = model;
			game.scene.add(model);
			model.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/display/tongma/texture/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			} );
			// 创建模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'display1Collider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("模型1号加载成功");
		})
		//加载凤凰
		loader.load(`${this.assetsPath}fbx/display/fenghuang/model.fbx`, function(model){
			// 设置模型的位置、旋转和缩放
			model.position.set(3511, 30, -4335);
			//model.rotation.y = Math.PI * 1;
			model.scale.set(1000, 1000, 1000);
			game.display2 = model;
			game.scene.add(model);
			model.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/display/fenghuang/textures/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			} );
			// 创建模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'display2Collider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("模型2号加载成功");
		})
		//加载方鼎
		loader.load(`${this.assetsPath}fbx/display/fangding/fangding.fbx`, function(model){
			// 设置模型的位置、旋转和缩放
			model.position.set(-1754, 30, -5708);
			//model.rotation.y = Math.PI * 1;
			model.scale.set(10, 10, 10);
			game.display3 = model;
			game.scene.add(model);
			model.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/display/fangding/texture/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			} );
			// 创建模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'display3Collider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("模型3号加载成功");
		})
		//加载升鼎
		loader.load(`${this.assetsPath}fbx/display/ding/ding.fbx`, function(model){
			// 设置模型的位置、旋转和缩放
			model.position.set(-4972, 30, -2622);
			//model.rotation.y = Math.PI * 1;
			model.scale.set(10, 10, 10);
			game.display4 = model;
			game.scene.add(model);
			model.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/display/ding/texture/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			} );
			// 创建模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'display4Collider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("模型4号加载成功");
		})
		//炉
		loader.load(`${this.assetsPath}fbx/display/lu/model.fbx`, function(model){
			// 设置模型的位置、旋转和缩放
			model.position.set(-5332, 30, 688);
			//model.rotation.y = Math.PI * 1;
			model.scale.set(300, 300, 300);
			game.display5 = model;
			game.scene.add(model);
			model.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/display/lu/textures/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			} );
			// 创建模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'display5Collider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("模型5号加载成功");
		})
		//加载青花瓷
		//TODO：这个没有材质
		loader.load(`${this.assetsPath}fbx/display/qinghuaci/ping.fbx`, function(model){
			// 设置模型的位置、旋转和缩放
			model.position.set(-2031, 30, 5743);
			//model.rotation.y = Math.PI * 1;
			model.scale.set(10, 10, 10);
			game.display6 = model;
			game.scene.add(model);
			model.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/display/qinghuaci/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			} );
			// 创建模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'display6Collider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("模型6号加载成功");
		})
	}

	loadNextAnim(loader){
		let anim = this.anims.pop();
		const game = this;
		loader.load( `${this.assetsPath}fbx/anims/${anim}.fbx`, function( object ){
			game.player.animations[anim] = object.animations[0];
			if (game.anims.length>0){
				game.loadNextAnim(loader);
			}else{
				delete game.anims;
				game.action = "Idle";
				game.mode = game.modes.ACTIVE;
				game.animate();
			}
		});	
	}

	loadExaminer(loader) {
		const textureLoader = new THREE.TextureLoader();
		const game = this;

		// 加载NPC模型
		loader.load(`${this.assetsPath}fbx/npc/BB8.fbx`, function(model) {
			// 设置模型的位置、旋转和缩放
			model.position.set(2500, 100, 500);
			model.scale.set(3, 3, 3);

			game.examiner = model;
			game.scene.add(model);

			model.traverse(function(child) {
				if (child.isMesh) {
					if (child.name.startsWith("proxy")) {
						game.colliders.push(child);
						child.material.visible = false;
					} else {
						child.castShadow = true;
						child.receiveShadow = true;
						// 加载模型的贴图
						if (child.material.map === null) { // 只加载未加载过贴图的材质
							const texturePath = `${game.assetsPath}fbx/npc/textures/${child.name}.png`;
							textureLoader.load(texturePath, function(texture) {
								child.material.map = texture;
								child.material.needsUpdate = true;
							});
						}
					}
				}
			});

			// 碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.Box3().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'npcCollider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);

			console.log("考官加载成功");
		});
	}



	showChatBox(message) {
		const chatContainer = document.createElement('div');
		chatContainer.id = 'chat-box';
		chatContainer.style.position = 'absolute';
		chatContainer.style.bottom = '10px';
		chatContainer.style.left = '10px';
		chatContainer.style.padding = '10px';
		chatContainer.style.background = 'rgba(0, 0, 0, 0.7)';
		chatContainer.style.color = 'white';
		chatContainer.style.borderRadius = '5px';
		chatContainer.textContent = message;
	
		// Check if chat box already exists, remove it before adding a new one
		const existingChatBox = document.getElementById('chat-box');
		if (existingChatBox) {
			existingChatBox.remove();
		}
	
		document.body.appendChild(chatContainer);
	
		// Automatically remove the chat box after a few seconds
		setTimeout(() => {
			chatContainer.remove();
		}, 5000);
	}

	showExamBox(questions) {
		// 创建对话框容器
		const examContainer = document.createElement('div');
		examContainer.id = 'exam-box';
		examContainer.style.position = 'absolute';
		examContainer.style.top = '50%';
		examContainer.style.left = '50%';
		examContainer.style.transform = 'translate(-50%, -50%)';  // 垂直和水平居中
		examContainer.style.padding = '20px';
		examContainer.style.background = 'rgba(255, 255, 255, 0.95)';
		examContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
		examContainer.style.color = 'black';
		examContainer.style.borderRadius = '10px';
		examContainer.style.boxShadow = '0px 0px 20px rgba(0, 0, 0, 0.5)';
		examContainer.style.width = '800px';
		examContainer.style.maxHeight = '80%';
		examContainer.style.overflowY = 'auto';
		examContainer.style.zIndex = '1000';
		examContainer.style.fontSize = '20px';

		// 标题
		const title = document.createElement('h2');
		title.textContent = '在线测试';
		title.style.textAlign = 'center';
		title.style.marginBottom = '20px';
		examContainer.appendChild(title);

		// 创建问题表单
		const form = document.createElement('form');
		form.id = 'exam-form';
		form.style.background = 'white';
		questions.forEach((q, i) => {
			const questionContainer = document.createElement('div');
			questionContainer.style.marginBottom = '30px';
			questionContainer.style.background = 'white';
			questionContainer.style.verticalAlign = 'middle';

			const questionLabel = document.createElement('label');
			questionLabel.textContent = q.question;
			questionLabel.style.display = 'block';
			questionLabel.style.marginBottom = '5px';
			questionLabel.style.fontWeight = 'bold';
			questionLabel.style.background = 'white';
			questionLabel.style.backgroundColor = 'white';

			questionContainer.appendChild(questionLabel);

			q.options.forEach((option, j) => {

				const optionLabel = document.createElement('label');
				optionLabel.style.background = 'white';
				optionLabel.style.display = 'inline-block';
				optionLabel.style.background = 'white';

				const optionInput = document.createElement('input');
				optionInput.type = 'radio';
				optionInput.name = `question-${i}`;
				optionInput.value = j+1;
				optionInput.style.display = 'inline-block';
				optionInput.style.background = 'white';
				optionInput.style.backgroundColor = 'white';
				optionInput.style.width = '10%';
				optionInput.style.marginLeft = '5px';

				optionLabel.appendChild(optionInput);
				optionLabel.appendChild(document.createTextNode(option));
				questionContainer.appendChild(optionLabel);
			});

			form.appendChild(questionContainer);
		});

		// 提交按钮
		const submitButton = document.createElement('button');
		submitButton.type = 'button';
		submitButton.textContent = '提交答案';
		submitButton.style.marginTop = '20px';
		submitButton.style.padding = '10px';
		submitButton.style.width = '100%';
		submitButton.style.backgroundColor = '#4CAF50';
		submitButton.style.color = 'white';
		submitButton.style.border = 'none';
		submitButton.style.borderRadius = '5px';
		submitButton.style.cursor = 'pointer';
		submitButton.onclick = () => this.submitExam(questions);

		submitButton.onmouseover = () => submitButton.style.backgroundColor = '#45a049';
		submitButton.onmouseout = () => submitButton.style.backgroundColor = '#4CAF50';

		form.appendChild(submitButton);
		examContainer.appendChild(form);

		// 关闭按钮
		const closeButton = document.createElement('span');
		closeButton.textContent = '×';
		closeButton.style.position = 'absolute';
		closeButton.style.top = '10px';
		closeButton.style.right = '10px';
		closeButton.style.cursor = 'pointer';
		closeButton.style.fontSize = '20px';
		closeButton.onclick = () => examContainer.remove();

		closeButton.onmouseover = () => closeButton.style.color = 'red';
		closeButton.onmouseout = () => closeButton.style.color = 'black';

		examContainer.appendChild(closeButton);

		// 检查是否已经有考试对话框存在，如果有则移除
		const existingExamBox = document.getElementById('exam-box');
		if (existingExamBox) {
			existingExamBox.remove();
		}

		document.body.appendChild(examContainer);
	}

	submitExam(questions) {
		const form = document.getElementById('exam-form');
		const formData = new FormData(form);

		let correctCount = 0;
		let feedback = '';

		questions.forEach((q, i) => {
			const userAnswer = formData.get(`question-${i}`);
			q.userAnswer = userAnswer; // 将用户选择的答案保存到题目对象中
			console.log(userAnswer);

			// 检查用户答案是否正确
			if (userAnswer === q.answer) {
				correctCount++;
				feedback += `题目 ${i + 1}: 正确\n`;
			} else {
				feedback += `题目 ${i + 1}: 错误，正确答案是 ${q.options[q.answer]}\n`
			}
		});

		// 计算得分或显示结果
		const score = (correctCount / questions.length) * 100;
		feedback += `\n您的得分为：${score.toFixed(2)}%`;

		alert(feedback);

		// 可以选择性地将结果显示在页面的某个区域，或者做其他交互

		// 移除考试对话框
		const examBox = document.getElementById('exam-box');
		if (examBox) {
			examBox.remove();
		}
	}






	loadGuide(loader){
		const game = this;
		loader.load(`${this.assetsPath}fbx/guide/xiaoshizi.fbx`, function (model) {
			// 设置导游模型的位置、旋转和缩放
			model.position.set(0, 0, 0);
			model.rotation.y = Math.PI * 1;
			model.scale.set(10, 10, 10);
			game.guide = model;
			game.scene.add(model);
			
	
			// 创建导游模型的碰撞体
			const boundingBox = new THREE.Box3().setFromObject(model);
			const boxGeometry = new THREE.BoxGeometry().setFromObject(boundingBox);
			const boxMaterial = new THREE.MeshBasicMaterial({ visible: false });
			const collider = new THREE.Mesh(boxGeometry, boxMaterial);
			collider.userData = { name: 'guideCollider' };
			collider.position.copy(model.position);
			game.scene.add(collider);
			game.remoteColliders.push(collider);
			console.log("导游模型加载成功");
	

		});
	}

	playerControl(forward, turn){
		turn = -turn;
		
		if (forward>0.3){
			if (this.player.action!='Walking' && this.player.action!='Running') this.player.action = 'Walking';
		}else if (forward<-0.3){
			if (this.player.action!='Walking Backwards') this.player.action = 'Walking Backwards';
		}else{
			forward = 0;
			if (Math.abs(turn)>0.1){
				if (this.player.action != 'Turn') this.player.action = 'Turn';
			}else if (this.player.action!="Idle"){
				this.player.action = 'Idle';
			}
		}
		
		if (forward==0 && turn==0){
			delete this.player.motion;
		}else{
			this.player.motion = { forward, turn }; 
		}
		
		this.player.updateSocket();
	}
	
	createCameras(){
		const offset = new THREE.Vector3(0, 80, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 600);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 300, -1050);
		back.parent = this.player.object;
		const chat = new THREE.Object3D();
		chat.position.set(0, 200, -450);
		chat.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 1665);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.parent = this.player.object;
		this.cameras = { front, back, wide, overhead, collect, chat };
		this.activeCamera = this.cameras.back;	
	}

	
	showMessage(msg, fontSize=20, onOK=null){
		const txt = document.getElementById('message_text');
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		const game = this;
		if (onOK!=null){
			btn.onclick = function(){ 
				panel.style.display = 'none';
				onOK.call(game); 
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}
		panel.style.display = 'flex';
	}
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( window.innerWidth, window.innerHeight );

	}
	
	updateRemotePlayers(dt){
		if (this.remoteData===undefined || this.remoteData.length == 0 || this.player===undefined || this.player.id===undefined) return;
		
		const newPlayers = [];
		const game = this;
		//Get all remotePlayers from remoteData array
		const remotePlayers = [];
		const remoteColliders = [];
		
		this.remoteData.forEach( function(data){
			if (game.player.id != data.id){
				//Is this player being initialised?
				let iplayer;
				game.initialisingPlayers.forEach( function(player){
					if (player.id == data.id) iplayer = player;
				});
				//If not being initialised check the remotePlayers array
				if (iplayer===undefined){
					let rplayer;
					game.remotePlayers.forEach( function(player){
						if (player.id == data.id) rplayer = player;
					});
					if (rplayer===undefined){
						//Initialise player
						game.initialisingPlayers.push( new Player( game, data ));
					}else{
						//Player exists
						remotePlayers.push(rplayer);
						remoteColliders.push(rplayer.collider);
					}
				}
			}
		});
		
		this.scene.children.forEach( function(object){
			if (object.userData.remotePlayer && game.getRemotePlayerById(object.userData.id)==undefined){
				game.scene.remove(object);
			}	
		});
		
		this.remotePlayers = remotePlayers;
		this.remoteColliders = remoteColliders;
		this.remotePlayers.forEach(function(player){ player.update( dt ); });	
	}
	
	onMouseDown(event) {
		if (
			this.remoteColliders === undefined ||
			this.remoteColliders.length == 0 ||
			this.speechBubble === undefined ||
			this.speechBubble.mesh === undefined
		) {
			return;
		}
	
		const mouse = new THREE.Vector2();
		mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
		mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
	
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, this.camera);
	
		const intersects = raycaster.intersectObjects(this.remoteColliders);
		const chat = document.getElementById('chat');
		const chatWithAI = document.getElementById('chatWithAI');
	
		if (intersects.length > 0) {
			const object = intersects[0].object;
			const players = this.remotePlayers.filter(function (player) {
				return player.collider !== undefined && player.collider === object;
			});
	
			if (players.length > 0) {
				const player = players[0];
				console.log(`onMouseDown: player ${player.id}`);
				this.speechBubble.player = player;
				this.speechBubble.update('');
				this.scene.add(this.speechBubble.mesh);
				this.chatSocketId = player.id;
				chat.style.bottom = '0px';
				this.activeCamera = this.cameras.chat;
			} 
		} else {
			const guideIntersects = raycaster.intersectObjects([this.guide], true);
			const examinerIntersects = raycaster.intersectObjects([this.examiner], true);
	
			if (guideIntersects.length > 0) {
				//这里是点击了导游之后
				console.log("Clicked on the guide model");
				this.showChatBox("随身导游：你好，我是随身导游，有什么问题可以问我哦！");
				chatWithAI.style.bottom = '0px';
			} else {
				console.log("Guide model not detected");
				//如果此时点击到了空，就把聊天框下沉
				if (chatWithAI.style.bottom === '0px' && window.innerHeight - event.clientY > 40) {
					console.log("onMouseDown: close chat with AI");
					chatWithAI.style.bottom = '-40px';
					this.activeCamera = this.cameras.back;
				} else {
					console.log("onMouseDown: typing");
				}
			}

			if (examinerIntersects.length > 0) { // 点击考官
				console.log("Clicked on the guide model");
				this.showChatBox("考官：开始答题！");
				this.showExamBox(this.questions);
				chatWithAI.style.bottom = '0px';
			} else {
				console.log("Guide model not detected");
			}



			const display1Intersects = raycaster.intersectObjects([this.display1], true);
			if(display1Intersects.length > 0) {
				console.log("Clicked on the display1 model");
				this.showChatBox("在中国历史悠久的文化传统中，铜马是一种象征着力量和尊贵的艺术品。它们通常以铜为材料，精细地铸造而成，每一件铜马都是工匠们精心打造的杰作。这些铜马不仅仅是装饰品，它们背后还蕴含着深厚的文化内涵。在古代，铜马被用来作为贵族墓葬中的陪葬品，代表着对逝者的尊敬和祝福。它们还常常被视为吉祥物，象征着希望和兴旺。每一尊铜马都展现了古代工匠们卓越的铸造技艺和对细节的极致追求。从栩栩如生的姿态到精湛的表面雕刻，铜马无不展示出古代艺术家对形象和比例的精确把握。");
			} else {
				console.log("Display1 model not detected");
			}

			const display2Intersects = raycaster.intersectObjects([this.display2], true);
			if(display2Intersects.length > 0) {
				console.log("Clicked on the display2 model");
				this.showChatBox("凤凰在中国传统文化中象征着吉祥、美好和荣耀。凤凰铜器是以这种神鸟为主题的艺术品，通常由精美的铜雕塑而成。每一件凤凰铜器都展示了古代工匠们的高超技艺和对美的追求。这些铜器不仅在艺术上令人赞叹，更反映了古代人们对神话传说和宇宙观念的理解。凤凰作为神话中的灵兽，被赋予了神圣的象征意义，常被用来装饰贵族的居所或作为贵重的礼物赠送。每一件凤凰铜器都通过精湛的铸造和精细的雕刻，展现了古代艺术家们对比例和细节的深刻把握。它们不仅是艺术品，更是文化的载体，传承着古代人们对美好生活和精神世界的追求。");
			} else {
				console.log("Display2 model not detected");
			}

			const display3Intersects = raycaster.intersectObjects([this.display3], true);
			if(display3Intersects.length > 0) {
				console.log("Clicked on the display3 model");
				this.showChatBox("方鼎是古代中国的一种重要铜器，它结合了实用性与艺术性，通常用于烹饪和祭祀。这些鼎以其独特的方形设计著称，不仅在功能上体现了古代社会的文化与礼仪，也反映了当时铸造技术的高度发达。每一只方鼎都是由经验丰富的工匠们用精湛的铸造技艺制成。它们通常装饰着各种纹饰和图案，如凤凰、龙纹或神兽，这些装饰不仅美观，还承载着古代人们对神话和宗教信仰的理解。方鼎在古代社会中不仅作为日常生活中的重要器物，更是权力和地位的象征。它们常常被用于皇宫、贵族宅邸以及祭祀活动中，体现了社会秩序和文化传统的延续。");
			} else {
				console.log("Display3 model not detected");
			}

			const display4Intersects = raycaster.intersectObjects([this.display4], true);
			if(display4Intersects.length > 0) {
				console.log("Clicked on the display4 model");
				this.showChatBox("升鼎是中国古代的一种重要青铜器，其形制独特，通常由鼎身、鼎耳和鼎腿组成。它们不仅在古代社会中扮演着烹饪和祭祀的重要角色，更是文化与宗教象征的重要载体。这些升鼎不仅在功能上体现了古代礼仪与生活方式，还展示了古代工匠们高超的铸造技艺。它们常常装饰着各种精美的纹饰和图案，如龙、凤、神兽等，这些装饰不仅美观，还反映了古代人们对神话和宗教信仰的崇敬。在古代社会中，升鼎不仅是贵族家庭中的重要器物，也是权力和地位的象征。它们常常被用于皇宫、贵族宅邸以及重大祭祀仪式中，承载着社会秩序和文化传统的重要使命。");
			} else {
				console.log("Display4 model not detected");
			}

			const display5Intersects = raycaster.intersectObjects([this.display5], true);
			if(display5Intersects.length > 0) {
				console.log("Clicked on the display4 model");
				this.showChatBox("炉器是古代中国非常重要的铜器之一，它们不仅在日常生活中被用于取暖和烹饪，还在宗教仪式和宫廷礼仪中发挥着重要作用。炉器通常由青铜制成，设计精美，功能多样。这些古代炉器不仅展示了古代工匠们精湛的铸造技艺，还常常装饰着各种纹饰和图案，如龙、凤、云纹等，这些图案不仅美观，还蕴含着深刻的文化内涵和宗教象征。在古代社会中，炉器不仅是日常生活中的必需品，更是象征着家庭繁荣和权力的象征。它们常被视为贵族家庭的珍贵藏品，也常常被用于皇宫和宗庙中，作为祭祀仪式中的重要神器。");
			} else {
				console.log("Display5 model not detected");
			}

			const display6Intersects = raycaster.intersectObjects([this.display6], true);
			if(display6Intersects.length > 0) {
				console.log("Clicked on the display6 model");
				this.showChatBox("青花瓷是中国古代著名的陶瓷品种，以其独特的青花装饰而闻名。这些瓷器通常是白色瓷胎，表面绘有青色的花卉、人物或景观图案，这些图案通过钴石在釉下绘制而成。青花瓷器以其精美的工艺和深厚的文化底蕴而备受推崇。它们不仅在中国，还在世界各地被视为艺术珍品。青花瓷既是日常生活中的实用品，也是贵族收藏和文化交流的重要载体。每一件青花瓷都是陶瓷艺术家们精心设计和制作的结晶。从唐宋时期的初步发展到元明清时期的鼎盛，青花瓷在中国陶瓷史上占据着重要地位，反映了不同历史时期的审美趣味和制作技艺。");
			} else {
				console.log("Display6 model not detected");
			}
	
			// Check if chat panel is visible
			if (chat.style.bottom === '0px' && window.innerHeight - event.clientY > 40) {
				console.log("onMouseDown: No player found");
				if (this.speechBubble.mesh.parent !== null) {
					this.speechBubble.mesh.parent.remove(this.speechBubble.mesh);
				}
				delete this.speechBubble.player;
				delete this.chatSocketId;
				chat.style.bottom = '-40px';
				this.activeCamera = this.cameras.back;
			} else {
				console.log("onMouseDown: typing");
			}

		}
	}
	
	getRemotePlayerById(id){
		if (this.remotePlayers===undefined || this.remotePlayers.length==0) return;
		
		const players = this.remotePlayers.filter(function(player){
			if (player.id == id) return true;
		});	
		
		if (players.length==0) return;
		
		return players[0];
	}
	
	animate() {

		const game = this;
		const dt = this.clock.getDelta();
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		this.updateRemotePlayers(dt);
		
		if (this.player.mixer!=undefined && this.mode==this.modes.ACTIVE) this.player.mixer.update(dt);
		
		if (this.player.action=='Walking'){
			const elapsedTime = Date.now() - this.player.actionTime;
			if (elapsedTime>1000 && this.player.motion.forward>0){
				this.player.action = 'Running';
			}
		}
		
		if (this.player.motion !== undefined) this.player.move(dt);
		
		if (this.cameras!=undefined && this.cameras.active!=undefined && this.player!==undefined && this.player.object!==undefined){
			this.camera.position.lerp(this.cameras.active.getWorldPosition(new THREE.Vector3()), 0.05);
			const pos = this.player.object.position.clone();
			if (this.cameras.active==this.cameras.chat){
				pos.y += 200;
			}else{
				pos.y += 300;
			}
			this.camera.lookAt(pos);

			// 更新导游模型的位置
			if (this.guide !== undefined) {
				const guideOffset = new THREE.Vector3(200, -30, 0); // 设置导游模型的偏移量
    			const guidePosition = pos.clone().add(guideOffset);
    			this.guide.position.copy(guidePosition);
			}
		}
		
		if (this.sun !== undefined){
			this.sun.position.copy( this.camera.position );
			this.sun.position.y += 10;
		}
		
		if (this.speechBubble!==undefined) this.speechBubble.show(this.camera.position);
		
		this.renderer.render( this.scene, this.camera );
	}
}

class Player{
	constructor(game, options){
		this.local = true;
		let model, colour;
		
		const colours = ['Black', 'Brown', 'White'];
		colour = colours[Math.floor(Math.random()*colours.length)];
									
		if (options===undefined){
			const people = ['BeachBabe', 'BusinessMan', 'Doctor', 'FireFighter', 'Housewife', 'Policeman', 'Prostitute', 'Punk', 'RiotCop', 'Roadworker', 'Robber', 'Sheriff', 'Streetman', 'Waitress'];
			model = people[Math.floor(Math.random()*people.length)];
		}else if (typeof options =='object'){
			this.local = false;
			this.options = options;
			this.id = options.id;
			model = options.model;
			colour = options.colour;
		}else{
			model = options;
		}
		this.model = model;
		this.colour = colour;
		this.game = game;
		this.animations = this.game.animations;
		
		const loader = new THREE.FBXLoader();
		const player = this;
		
		loader.load( `${game.assetsPath}fbx/people/${model}.fbx`, function ( object ) {

			object.mixer = new THREE.AnimationMixer( object );
			player.root = object;
			player.mixer = object.mixer;
			
			object.name = "Person";
					
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = true;		
				}
			} );
			
			
			const textureLoader = new THREE.TextureLoader();
			
			textureLoader.load(`${game.assetsPath}images/SimplePeople_${model}_${colour}.png`, function(texture){
				object.traverse( function ( child ) {
					if ( child.isMesh ){
						child.material.map = texture;
					}
				} );
			});
			
			player.object = new THREE.Object3D();
			//player.object.position.set(3122, 0, -173);
			player.object.position.set(3070, 30, 10);

			player.object.rotation.set(0, 2.6, 0);
			
			player.object.add(object);
			if (player.deleted===undefined) game.scene.add(player.object);
			
			if (player.local){
				game.createCameras();
				game.sun.target = game.player.object;
				game.animations.Idle = object.animations[0];
				if (player.initSocket!==undefined) player.initSocket();
			}else{
				const geometry = new THREE.BoxGeometry(100,300,100);
				const material = new THREE.MeshBasicMaterial({visible:false});
				const box = new THREE.Mesh(geometry, material);
				box.name = "Collider";
				box.position.set(0, 150, 0);
				player.object.add(box);
				player.collider = box;
				player.object.userData.id = player.id;
				player.object.userData.remotePlayer = true;
				const players = game.initialisingPlayers.splice(game.initialisingPlayers.indexOf(this), 1);
				game.remotePlayers.push(players[0]);
			}
			
			if (game.animations.Idle!==undefined) player.action = "Idle";
		} );
	}
	
	set action(name){
		//Make a copy of the clip if this is a remote player
		if (this.actionName == name) return;
		const clip = (this.local) ? this.animations[name] : THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(this.animations[name])); 
		const action = this.mixer.clipAction( clip );
        action.time = 0;
		this.mixer.stopAllAction();
		this.actionName = name;
		this.actionTime = Date.now();
		
		action.fadeIn(0.5);	
		action.play();
	}
	
	get action(){
		return this.actionName;
	}
	
	update(dt){
		this.mixer.update(dt);
		
		if (this.game.remoteData.length>0){
			let found = false;
			for(let data of this.game.remoteData){
				if (data.id != this.id) continue;
				//Found the player
				this.object.position.set( data.x, data.y, data.z );
				const euler = new THREE.Euler(data.pb, data.heading, data.pb);
				this.object.quaternion.setFromEuler( euler );
				this.action = data.action;
				found = true;
			}
			if (!found) this.game.removePlayer(this);
		}
	}
}

class PlayerLocal extends Player{
	constructor(game, model){
		super(game, model);
		
		const player = this;
		const socket = io.connect();
		socket.on('setId', function(data){
			player.id = data.id;
		});
		socket.on('remoteData', function(data){
			game.remoteData = data;
		});
		socket.on('deletePlayer', function(data){
			const players = game.remotePlayers.filter(function(player){
				if (player.id == data.id){
					return player;
				}
			});
			if (players.length>0){
				let index = game.remotePlayers.indexOf(players[0]);
				if (index!=-1){
					game.remotePlayers.splice( index, 1 );
					game.scene.remove(players[0].object);
				}
            }else{
                index = game.initialisingPlayers.indexOf(data.id);
                if (index!=-1){
                    const player = game.initialisingPlayers[index];
                    player.deleted = true;
                    game.initialisingPlayers.splice(index, 1);
                }
			}
		});
        
		socket.on('chat message', function(data){
			document.getElementById('chat').style.bottom = '0px';
			const player = game.getRemotePlayerById(data.id);
			game.speechBubble.player = player;
			game.chatSocketId = player.id;
			game.activeCamera = game.cameras.chat;
			game.speechBubble.update(data.message);
		});
        
		$('#msg-form').submit(function(e){
			socket.emit('chat message', { id:game.chatSocketId, message:$('#m').val() });
			$('#m').val('');
			return false;
		});
		
		this.socket = socket;
	}
	
	initSocket(){
		//console.log("PlayerLocal.initSocket");
		this.socket.emit('init', { 
			model:this.model, 
			colour: this.colour,
			x: this.object.position.x,
			y: this.object.position.y,
			z: this.object.position.z,
			h: this.object.rotation.y,
			pb: this.object.rotation.x
		});
	}
	
	updateSocket(){
		if (this.socket !== undefined){
			//console.log(`PlayerLocal.updateSocket - rotation(${this.object.rotation.x.toFixed(1)},${this.object.rotation.y.toFixed(1)},${this.object.rotation.z.toFixed(1)})`);
			this.socket.emit('update', {
				x: this.object.position.x,
				y: this.object.position.y,
				z: this.object.position.z,
				h: this.object.rotation.y,
				pb: this.object.rotation.x,
				action: this.action
			})
		}
	}
	
	move(dt){
		const pos = this.object.position.clone();
		pos.y += 60;
		let dir = new THREE.Vector3();
		this.object.getWorldDirection(dir);
		if (this.motion.forward<0) dir.negate();
		let raycaster = new THREE.Raycaster(pos, dir);
		let blocked = false;
		const colliders = this.game.colliders;
	
		if (colliders!==undefined){ 
			const intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				if (intersect[0].distance<50) blocked = true;
			}
		}
		
		if (!blocked){
			if (this.motion.forward>0){
				const speed = (this.action=='Running') ? 1500 : 150;
				this.object.translateZ(dt*speed);
			}else{
				this.object.translateZ(-dt*30);
			}
		}
		
		if (colliders!==undefined){
			//cast left
			dir.set(-1,0,0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			let intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				if (intersect[0].distance<50) this.object.translateX(100-intersect[0].distance);
			}
			
			//cast right
			dir.set(1,0,0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				if (intersect[0].distance<50) this.object.translateX(intersect[0].distance-100);
			}
			
			//cast down
			dir.set(0,-1,0);
			pos.y += 200;
			raycaster = new THREE.Raycaster(pos, dir);
			const gravity = 30;

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				const targetY = pos.y - intersect[0].distance;
				if (targetY > this.object.position.y){
					//Going up
					this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
					this.velocityY = 0;
				}else if (targetY < this.object.position.y){
					//Falling
					if (this.velocityY==undefined) this.velocityY = 0;
					this.velocityY += dt * gravity;
					this.object.position.y -= this.velocityY;
					if (this.object.position.y < targetY){
						this.velocityY = 0;
						this.object.position.y = targetY;
					}
				}
			}
		}
		
		this.object.rotateY(this.motion.turn*dt);
		
		this.updateSocket();
	}
}

class SpeechBubble{
	constructor(game, msg, size=1){
		this.config = { font:'Calibri', size:24, padding:10, colour:'#222', width:256, height:256 };
		
		const planeGeometry = new THREE.PlaneGeometry(size, size);
		const planeMaterial = new THREE.MeshBasicMaterial()
		this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
		game.scene.add(this.mesh);
		
		const self = this;
		const loader = new THREE.TextureLoader();
		loader.load(
			// resource URL
			`${game.assetsPath}images/speech.png`,

			// onLoad callback
			function ( texture ) {
				// in this example we create the material when the texture is loaded
				self.img = texture.image;
				self.mesh.material.map = texture;
				self.mesh.material.transparent = true;
				self.mesh.material.needsUpdate = true;
				if (msg!==undefined) self.update(msg);
			},

			// onProgress callback currently not supported
			undefined,

			// onError callback
			function ( err ) {
				console.error( 'An error happened.' );
			}
		);
	}
	
	update(msg){
		if (this.mesh===undefined) return;
		
		let context = this.context;
		
		if (this.mesh.userData.context===undefined){
			const canvas = this.createOffscreenCanvas(this.config.width, this.config.height);
			this.context = canvas.getContext('2d');
			context = this.context;
			context.font = `${this.config.size}pt ${this.config.font}`;
			context.fillStyle = this.config.colour;
			context.textAlign = 'center';
			this.mesh.material.map = new THREE.CanvasTexture(canvas);
		}
		
		const bg = this.img;
		context.clearRect(0, 0, this.config.width, this.config.height);
		context.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, this.config.width, this.config.height);
		this.wrapText(msg, context);
		
		this.mesh.material.map.needsUpdate = true;
	}
	
	createOffscreenCanvas(w, h) {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}
	
	wrapText(text, context){
		const words = text.split(' ');
        let line = '';
		const lines = [];
		const maxWidth = this.config.width - 2*this.config.padding;
		const lineHeight = this.config.size + 8;
		
		words.forEach( function(word){
			const testLine = `${line}${word} `;
        	const metrics = context.measureText(testLine);
        	const testWidth = metrics.width;
			if (testWidth > maxWidth) {
				lines.push(line);
				line = `${word} `;
			}else {
				line = testLine;
			}
		});
		
		if (line != '') lines.push(line);
		
		let y = (this.config.height - lines.length * lineHeight)/2;
		
		lines.forEach( function(line){
			context.fillText(line, 128, y);
			y += lineHeight;
		});
	}
	
	show(pos){
		if (this.mesh!==undefined && this.player!==undefined){
			this.mesh.position.set(this.player.object.position.x, this.player.object.position.y + 380, this.player.object.position.z);
			this.mesh.lookAt(pos);
		}
	}
}