/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import { isEmpty, isEqual } from 'lodash';
import uuid from 'uuid';
import url from 'url';
import { getConfigProp } from '../Config';
import { LayerRole } from '../../actions/layers';

export const collectWMSSublayerParams = (
    sublayer,
    layerNames,
    opacities,
    queryable,
    visibilities
) => {
    const visibility =
        sublayer.visibility === undefined ? true : sublayer.visibility;
    if (visibility || visibilities) {
        if (!isEmpty(sublayer.sublayers)) {
            // Is group
            sublayer.sublayers.forEach((mapped) => {
                collectWMSSublayerParams(
                    mapped,
                    layerNames,
                    opacities,
                    queryable,
                    visibilities
                );
            });
        } else {
            layerNames.push(sublayer.name);
            opacities.push(
                Number.isInteger(sublayer.opacity) ? sublayer.opacity : 255
            );
            if (sublayer.queryable) {
                queryable.push(sublayer.name);
            }
            if (visibilities) {
                visibilities.push(visibility);
            }
        }
    }
};

export const buildWMSLayerParams = (layer) => {
    // Handle QGIS Server setups without rewrite rule
    const { query } = url.parse(layer.url, true);

    if (!Array.isArray(layer.sublayers)) {
        return {
            params: assign({}, layer.params || { LAYERS: layer.name }, {
                MAP: query.map || query.MAP,
            }),
            queryLayers: layer.queryable ? [layer.name] : [],
        };
    }
    let layerNames = [];
    let opacities = [];
    const queryLayers = [];
    layer.sublayers.forEach((sublayer) => {
        collectWMSSublayerParams(sublayer, layerNames, opacities, queryLayers);
    });
    layerNames.reverse();
    opacities.reverse();
    if (layer.drawingOrder && layer.drawingOrder.length > 0) {
        const indices = layer.drawingOrder
            .map((iter) => layerNames.indexOf(iter))
            .filter((idx) => idx >= 0);
        layerNames = indices.map((idx) => layerNames[idx]);
        opacities = indices.map((idx) => opacities[idx]);
    }
    const newParams = assign({}, layer.params, {
        LAYERS: layerNames.join(','),
        OPACITIES: opacities.join(','),
        MAP: query.map || query.MAP,
    });
    return {
        params: newParams,
        queryLayers,
    };
};

export const addUUIDs = (group, usedUUIDs = new Set()) => {
    const localGroup = group;
    localGroup.uuid =
        !localGroup.uuid || usedUUIDs.has(localGroup.uuid)
            ? uuid.v4()
            : localGroup.uuid;
    usedUUIDs.add(group.uuid);
    if (!isEmpty(localGroup.sublayers)) {
        assign(localGroup, { sublayers: localGroup.sublayers.slice(0) });
        for (let i = 0; i < localGroup.sublayers.length; i += 1) {
            localGroup.sublayers[i] = { ...localGroup.sublayers[i] };
            addUUIDs(localGroup.sublayers[i], usedUUIDs);
        }
    }
};

export const buildWMSLayerUrlParam = (layers) => {
    const layernames = [];
    const opacities = [];
    const visibilities = [];
    const queryable = [];
    layers.forEach((layer) => {
        if (layer.role === LayerRole.THEME) {
            collectWMSSublayerParams(
                layer,
                layernames,
                opacities,
                queryable,
                visibilities
            );
        } else if (
            layer.role === LayerRole.USERLAYER &&
            (layer.type === 'wms' || layer.type === 'wfs')
        ) {
            layernames.push(`${layer.type}:${layer.url}#${layer.name}`);
            opacities.push(layer.opacity);
            visibilities.push(layer.visibility);
        } else if (
            layer.role === LayerRole.USERLAYER &&
            layer.type === 'separator'
        ) {
            layernames.push(`sep:${layer.title}`);
            opacities.push(255);
            visibilities.push(true);
        }
    });
    const result = layernames.map((layername, idx) => {
        let param = layername;
        if (opacities[idx] < 255) {
            param += `[${100 - Math.round((opacities[idx] / 255) * 100)}]`;
        }
        if (!visibilities[idx]) {
            param += '!';
        }
        return param;
    });
    if (getConfigProp('urlReverseLayerOrder')) {
        result.reverse();
    }
    return result.join(',');
};

