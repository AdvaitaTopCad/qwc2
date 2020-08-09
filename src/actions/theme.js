/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import isEmpty from 'lodash.isempty';
import { setIdentifyEnabled } from './identify';
import ConfigUtils from '../utils/Config';
import CoordinatesUtils from '../utils/Coordinates';
import MapUtils from '../utils/Map';
import LayerUtils from '../utils/Layer';
import ServiceLayerUtils from '../utils/ServiceLayer';
import ThemeUtils from '../utils/Theme';
import {
    LayerRole,
    addLayer,
    removeLayer,
    removeAllLayers,
    replacePlaceholderLayer,
    setSwipe,
} from './layers';
import { configureMap } from './map';

export const THEMES_LOADED = 'THEMES_LOADED';
export const SET_THEME_LAYERS_LIST = 'SET_THEME_LAYERS_LIST';
export const SET_CURRENT_THEME = 'SET_CURRENT_THEME';
export const SWITCHING_THEME = 'SWITCHING_THEME';

export function themesLoaded(themes) {
    return {
        type: THEMES_LOADED,
        themes,
    };
}

export function setThemeLayersList(theme) {
    return {
        type: SET_THEME_LAYERS_LIST,
        themelist: theme,
    };
}

export function finishThemeSetup(
    dispatch,
    theme,
    themes,
    layerConfigs,
    insertPos,
    permalinkLayers,
    externalLayerRestorer
) {
    // Create layer
    const themeLayer = ThemeUtils.createThemeLayer(theme, themes);
    let layers = [themeLayer];

    // Restore theme layer configuration, create placeholders for missing layers
    const externalLayers = {};
    if (layerConfigs) {
        if (
            ConfigUtils.getConfigProp('allowReorderingLayers', theme) !== true
        ) {
            layers = LayerUtils.restoreLayerParams(
                themeLayer,
                layerConfigs,
                permalinkLayers,
                externalLayers
            );
        } else {
            layers = LayerUtils.restoreOrderedLayerParams(
                themeLayer,
                layerConfigs,
                permalinkLayers,
                externalLayers
            );
        }
    }

    layers.reverse().forEach((layer) => {
        dispatch(addLayer(layer, insertPos));
    });

    // Restore external layers
    if (externalLayerRestorer) {
        externalLayerRestorer(externalLayers, themes, (source, layer) => {
            dispatch(replacePlaceholderLayer(source, layer));
        });
    } else {
        Object.keys(externalLayers).forEach((key) => {
            const service = key.slice(0, 3);
            const serviceUrl = key.slice(4);
            ServiceLayerUtils.findLayers(
                service,
                serviceUrl,
                externalLayers[key],
                (id, layer) => {
                    dispatch(replacePlaceholderLayer(id, layer));
                }
            );
        });
    }

    dispatch({
        type: SET_CURRENT_THEME,
        theme,
        layer: themeLayer.id,
    });
    dispatch(setIdentifyEnabled(true));
    dispatch({
        type: SWITCHING_THEME,
        switching: false,
    });
}

