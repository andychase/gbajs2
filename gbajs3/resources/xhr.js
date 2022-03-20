function loadRom(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url);
	xhr.responseType = 'arraybuffer';

	xhr.onload = function () {
		callback(xhr.response);
	};
	xhr.send();
}

//loads a rom from a user defined path
function loadLocalFile(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url);
	xhr.responseType = 'blob';

	xhr.onload = function () {
		if (xhr.status == 200) {
			callback(xhr.response);
		} else {
			console.log(
				'Your fetch has failed, please check with your server owner'
			);
		}
	};
	xhr.send();
}
