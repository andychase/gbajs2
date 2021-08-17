gbajs2-mobile -- mobile porting version
======

This be forked from gbajs2 that remake to play in mobile device ( safari ) and access from outside.
======

## Preparations
* Install npm and command `npm i` to prepare server environment.
* Generate certs by `openssl req -nodes -new -x509 -keyout server.key -out server.cert` and move that files to `cert/`.
* Prepare some rom file to `roms/`.
* Write `private ip address` in `index.html` file.

## Feature List
* Available in Mobile Broswer
* Save & Load stat
* Server with DB
* Test workspace ( mobile safari, mobile chrome )

gbajs2 -- Community Fork
======

gbajs2 is a Game Boy Advance emulator written in Javascript from scratch using HTML5 technologies like Canvas and Web Audio. 
It is freely licensed and works in any modern browser without plugins.

Use it online! <https://andychase.me/gbajs2>

See the [issues page](https://github.com/andychase/gbajs2/issues) for feature suggestions and ways you can help contribute!

Mailing list for general discussion or if you want to just be kept in the loop: https://groups.google.com/forum/#!forum/gbajs2

## Feature List

* Playable compatibility, see [compatibility](https://github.com/andychase/gbajs2/wiki/Compatibility-List)
* Acceptable performance on modern browsers
* Pure javascript, allowing easy API access
* Realtime clock gamepad support (Pokemon Ruby)
* Save games

## License
Original work by Endrift. Repo: (Archived / No longer maintained) https://github.com/endrift/gbajs

Copyright © 2012 – 2013, Jeffrey Pfau
Copyright © 2020, Andrew Chase
Copyright © 2020, keicoon15

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
