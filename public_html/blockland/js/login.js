//feather.replace();

//先定义几个提示信息,方便后续操作
let str1 = "<p style='font-size:13px;font-family: 微软雅黑,serif;color: red;'>用户名不能为空</p>";
let str2 = "<p style='font-size:13px;font-family: 微软雅黑,serif;color: red;'>请输入密码</p>";
let str3 = "<p style='font-size:13px;font-family: 微软雅黑,serif;color: red;'>密码长度必须大于等于6位</p>";
let str4 = "<p style='font-size:13px;font-family: 微软雅黑,serif;color: red;'>密码不一致</p>";
let str5 = "<p style='font-size:13px;font-family: 微软雅黑,serif;color: red;'>邮箱格式不对</p>";

//登录界面的用户名验证，用户名不能为空，并加入提示信息
function loginuser() {
	
	let a = 0;
	let str = " ";
	let longintxt = document.getElementsByClassName("yanzhengtxt")[0];
	let userfocus1 = document.getElementsByClassName("focus-input")[0].style;
	let username = document.getElementsByName("username")[0].value;
	if (username.length === 0) {
		userfocus1.background = "red";
		str += str1;
	} else {
		userfocus1.background = "#7f7f7f";
		str = "   ";
		a = 1;
	}
	longintxt.innerHTML = str;
	return a === 1;
}

//登录界面的密码验证，密码不能为空，并加入提示信息
function loginpass() {
	let a = 0;
	let str = " ";
	let longintxt = document.getElementsByClassName("yanzhengtxt")[0];
	let passfocus1 = document.getElementsByClassName("focus-input")[1].style;
	let pass = document.getElementsByName("pass")[0].value;
	if (pass.length === 0) {
		passfocus1.background = "red";
		str += str2;
	} else {
		passfocus1.background = "#7f7f7f";
		str = "   ";
		a = 1;
	}
	longintxt.innerHTML = str;
	return a === 1;
}

//注册界面的用户名验证，用户名不能为空，并加入提示信息
function reguser() {
	let a = 0;
	let str = " ";
	let regtxt = document.getElementsByClassName("yanzhengtxt")[1];
	let userfocus2 = document.getElementsByClassName("focus-input")[2].style;
	let username = document.getElementsByName("username")[1].value;
	if (username.length === 0) {
		userfocus2.background = "red";
		str += str1;
	} else {
		userfocus2.background = "#7f7f7f";
		str = "   ";
		a = 1;
	}
	regtxt.innerHTML = str;
	return a === 1;
}

//注册界面的密码验证，密码得大于6位，并加入提示信息
function regpass1() {
	let a = 0;
	let str = " ";
	let regtxt = document.getElementsByClassName("yanzhengtxt")[1];
	let passfocus2 = document.getElementsByClassName("focus-input")[3].style;
	let pass = document.getElementsByName("pass")[1].value;
	if (pass.length < 6) {
		passfocus2.background = "red";
		str += str3;
	} else {
		passfocus2.background = "#7f7f7f";
		str = "   ";
		a = 1;
	}
	regtxt.innerHTML = str;
	return a === 1;
}


//email
function regemail() {
	let a = 0;
	let str = " ";
	let regtxt = document.getElementsByClassName("yanzhengtxt")[1];
	let email = document.getElementsByName("email")[0].value;
	// 使用正则表达式验证邮箱格式
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		// 邮箱格式正确
		a = 1;
		str = "邮箱格式正确";
		regtxt.innerHTML = str;
		// 这里可以根据需要设置样式等操作
	} else {
		// 邮箱格式不正确
		str = "邮箱格式不正确";
		regtxt.innerHTML = str;
		// 这里可以根据需要设置样式等操作
	}
	regtxt.innerHTML = str;
	return a === 1;
}

