const serverloc = 'https://127.0.0.1';

function checkAccessTok() {
	if (accesstoken !== null && accesstoken !== '') {
		return true;
	}
	return false;
}

function login() {
	$.ajax({
		url: serverloc + '/api/account/login',
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
				accesstoken = '';
			}
			$('#login-username').val('');
			$('#login-password').val('');
			enableLogoutRomSaveServermenuNodes();
		}
	});
}

function logout() {
	if (!checkAccessTok()) {
		return;
	}
	$.ajax({
		url: serverloc + '/api/account/logout',
		type: 'POST',
		headers: {
			Authorization: 'Bearer ' + accesstoken
		},
		xhrFields: {
			withCredentials: true
		},
		success: function (result, teststatus, resp) {
			if (resp.status == 200) {
				console.log('logout successful');
				disableLogoutRomSaveServermenuNodes();
			} else {
				console.log('logout has failed');
			}
		}
	});
}

function loadRomFromServer() {
	if (!checkAccessTok()) {
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', serverloc + '/api/rom/download?rom=' + query_select_rom);
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
	if (!checkAccessTok()) {
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', serverloc + '/api/save/download?save=' + query_select_save);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accesstoken);
	xhr.responseType = 'blob';

	xhr.onload = function () {
		if (xhr.status == 200) {
			current_loaded_save_filename = query_select_save;
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
	if (!checkAccessTok()) {
		return;
	}
	var files = $('#loader')[0].files;
	if (files.length > 0) {
		var fd = new FormData();
		fd.append('rom', files[0]);

		$.ajax({
			url: serverloc + '/api/rom/upload',
			type: 'post',
			data: fd,
			headers: {
				Authorization: 'Bearer ' + accesstoken
			},
			contentType: false,
			processData: false,
			success: function (result, teststatus, resp) {
				if (resp.status == 200) {
					alert('upload rom has succeeded');
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
	if (!checkAccessTok()) {
		return;
	}
	var files = $('#saveloader')[0].files;
	if (files.length > 0) {
		var fd = new FormData();
		fd.append('save', files[0]);

		$.ajax({
			url: serverloc + '/api/save/upload',
			type: 'post',
			data: fd,
			headers: {
				Authorization: 'Bearer ' + accesstoken
			},
			contentType: false,
			processData: false,
			success: function (result, teststatus, resp) {
				if (resp.status == 200) {
					alert('upload save has succeeded');
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
		url: serverloc + '/api/tokens/refresh',
		type: 'POST',
		xhrFields: {
			withCredentials: true
		},
		success: function (result, teststatus, resp) {
			if (resp.status == 200) {
				accesstoken = result.slice(1, -2);
				if (initialLoad) {
					initialParamRomandSave();
					initialLoad = false;
				}
				enableLogoutRomSaveServermenuNodes();
			} else {
				console.log('refresh token has failed');
				accesstoken = '';
			}
		}
	});
}

function loadRomList() {
	if (!checkAccessTok()) {
		return;
	}
	$.ajax({
		url: serverloc + '/api/rom/list',
		type: 'GET',
		headers: {
			Authorization: 'Bearer ' + accesstoken
		},
		success: function (result, teststatus, resp) {
			if (resp.status == 200) {
				//attach to open modal
				$('#romlist > button').remove();
				$(result).each(function (index, romname) {
					$(
						'<button type="button" class="list-group-item list-group-item-action" data-bs-dismiss="modal">' +
							romname +
							'</button>'
					)
						.click(function () {
							query_select_rom = $(this).text();
							loadRomFromServer();
						})
						.appendTo('#romlist');
				});
			} else {
				console.log('list server roms has failed');
			}
		}
	});
}

function loadSaveList() {
	if (!checkAccessTok()) {
		return;
	}
	$.ajax({
		url: serverloc + '/api/save/list',
		type: 'GET',
		headers: {
			Authorization: 'Bearer ' + accesstoken
		},
		success: function (result, teststatus, resp) {
			if (resp.status == 200) {
				//attach to open modal
				$('#savelist > button').remove();
				$(result).each(function (index, savename) {
					$(
						'<button type="button" class="list-group-item list-group-item-action" data-bs-dismiss="modal">' +
							savename +
							'</button>'
					)
						.click(function () {
							query_select_save = $(this).text();
							loadSaveFromServer();
						})
						.appendTo('#savelist');
				});
			} else {
				console.log('list server roms has failed');
			}
		}
	});
}