export const splitLayerUrlParam = (entry) => {
    // eslint-disable-next-line no-useless-escape
    const nameOpacityPattern = /([^\[]+)\[(\d+)]/;
    const id = uuid.v4();
    let type = 'theme';
    let theUrl = null;
    let opacity = 255;
    let visibility = true;
    let localEntry = entry;
    if (localEntry.endsWith('!')) {
        visibility = false;
        localEntry = localEntry.slice(0, -1);
    }
    let name = localEntry;
    const match = nameOpacityPattern.exec(localEntry);
    if (match) {
        [name] = match;
        opacity = Math.round(255 - (parseFloat(match[2]) / 100) * 255);
    }
    if (name.search(/^w(m|f)s:/) !== -1) {
        const pos = name.lastIndexOf('#');
        type = name.slice(0, 3);
        theUrl = name.slice(4, pos);
        name = name.slice(pos + 1);
    } else if (name.startsWith('sep:')) {
        type = 'separator';
        name = name.slice(4);
    }
    return { id, type, theUrl, name, opacity, visibility };
};

export const pathEqualOrBelow = (parent, child) => {
    return isEqual(child.slice(0, parent.length), parent);
};

export const explodeLayers = (layers) => {
    // Return array with one entry for every single sublayer)
    const exploded = [];
    layers.forEach((layer) => {
        if (!isEmpty(layer.sublayers)) {
            this.explodeSublayers(layer, layer, exploded);
        } else {
            const newLayer = { ...layer };
            if (newLayer.sublayers) {
                newLayer.sublayers = [...newLayer.sublayers];
            }
            exploded.push({ layer: newLayer, path: [], sublayer: newLayer });
        }
    });
    return exploded;
};

export const explodeSublayers = (layer, parent, exploded, parentpath = []) => {
    for (let idx = 0; idx < parent.sublayers.length; idx += 1) {
        const path = [...parentpath, idx];
        if (parent.sublayers[idx].sublayers) {
            explodeSublayers(layer, parent.sublayers[idx], exploded, path);
        } else {
            // Reduced layer with one single sublayer per level, up to leaf
            const redLayer = { ...layer };
            let group = redLayer;
            path.forEach((localIdx) => {
                group.sublayers = [{ ...group.sublayers[localIdx] }];
                [group] = group.sublayers;
            });
            exploded.push({ layer: redLayer, path, sublayer: group });
        }
    }
};

export const ensureMutuallyExclusive = (group) => {
    const localGroup = group;
    if (localGroup.sublayers) {
        let visibleChild = null;
        localGroup.sublayers.forEach((child) => {
            const localChild = child;
            if (!visibleChild && child.visibility) {
                visibleChild = child;
            } else if (localGroup.mutuallyExclusive && visibleChild) {
                localChild.visibility = false;
            }
            ensureMutuallyExclusive(child);
        });
        if (localGroup.mutuallyExclusive && !visibleChild) {
            localGroup.sublayers[0].visibility = true;
        }
    }
};

export const implodeLayers = (exploded, swipeActive = false) => {
    const newlayers = [];
    const usedLayerUUids = new Set();

    // If swipe is active, keep first layer separate
    let swipeLayer = null;
    if (swipeActive && exploded.length > 0) {
        swipeLayer = exploded.shift().layer;
        addUUIDs(swipeLayer, usedLayerUUids);
    }
    // Merge all possible items of an exploded layer array
    exploded.forEach((entry) => {
        const { layer } = entry;

        // Attempt to merge with previous if possible
        let target =
            newlayers.length > 0 ? newlayers[newlayers.length - 1] : null;
        let source = layer;
        if (target && target.sublayers && target.id === layer.id) {
            let innertarget = target.sublayers[target.sublayers.length - 1];
            let innersource = source.sublayers[0]; // Exploded entries have only one entry per sublayer level
            while (
                innertarget &&
                innertarget.sublayers &&
                innertarget.name === innersource.name
            ) {
                target = innertarget;
                source = innersource;
                innertarget = target.sublayers[target.sublayers.length - 1];
                [innersource] = source.sublayers; // Exploded entries have only one entry per sublayer level
            }
            target.sublayers.push(source.sublayers[0]);
            addUUIDs(source.sublayers[0], usedLayerUUids);
        } else {
            newlayers.push(layer);
            addUUIDs(layer, usedLayerUUids);
        }
    });
    // Ensure mutually exclusive groups have exactly one visible layer
    newlayers.forEach((layer) => {
        ensureMutuallyExclusive(layer);
    });
    newlayers.forEach((layer) => {
        if (layer.type === 'wms') {
            assign(layer, buildWMSLayerParams(layer));
        }
    });
    if (swipeLayer) {
        newlayers.unshift(swipeLayer);
    }
    return newlayers;
};

export const insertLayer = (layers, newlayer, beforeattr, beforeval) => {
    const exploded = explodeLayers(layers);
    const explodedAdd = explodeLayers([newlayer]);
    const index = exploded.findIndex(
        (entry) => entry.sublayer[beforeattr] === beforeval
    );
    if (index !== -1) {
        exploded.splice(index, 0, ...explodedAdd);
    }
    return implodeLayers(exploded);
};

export const getSublayerNames = (layer) => {
    return [layer.name].concat(
        (layer.sublayers || []).reduce((list, sublayer) => {
            return list.concat([...this.getSublayerNames(sublayer)]);
        }, [])
    );
};

export const mergeSubLayers = (baselayer, addlayer, swipeActive = false) => {
    const localAddlayer = { ...baselayer, sublayers: addlayer.sublayers };
    addUUIDs(localAddlayer);
    if (isEmpty(localAddlayer.sublayers)) {
        return { ...baselayer };
    }
    if (isEmpty(baselayer.sublayers)) {
        return localAddlayer;
    }
    const explodedBase = explodeLayers([baselayer]);
    const existing = explodedBase.map((entry) => entry.sublayer.name);
    let explodedAdd = explodeLayers([localAddlayer]);
    explodedAdd = explodedAdd.filter(
        (entry) => !existing.includes(entry.sublayer.name)
    );
    return implodeLayers(explodedAdd.concat(explodedBase), swipeActive)[0];
};

export const searchSubLayer = (layer, attr, value, path = []) => {
    if (layer.sublayers) {
        let idx = 0;
        // eslint-disable-next-line consistent-return
        layer.sublayers.forEach((sublayer) => {
            const match =
                sublayer[attr] === value
                    ? sublayer
                    : searchSubLayer(sublayer, attr, value, path);
            if (match) {
                path.unshift(idx);
                return match;
            }
            idx += 1;
        });
    } else if (layer[attr] === value) {
        return layer;
    }
    return null;
};

export const sublayerVisible = (layer, sublayerpath) => {
    let visible = layer.visibility !== false;
    let sublayer = layer;
    // eslint-disable-next-line consistent-return
    sublayerpath.forEach((index) => {
        sublayer = sublayer.sublayers[index];
        visible = visible && sublayer.visibility !== false;
        if (!visible) {
            return false;
        }
    });
    return true;
};

export const cloneLayer = (layer, sublayerpath) => {
    const newlayer = assign({}, layer);
    let cur = newlayer;
    for (let i = 0; i < sublayerpath.length; i += 1) {
        const idx = sublayerpath[i];
        cur.sublayers = [
            ...cur.sublayers.slice(0, idx),
            assign({}, cur.sublayers[idx]),
            ...cur.sublayers.slice(idx + 1),
        ];
        cur = cur.sublayers[idx];
    }
    return { newlayer, newsublayer: cur };
};

export const collectGroupLayers = (layer, parentGroups, groupLayers) => {
    const localGroup = groupLayers;
    if (!isEmpty(layer.sublayers)) {
        layer.sublayers.forEach((sublayer) => {
            collectGroupLayers(
                sublayer,
                parentGroups.concat(layer.name),
                localGroup
            );
        });
    } else {
        parentGroups.forEach((group) => {
            localGroup[group] = (localGroup[group] || []).concat(layer.name);
        });
    }
};

export const replaceLayerGroups = (layerConfigs, layer) => {
    const groupLayers = {};
    collectGroupLayers(layer, [], groupLayers);
    const newLayerConfigs = [];
    layerConfigs.forEach((layerConfig) => {
        if (layerConfig.name in groupLayers) {
            newLayerConfigs.push(
                ...groupLayers[layerConfig.name].map((name) => ({
                    ...layerConfig,
                    name,
                }))
            );
        } else {
            newLayerConfigs.push(layerConfig);
        }
    });
    return newLayerConfigs;
};

export const createSeparatorLayer = (title) => {
    return explodeLayers([
        {
            type: 'separator',
            title,
            role: LayerRole.USERLAYER,
            uuid: uuid.v4(),
            id: uuid.v4(),
        },
    ]);
};

export const createExternalLayerPlaceholder = (
    layerConfig,
    externalLayers,
    id
) => {
    const localExternal = externalLayers;
    const key = `${layerConfig.type}:${layerConfig.url}`;
    (localExternal[key] = localExternal[key] || []).push({
        id,
        name: layerConfig.name,
        opacity: layerConfig.opacity,
        visibility: layerConfig.visibility,
    });
    return explodeLayers([
        {
            id,
            type: 'placeholder',
            title: layerConfig.name,
            role: LayerRole.USERLAYER,
            loading: true,
            uuid: uuid.v4(),
        },
    ]);
};

export const insertPermalinkLayers = (exploded, layers) => {
    const allLayers = layers || [];
    allLayers.forEach((layer) => {
        const insLayer = explodeLayers([layer])[0];
        delete insLayer.layer.pos;
        exploded.splice(layer.pos, 0, insLayer);
    });
};

export const insertSeparator = (
    layers,
    title,
    beforelayerId,
    beforesublayerpath,
    swipeActive
) => {
    // Extract foreground layers
    const fglayers = layers.filter(
        (layer) => layer.role !== LayerRole.BACKGROUND
    );
    // Explode layers (one entry for every single sublayer)
    const exploded = explodeLayers(fglayers);
    // Remove matching entries
    const pos = exploded.findIndex(
        (entry) =>
            entry.layer.id === beforelayerId &&
            isEqual(beforesublayerpath, entry.path)
    );
    if (pos !== -1) {
        // Add separator
        exploded.splice(pos, 0, createSeparatorLayer(title)[0]);
    }
    // Re-assemble layers (if swipe is active, keep first sublayer separate)
    const newlayers = implodeLayers(exploded, swipeActive);
    newlayers.forEach((layer) => {
        if (layer.type === 'wms') {
            assign(layer, buildWMSLayerParams(layer));
        }
    });
    // Re-add background layers
    return [
        ...newlayers,
        ...layers.filter((layer) => layer.role === LayerRole.BACKGROUND),
    ];
};

export const reorderLayer = (
    layers,
    movelayer,
    sublayerpath,
    delta,
    swipeActive,
    preventSplittingGroups
) => {
    let localDelta = delta;
    // Extract foreground layers
    const fglayers = layers.filter(
        (layer) => layer.role !== LayerRole.BACKGROUND
    );
    // Explode layers (one entry for every single sublayer)
    const exploded = explodeLayers(fglayers);
    // Find entry to move
    if (movelayer) {
        const indices = exploded.reduce((result, entry, index) => {
            if (
                entry.layer.uuid === movelayer.uuid &&
                pathEqualOrBelow(sublayerpath, entry.path)
            ) {
                return [...result, index];
            }
            return result;
        }, []);
        if (isEmpty(indices)) {
            return layers;
        }
        indices.sort((a, b) => a - b);
        if (
            (localDelta < 0 && indices[0] <= 0) ||
            (localDelta > 0 &&
                indices[indices.length - 1] >= exploded.length - 1)
        ) {
            return layers;
        }
        if (preventSplittingGroups) {
            // Prevent moving an entry out of a containing group
            const idx =
                localDelta < 0 ? indices[0] : indices[indices.length - 1];
            if (
                !isEqual(
                    exploded[idx + localDelta].path.slice(
                        0,
                        sublayerpath.length - 1
                    ),
                    sublayerpath.slice(0, -1)
                )
            ) {
                return layers;
            }
            // Avoid splitting sibling groups when reordering
            if (
                !isEqual(
                    exploded[idx + localDelta].path.slice(0, -1),
                    sublayerpath.slice(0, -1)
                )
            ) {
                // Find next slot
                const level = sublayerpath.length;
                const siblinggrouppath = exploded[idx + localDelta].path.slice(
                    0,
                    level
                );
                siblinggrouppath[siblinggrouppath.length - 1] += localDelta;
                while (
                    idx + localDelta >= 0 &&
                    idx + localDelta < exploded.length &&
                    !isEqual(
                        exploded[idx + localDelta].path.slice(0, level),
                        siblinggrouppath
                    )
                ) {
                    localDelta += localDelta > 0 ? 1 : -1;
                }
                // The above logic adds the number of items to skip to the delta which is already -1 or +1, so we need to decrease delta by one accordingly
                if (Math.abs(localDelta) > 1) {
                    localDelta += localDelta > 0 ? -1 : 1;
                }
                if (
                    idx + localDelta < 0 ||
                    idx + localDelta >= exploded.length
                ) {
                    return layers;
                }
            }
        }
        // Reorder layer
        if (localDelta < 0) {
            indices.forEach((idx) => {
                exploded.splice(
                    idx + localDelta,
                    0,
                    exploded.splice(idx, 1)[0]
                );
            });
        } else {
            indices.reverse().forEach((idx) => {
                exploded.splice(
                    idx + localDelta,
                    0,
                    exploded.splice(idx, 1)[0]
                );
            });
        }
    }
    // Re-assemble layers (if swipe is active, keep first sublayer separate)
    const newlayers = implodeLayers(exploded, swipeActive);
    // Re-add background layers
    return [
        ...newlayers,
        ...layers.filter((layer) => layer.role === LayerRole.BACKGROUND),
    ];
};

export const removeLayer = (layers, layer, sublayerpath, swipeActive) => {
    // Extract foreground layers
    const fglayers = layers.filter(
        (localLayer) => localLayer.role !== LayerRole.BACKGROUND
    );
    // Explode layers (one entry for every single sublayer)
    let exploded = explodeLayers(fglayers);
    // Remove matching entries
    exploded = exploded.filter(
        (entry) =>
            entry.layer.uuid !== layer.uuid ||
            !pathEqualOrBelow(sublayerpath, entry.path)
    );
    // Re-assemble layers (if swipe is active, keep first sublayer separate)
    const newlayers = implodeLayers(exploded, swipeActive);

    newlayers.forEach((localLayer) => {
        if (localLayer.type === 'wms') {
            assign(localLayer, buildWMSLayerParams(localLayer));
        }
    });
    // Ensure theme layer is never removed
    if (!newlayers.find((localLayer) => localLayer.role === LayerRole.THEME)) {
        const oldThemeLayer = layers.find(
            (localLayer) => localLayer.role === LayerRole.THEME
        );
        if (oldThemeLayer) {
            const newThemeLayer = assign({}, oldThemeLayer, { sublayers: [] });
            assign(newThemeLayer, buildWMSLayerParams(newThemeLayer));
            newlayers.push(newThemeLayer);
        }
    }
    // Re-add background layers
    return [
        ...newlayers,
        ...layers.filter(
            (localLayer) => localLayer.role === LayerRole.BACKGROUND
        ),
    ];
};

export const restoreLayerParams = (
    themeLayer,
    layerConfigs,
    permalinkLayers,
    externalLayers
) => {
    let exploded = explodeLayers([themeLayer]);
    // Restore theme layer configuration
    exploded.forEach((entry) => {
        const thisLayer = entry;
        const layerConfig = layerConfigs.find(
            (layer) =>
                layer.type === 'theme' && layer.name === entry.sublayer.name
        );
        if (layerConfig) {
            thisLayer.sublayer.opacity = layerConfig.opacity;
            thisLayer.sublayer.visibility = layerConfig.visibility;
        } else {
            thisLayer.sublayer.visibility = false;
        }
    });

    // Create placeholders for external layers to be added in front
    let external = [];
    layerConfigs.forEach((layerConfig) => {
        if (layerConfig.type === 'separator') {
            // No point restoring separators
        } else if (layerConfig.type !== 'theme') {
            external = external.concat(
                createExternalLayerPlaceholder(
                    layerConfig,
                    externalLayers,
                    layerConfig.id
                )
            );
        }
    });

    exploded = [...external, ...exploded];
    insertPermalinkLayers(exploded, permalinkLayers);
    return implodeLayers(exploded);
};

export const restoreOrderedLayerParams = (
    themeLayer,
    layerConfigs,
    permalinkLayers,
    externalLayers
) => {
    const exploded = explodeLayers([themeLayer]);
    let reordered = [];
    // Iterate over layer configs and reorder items accordingly, create external layer placeholders as necessary
    layerConfigs.forEach((layerConfig) => {
        if (layerConfig.type === 'theme') {
            const entry = exploded.find(
                (localEntry) => localEntry.sublayer.name === layerConfig.name
            );
            if (entry) {
                entry.sublayer.opacity = layerConfig.opacity;
                entry.sublayer.visibility = layerConfig.visibility;
                reordered.push(entry);
            }
        } else if (layerConfig.type === 'separator') {
            reordered = reordered.concat(
                createSeparatorLayer(layerConfig.name)
            );
        } else {
            reordered = reordered.concat(
                createExternalLayerPlaceholder(
                    layerConfig,
                    externalLayers,
                    layerConfig.id
                )
            );
        }
    });
    insertPermalinkLayers(reordered, permalinkLayers);
    return implodeLayers(reordered);
};
