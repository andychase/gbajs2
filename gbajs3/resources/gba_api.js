function login() {
	$.ajax({
		url: 'https://127.0.0.1/api/account/login',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({
			username: $('#login-username').val(),
			password: $('#login-password').val()
		}),
		xhrFields: {
			withCredentials: true
		},
		success: function (result, teststatus, resp) {
			if (resp.status == 200) {
				console.log('login successful');
				accesstoken = result.slice(1, -2); //strip quotes/line feed
			} else {
				console.log('login has failed');
			}
			$('#login-username').val('');
			$('#login-password').val('');
		}
	});
}

function logout() {
	$.ajax({
		url: 'https://127.0.0.1/api/account/logout',
		type: 'POST',
		headers: {
			Authorization: 'Bearer ' + accesstoken
		},
		success: function (result) {
			if (result.status == 200) {
				console.log('logout successful');
			} else {
				console.log('logout has failed');
			}
		}
	});
}

function loadRomFromServer() {
	var xhr = new XMLHttpRequest();
	xhr.open(
		'GET',
		'https://127.0.0.1/api/rom/download?rom=' + query_select_rom
	);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accesstoken);
	xhr.responseType = 'blob';

	xhr.onload = function () {
		if (xhr.status == 200) {
			run(xhr.response);
		} else {
			console.log(
				'Your fetch has failed, please check with your server owner'
			);
		}
	};
	xhr.send();
}

function loadSaveFromServer() {
	var xhr = new XMLHttpRequest();
	xhr.open(
		'GET',
		'https://127.0.0.1/api/save/download?save=' + query_select_save
	);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accesstoken);
	xhr.responseType = 'blob';

	xhr.onload = function () {
		if (xhr.status == 200) {
			uploadSavedataPending(xhr.response);
		} else {
			console.log(
				'Your fetch has failed, please check with your server owner'
			);
		}
	};
	xhr.send();
}

function uploadRomToServer() {
	var files = $('#loader')[0].files;
	if (files.length > 0) {
		var fd = new FormData();
		fd.append('rom', files[0]);

		$.ajax({
			url: 'https://127.0.0.1/api/rom/upload',
			type: 'post',
			data: fd,
			headers: {
				Authorization: 'Bearer ' + accesstoken
			},
			contentType: false,
			processData: false,
			success: function (result, teststatus, resp) {
				if (resp.status == 200) {
					console.log('upload rom has succeeded');
				} else {
					alert('upload rom has failed');
					console.log('upload rom has failed');
				}
			}
		});
	}
}

function uploadSaveToServer() {
	var files = $('#saveloader')[0].files;
	if (files.length > 0) {
		var fd = new FormData();
		fd.append('rom', files[0]);

		$.ajax({
			url: 'https://127.0.0.1/api/save/upload',
			type: 'post',
			data: fd,
			headers: {
				Authorization: 'Bearer ' + accesstoken
			},
			contentType: false,
			processData: false,
			success: function (result, teststatus, resp) {
				if (resp.status == 200) {
					console.log('upload save has succeeded');
				} else {
					alert('upload save has failed');
					console.log('upload save has failed');
				}
			}
		});
	}
}

function refreshAccessToken() {
	$.ajax({
		url: 'https://127.0.0.1/api/tokens/refresh',
		type: 'POST',
		xhrFields: {
			withCredentials: true
		},
		success: function (result, teststatus, resp) {
			if (resp.status == 200) {
				accesstoken = result.slice(1, -2);
				initialParamRomandSave();
			} else {
				console.log('refresh token has failed');
			}
		}
	});
}
