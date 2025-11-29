import jwt from 'jsonwebtoken';
import { HttpResponse, delay, http } from 'msw';

export const gbaServerLocationPlaceholder = 'https://server_location.test';
export const testRomLocation = 'https://rom_location.test';

const generateMockJwt = () =>
  jwt.sign({}, 'test-fake-key', { expiresIn: '1s' });

export const handlers = [
  http.post(`${gbaServerLocationPlaceholder}/api/tokens/refresh`, () => {
    return new HttpResponse(null, { status: 401 });
  }),

  http.post(`${gbaServerLocationPlaceholder}/api/account/logout`, () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${gbaServerLocationPlaceholder}/api/rom/list`, () => {
    return HttpResponse.json(['rom1.gba', 'rom2.gba'], { status: 200 });
  }),

  http.get(
    `${gbaServerLocationPlaceholder}/api/rom/download`,
    async ({ request }) => {
      const url = new URL(request.url);
      const romName = url.searchParams.get('rom');

      if (romName) {
        await delay(100);

        return new HttpResponse(`test ${romName} rom`, {
          headers: {
            'Content-Type': 'application/x-gba-rom'
          }
        });
      } else {
        return new HttpResponse(null, { status: 400 });
      }
    }
  ),

  http.get(`${gbaServerLocationPlaceholder}/api/save/list`, () => {
    return HttpResponse.json(['save1.sav', 'save2.sav'], { status: 200 });
  }),

  http.get(
    `${gbaServerLocationPlaceholder}/api/save/download`,
    async ({ request }) => {
      const url = new URL(request.url);
      const saveName = url.searchParams.get('save');

      if (saveName) {
        await delay(100);

        return new HttpResponse(`test ${saveName} save`, {
          headers: {
            'Content-Type': 'application/octet-stream'
          }
        });
      } else {
        return new HttpResponse(null, { status: 400 });
      }
    }
  ),

  http.post(
    `${gbaServerLocationPlaceholder}/api/account/login`,
    async ({ request }) => {
      const data = (await request.json()) as {
        username?: string;
        password?: string;
      };
      const isValidUser =
        data.username?.startsWith('valid') &&
        data.password?.startsWith('valid');

      await delay(100);

      if (isValidUser) {
        return HttpResponse.json(generateMockJwt(), {
          status: 200
        });
      } else {
        return new HttpResponse(null, { status: 401 });
      }
    }
  ),

  http.post(
    `${gbaServerLocationPlaceholder}/api/rom/upload`,
    async ({ request }) => {
      const formData = await request.formData();
      const rom = formData.get('rom') as File;
      const romName = rom.name;

      await delay(100);

      return new HttpResponse(null, { status: romName == '400' ? 400 : 200 });
    }
  ),

  http.post(
    `${gbaServerLocationPlaceholder}/api/save/upload`,
    async ({ request }) => {
      const formData = await request.formData();
      const save = formData.get('save') as File;
      const saveName = save.name;

      await delay(100);

      return new HttpResponse(null, { status: saveName == '400' ? 400 : 200 });
    }
  ),

  http.get(`${testRomLocation}/good_rom.gba`, async () => {
    await delay(100);

    return new HttpResponse(`test external rom`, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
  }),

  http.get(`${testRomLocation}/bad_rom.gba`, async () => {
    await delay(100);

    return new HttpResponse(null, { status: 400 });
  })
];
