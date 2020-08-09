export const OpenStreetMap = {
  url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  options: {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  variants: {
    Mapnik: {},
    BlackAndWhite: {
      url: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
      options: {
        maxZoom: 18,
      },
    },
    DE: {
      url: 'http://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
      options: {
        maxZoom: 18,
      },
    },
    France: {
      url: 'http://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; Openstreetmap France | {attribution.OpenStreetMap}',
      },
    },
    HOT: {
      url: 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      options: {
        attribution: '{attribution.OpenStreetMap}, Tiles courtesy of <a href="http://hot.openstreetmap.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
      },
    },
  },
};