export function setCurrentTheme(
    theme,
    themes,
    preserve = true,
    initialView = null,
    layerParams = null,
    visibleBgLayer = null,
    permalinkLayers = null,
    themeLayerRestorer = null,
    externalLayerRestorer = null
) {
    let finalVisibleBgLayer = visibleBgLayer;
    let finalTheme = theme;
    let finalInitialView = initialView;
    return (dispatch, getState) => {
        dispatch({
            type: SWITCHING_THEME,
            switching: true,
        });

        // Get current background layer if it needs to be preserved
        if (
            preserve &&
            finalVisibleBgLayer === null &&
            ConfigUtils.getConfigProp(
                'preserveBackgroundOnThemeSwitch',
                finalTheme
            ) === true
        ) {
            const curBgLayer = getState().layers.flat.find(
                (layer) =>
                    layer.role === LayerRole.BACKGROUND &&
                    layer.visibility === true
            );
            finalVisibleBgLayer = curBgLayer ? curBgLayer.name : null;
        }

        // Remove old layers
        let insertPos = 0;
        if (
            preserve &&
            ConfigUtils.getConfigProp(
                'preserveNonThemeLayersOnThemeSwitch',
                finalTheme
            ) === true
        ) {
            // Compute insertion position of new theme layers by counting how many non-theme layers remain
            insertPos = getState().layers.flat.filter(
                (layer) => layer.role === LayerRole.USERLAYER
            ).length;

            const removeLayers = getState()
                .layers.flat.filter(
                    (layer) => layer.role !== LayerRole.USERLAYER
                )
                .map((layer) => layer.id);
            removeLayers.forEach((layerId) => {
                dispatch(removeLayer(layerId));
            });
        } else {
            dispatch(removeAllLayers());
        }
        dispatch(setSwipe(undefined));
        if (!finalTheme) {
            dispatch({
                type: SWITCHING_THEME,
                switching: false,
            });
            return;
        }

        // Preserve extent if desired and possible
        if (
            preserve &&
            !finalInitialView &&
            getState().map.projection === finalTheme.mapCrs
        ) {
            if (
                ConfigUtils.getConfigProp(
                    'preserveExtentOnThemeSwitch',
                    finalTheme
                ) === true
            ) {
                // If theme bbox (b1) includes current bbox (b2), keep current extent
                const b1 = CoordinatesUtils.reprojectBbox(
                    finalTheme.bbox.bounds,
                    finalTheme.bbox.crs,
                    getState().map.projection
                );
                const b2 = getState().map.bbox.bounds;
                if (
                    b2[0] >= b1[0] &&
                    b2[1] >= b1[1] &&
                    b2[2] <= b1[2] &&
                    b2[3] <= b1[3]
                ) {
                    // theme bbox (b1) includes current bbox (b2)
                    finalInitialView = {
                        bounds: getState().map.bbox.bounds,
                        crs: getState().map.projection,
                    };
                }
            } else if (
                ConfigUtils.getConfigProp(
                    'preserveExtentOnThemeSwitch',
                    finalTheme
                ) === 'force'
            ) {
                finalInitialView = {
                    bounds: getState().map.bbox.bounds,
                    crs: getState().map.projection,
                };
            }
        }

        // Inherit defaults if necessary
        finalTheme = assign({}, finalTheme, {
            version: finalTheme.version || themes.defaultWMSVersion || '1.3.0',
            scales:
                finalTheme.scales ||
                themes.defaultScales ||
                MapUtils.getGoogleMercatorScales(0, 21),
            printScales:
                finalTheme.printScales ||
                themes.defaultPrintScales ||
                undefined,
            printResolutions:
                finalTheme.printResolutions ||
                themes.defaultPrintResolutions ||
                undefined,
            printGrid:
                finalTheme.printGrid || themes.defaultPrintGrid || undefined,
        });

        // Reconfigure map
        dispatch(
            configureMap(
                finalTheme.mapCrs,
                finalTheme.scales,
                finalInitialView || finalTheme.initialBbox
            )
        );

        // Add background layers for theme
        ThemeUtils.createThemeBackgroundLayers(
            finalTheme,
            themes,
            finalVisibleBgLayer
        ).forEach((bgLayer) => {
            dispatch(addLayer(bgLayer));
        });

        let layerConfigs = layerParams
            ? layerParams.map((param) => LayerUtils.splitLayerUrlParam(param))
            : null;

        if (layerConfigs) {
            layerConfigs = LayerUtils.replaceLayerGroups(
                layerConfigs,
                finalTheme
            );
        }

        // Restore missing theme layers
        let missingThemeLayers = null;
        if (layerConfigs) {
            const layerNames = LayerUtils.getSublayerNames(finalTheme);
            missingThemeLayers = layerConfigs.reduce((missing, layerConfig) => {
                if (
                    layerConfig.type === 'theme' &&
                    !layerNames.includes(layerConfig.name)
                ) {
                    return { ...missing, [layerConfig.name]: layerConfig };
                }
                return missing;
            }, {});
        }
        if (themeLayerRestorer && !isEmpty(missingThemeLayers)) {
            themeLayerRestorer(
                Object.keys(missingThemeLayers),
                finalTheme,
                (newLayers, newLayerNames) => {
                    const newTheme = LayerUtils.mergeSubLayers(finalTheme, {
                        sublayers: newLayers,
                    });
                    if (newLayerNames) {
                        layerConfigs = layerConfigs.reduce(
                            (res, layerConfig) => {
                                if (layerConfig.name in newLayerNames) {
                                    return [
                                        ...res,
                                        ...newLayerNames[layerConfig.name].map(
                                            (name) => ({
                                                ...layerConfig,
                                                name,
                                            })
                                        ),
                                    ];
                                }
                                return [...res, layerConfig];
                            },
                            []
                        );
                    }
                    finishThemeSetup(
                        dispatch,
                        newTheme,
                        themes,
                        layerConfigs,
                        insertPos,
                        permalinkLayers,
                        externalLayerRestorer
                    );
                }
            );
        } else {
            finishThemeSetup(
                dispatch,
                finalTheme,
                themes,
                layerConfigs,
                insertPos,
                permalinkLayers,
                externalLayerRestorer
            );
        }
    };
}

export function restoreDefaultTheme() {
    return (dispatch, getState) => {
        const { themes } = getState().theme;
        dispatch(
            setCurrentTheme(
                ThemeUtils.getThemeById(themes, themes.defaultTheme),
                themes,
                false
            )
        );
    };
}
