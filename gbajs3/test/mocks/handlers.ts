import { HttpResponse, delay, http } from 'msw';

export const gbaServerLocationPlaceholder = 'https://server_location.test';

export const handlers = [
  http.post(`${gbaServerLocationPlaceholder}/api/tokens/refresh`, () => {
    return HttpResponse.json('', { status: 401 });
  }),

  http.post(`${gbaServerLocationPlaceholder}/api/account/logout`, () => {
    return HttpResponse.json(null, { status: 200 });
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
        await delay();

        return new HttpResponse(`test ${romName} rom`, {
          headers: {
            'Content-Type': 'applcation/octet-stream'
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
        await delay();

        return new HttpResponse(`test ${saveName} save`, {
          headers: {
            'Content-Type': 'applcation/octet-stream'
          }
        });
      } else {
        return new HttpResponse(null, { status: 400 });
      }
    }
  ),

  http.post(`${gbaServerLocationPlaceholder}/api/account/login`, async () => {
    await delay();

    return HttpResponse.json('some token', { status: 200 });
  }),

  http.post(`${gbaServerLocationPlaceholder}/api/rom/upload`, async () => {
    await delay();

    return new HttpResponse(null, { status: 200 });
  }),

  http.post(`${gbaServerLocationPlaceholder}/api/save/upload`, async () => {
    await delay();

    return new HttpResponse(null, { status: 200 });
  })
];