//点击登录进行再次验证
function login(event) {
	event.preventDefault(); // 防止表单提交
	
        setTimeout('test()', 10);
    
	if (loginuser() && loginpass()) {
		console.log("1");//test
		let username = document.getElementsByName("username")[0].value;
		let email = document.getElementsByName("email")[0].value;
		let pass = document.getElementsByName("pass")[0].value;
		let data = {username: username, email:email,password: pass};
		jQuery.ajax({
			url: "../php/login.php",
			type: "POST",
			data: JSON.stringify(data),
			dataType: "json",
			success: function(response) {
			  if (response.status == "success") {
				// 登录成功
				alert("登陆成功");
				console.log("login success");
				document.cookie = "login=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
				
				document.cookie = "userId=" + response.userId + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";//userId de cookie
				window.location.href = "../index.html";
			  } else {
				// 登录失败
				console.log("login failed");
				alert("用户名不存在或密码错误！");
			  }
			},
			error: function(xhr, status, error) {
			  // 请求失败
			  console.log("请求失败：" + error);
			  alert("登录失败，请稍后再试");
			}
		  });
	  }
}

//翻转，两个div，一个div翻成一条线的时候，也就是90度的时候，然后把这个div隐藏，然后另一个div原本是隐藏的，把它显示出来，从90度开始翻出来
function fanzhuan(i) {
	let maindiv1 = document.getElementsByClassName("maindiv1")[0].style;
	let maindiv2 = document.getElementsByClassName("maindiv2")[0].style;
	if (i === 1) {
		maindiv1.animation = "donghua1 0.3s linear 1";
		setTimeout(function () {
			maindiv1.transition = "none";
			maindiv2.transition = "none";
			maindiv1.zIndex = "-1";
			maindiv2.zIndex = "1";
			maindiv1.opacity = "0";
			maindiv2.opacity = "1";
			maindiv2.animation = "donghua2 0.3s linear 1";
		}, 300)
	}
	if (i === 2) {
		maindiv2.animation = "donghua1 0.3s linear 1";
		setTimeout(function () {
			maindiv1.transition = "none";
			maindiv2.transition = "none";
			maindiv1.zIndex = "1";
			maindiv2.zIndex = "-1";
			maindiv1.opacity = "1";
			maindiv2.opacity = "0";
			maindiv1.animation = "donghua2 0.3s linear 1";
		}, 300)
	}
	maindiv1.transition = "all 0.3s";
	maindiv2.transition = "all 0.3s";
}

//点击注册后进行验证并翻转，并加入注册成功的提示信息，以及自动填充
function reg() {
	if (reguser() && regpass1() && regpass2()) {
		/*fanzhuan(2);
		let username = document.getElementsByName("username")[1].value;
		let pass = document.getElementsByName("pass")[1].value;
		setTimeout(function () {
			document.getElementsByName("username")[0].value = username;
			document.getElementsByName("pass")[0].value = pass;
			let longintxt = document.getElementsByClassName("yanzhengtxt")[0];
			longintxt.innerHTML = "<p style='font-size:13px;font-family: 微软雅黑;color: black;'>注册成功，已为你自动填充</p>";
		}, 800);*/
		let username = document.getElementsByName("username")[1].value;
		let pass = document.getElementsByName("pass")[1].value;
		let data = {username: username, password: pass};
		console.log("hi");
		let temp = 0;
		jQuery.ajax({
			url: "../php/register.php",
			type: "POST",
			data: JSON.stringify(data),
			dataType: "json",
			
			success: function(response) {
			  // 处理注册成功后的操作
			  console.log("hi");//test
			  console.log(response);//test
			  if (response.status == "success") {
				// 处理注册成功后的操作
				temp = 1;
				console.log("注册成功！");
				alert("注册成功！");
				console.log(temp);
				fanzhuan(2);

				setTimeout(function () {
					document.getElementsByName("username")[0].value = username;
					document.getElementsByName("pass")[0].value = pass;
					let longintxt = document.getElementsByClassName("yanzhengtxt")[0];
					longintxt.innerHTML = "<p style='font-size:13px;font-family: 微软雅黑,serif;color: black;'>注册成功，已为你自动填充</p>";
				}, 800);
			  } else {
				// 处理注册失败后的操作
				console.log("注册失败：" + response.message);
				alert(response.message);
				return false;
			  }
			},
			error: function(xhr, status, error) {
			  // 处理注册失败后的操作
				console.log("请求失败：" + error); // 打印错误信息
				return false;
			}
		  });

	}
	return false;
}

