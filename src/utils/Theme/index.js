/**
 * Copyright 2018, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { isEmpty } from 'lodash';
import uuid from 'uuid';
import { remove as removeDiacritics } from 'diacritics';

import ConfigUtils from '../Config';
import { LayerRole } from '../../actions/layers';

export const getThemeById = (themes, id) => {
    for (let i = 0, n = themes.items.length; i < n; i += 1) {
        if (themes.items[i].id === id) {
            return themes.items[i];
        }
    }
    for (let i = 0, n = themes.subdirs.length; i < n; i += 1) {
        const theme = this.getThemeById(themes.subdirs[i], id);
        if (theme) {
            return theme;
        }
    }
    return null;
};

export const createThemeBackgroundLayers = (
    theme,
    themes,
    visibleLayer = null
) => {
    const bgLayers = [];
    let visibleIdx = -1;
    let defaultVisibleIdx = -1;
    const backLayers = theme.backgroundLayers || [];
    backLayers.forEach((entry) => {
        if (!entry.name) {
            return;
        }
        let bgLayer = themes.backgroundLayers.find(
            (localBgLayer) => localBgLayer.name === entry.name
        );
        if (bgLayer) {
            if (entry.visibility === true) {
                defaultVisibleIdx = bgLayers.length;
            }
            if (bgLayer.name === visibleLayer) {
                visibleIdx = bgLayers.length;
            }
            bgLayer = assign({}, bgLayer, {
                role: LayerRole.BACKGROUND,
                visibility: false,
            });
            if (bgLayer.type === 'group') {
                bgLayer.items = bgLayer.items
                    .map((item) => {
                        if (item.ref) {
                            const sublayer = themes.backgroundLayers.find(
                                (l) => l.name === item.ref
                            );
                            if (sublayer) {
                                item = assign({}, item, sublayer);
                                delete item.ref;
                            } else {
                                item = null;
                            }
                        }
                        return item;
                    })
                    .filter((x) => x);
            }
            bgLayers.push(bgLayer);
        } else {
            // eslint-disable-next-line no-console
            console.warn(`Could not find background layer ${entry.name}`);
        }
    });
    if (visibleIdx >= 0) {
        bgLayers[visibleIdx].visibility = true;
    } else if (defaultVisibleIdx >= 0 && visibleLayer !== '') {
        bgLayers[defaultVisibleIdx].visibility = true;
    }
    return bgLayers;
};

export const createThemeLayer = (
    theme,
    themes,
    role = LayerRole.THEME,
    subLayers = []
) => {
    const layer = {
        type: 'wms',
        url: theme.url,
        version: theme.version,
        visibility: true,
        expanded: theme.expanded,
        name: theme.name,
        title: theme.title,
        boundingBox: theme.bbox,
        sublayers:
            Array.isArray(subLayers) && subLayers.length
                ? subLayers
                : theme.sublayers,
        tiled: theme.tiled,
        ratio: !theme.tiled ? 1 : undefined,
        format: theme.format,
        role,
        attribution: theme.attribution,
        legendUrl: theme.legendUrl,
        printUrl: theme.printUrl,
        featureInfoUrl: theme.featureInfoUrl,
        infoFormats: theme.infoFormats,
        externalLayers: (theme.externalLayers || []).reduce((res, cur) => {
            res[cur.internalLayer] = assign(
                {},
                themes.externalLayers.find((entry) => entry.name === cur.name),
                {
                    uuid: uuid.v4(),
                    type: 'wms',
                }
            );
            res[cur.internalLayer].title =
                res[cur.internalLayer].title || res[cur.internalLayer].name;
            res[cur.internalLayer].featureInfoUrl =
                res[cur.internalLayer].featureInfoUrl ||
                res[cur.internalLayer].url;
            res[cur.internalLayer].queryLayers =
                res[cur.internalLayer].queryLayers ||
                res[cur.internalLayer].params.LAYERS.split(',');
            return res;
        }, {}),
    };
    // Drawing order only makes sense if layer reordering is disabled
    if (ConfigUtils.getConfigProp('allowReorderingLayers', theme) !== true) {
        layer.drawingOrder = theme.drawingOrder;
    }
    return layer;
};

export const searchThemeGroup = (themeGroup, filter) => {
    const matches = [];
    (themeGroup.subdirs || []).map((subdir) =>
        matches.push(...searchThemeGroup(subdir, filter))
    );
    matches.push(
        ...(themeGroup.items || []).filter((item) => {
            return (
                removeDiacritics(item.title).match(filter) ||
                removeDiacritics(item.keywords).match(filter) ||
                removeDiacritics(item.abstract).match(filter)
            );
        })
    );
    return matches;
};

export const searchThemes = (themes, searchtext, resultType) => {
    const filter = new RegExp(
        removeDiacritics(searchtext).replace(
            // eslint-disable-next-line no-useless-escape
            /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
            '\\$&'
        ),
        'i'
    );
    const matches = searchThemeGroup(themes, filter);
    return isEmpty(matches)
        ? []
        : [
              {
                  id: 'themes',
                  titlemsgid: 'search.themes',
                  priority: -1,
                  items: matches.map((theme) => ({
                      type: resultType,
                      id: theme.id,
                      text: theme.title,
                      theme,
                      thumbnail: `${ConfigUtils.getConfigProp('assetsPath')}/${
                          theme.thumbnail
                      }`,
                  })),
              },
          ];
};
