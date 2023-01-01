//api variables
const serverloc = '<CLIENT_HOST>';
var tok_timerid = null;

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
				if (tok_timerid) {
					clearInterval(tok_timerid);
				}
				tok_timerid = setInterval(function () {
					refreshAccessToken();
				}, 240 * 1000);
			} else {
				console.log('login has failed');
				alert('login has failed');
				accesstoken = '';
			}
			$('#login-username').val('');
			$('#login-password').val('');
			enableLogoutRomSaveQuickServermenuNodes();
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			if (XMLHttpRequest.readyState == 0) {
				// Network error (i.e. connection refused, access denied due to CORS, etc.)
				if (!navigator.onLine) {
					console.log('login request has failed..no connect..');
					//we should be able to get these from cache provided its populated
					offlineEnableRomSaveServermenuNodes();
					accesstoken = 'offline_first_dummy';
				} else {
					console.log('login has failed');
					alert('login has failed');
				}
			} else {
				// something weird is happening
				console.log('login request has failed');
				alert('login request has failed');
			}
			$('#login-username').val('');
			$('#login-password').val('');
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
				accesstoken = '';
			} else {
				console.log('logout has failed');
				alert('logout has failed');
			}
			if (tok_timerid) {
				clearInterval(tok_timerid);
			}
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			console.log('unable to reach server, logout failed');
			alert('unable to reach server, logout failed');
		}
	});
}

function loadRomFromServer(query_select_rom) {
	if (!checkAccessTok()) {
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', serverloc + '/api/rom/download?rom=' + query_select_rom);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accesstoken);
	xhr.responseType = 'blob';

	xhr.onload = function () {
		if (xhr.status == 200) {
			localStorage.setItem('current-loaded-rom-filename', query_select_rom)
			run(xhr.response, true);
		} else {
			console.log(
				'Your fetch has failed, please check with your server owner'
			);
			alert('Your fetch has failed, please check with your server owner');
		}
	};
	xhr.send();
}

function loadSaveFromServer(query_select_save) {
	if (!checkAccessTok()) {
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', serverloc + '/api/save/download?save=' + query_select_save);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accesstoken);
	xhr.responseType = 'blob';

	xhr.onload = function () {
		if (xhr.status == 200) {
			localStorage.setItem('current-loaded-save-filename', query_select_save);
			uploadSavedataPending(xhr.response);
		} else {
			console.log(
				'Your fetch has failed, please check with your server owner'
			);
			alert('Your fetch has failed, please check with your server owner');
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
			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
				console.log('unable to reach server, upload rom failed');
				alert('unable to reach server, upload rom failed');
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
			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
				console.log('unable to reach server, upload save failed');
				alert('unable to reach server, upload save failed');
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
				if (tok_timerid) {
					clearInterval(tok_timerid);
				}
				tok_timerid = setInterval(function () {
					refreshAccessToken();
				}, 240 * 1000);
				if (initialLoad) {
					initialParamRomandSave();
					initialLoad = false;
				}
				enableLogoutRomSaveQuickServermenuNodes();
			} else {
				console.log('refresh token has failed');
				accesstoken = '';
			}
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			if (XMLHttpRequest.readyState == 0) {
				// Network error (i.e. connection refused, access denied due to CORS, etc.)
				if (!navigator.onLine) {
					console.log('refresh request has failed..no connect..');
					//we should be able to get these from cache provided its populated
					if (initialLoad) {
						initialParamRomandSave();
						initialLoad = false;
					}
					offlineEnableRomSaveServermenuNodes();
					accesstoken = 'offline_first_dummy';
				}
			} else {
				// something weird is happening
				console.log('refersh request has failed');
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
							loadRomFromServer($(this).text());
						})
						.appendTo('#romlist');
				});
			} else {
				console.log('list server roms has failed');
				alert('list server roms has failed');
			}
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			console.log('unable to reach server, rom list failed');
			alert('unable to reach server, rom list failed');
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
							loadSaveFromServer($(this).text());
						})
						.appendTo('#savelist');
				});
			} else {
				console.log('list server saves has failed');
				alert('list server saves has failed');
			}
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			console.log('unable to reach server, save list failed');
			alert('unable to reach server, save list failed');
		}
	});
}
