/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assign from 'object-assign';
import uuid from 'uuid';
import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';
import KML, { getDefaultImageStyle } from 'ol/format/KML';
import Style from 'ol/style/Style';
import { isEmpty } from 'lodash';
import { stringify } from 'wellknown';
import { reproject } from '../Coordinates';
import { getConfigProp } from '../Config';

export const createSld = (
    geometrytype,
    styleName,
    styleOptions,
    layerOpacity,
    dpi = 96,
    scaleFactor = 1.0
) => {
    let opts = {};
    // Special cases
    if (styleName === 'text') {
        // Make geometry transparent
        opts = {
            strokeColor: [0, 0, 0, 0],
            fillColor: [0, 0, 0, 0],
        };
    } else if (styleName === 'marker') {
        opts = {
            strokeColor: [0, 0, 255, 1],
            strokeWidth: 4,
            fillColor: [255, 255, 255, 1],
            circleRadius: 6,
        };
    } else {
        // Default style
        opts = assign({}, getConfigProp('defaultFeatureStyle'), styleOptions);
    }
    const dpiScale = (dpi / 96) * scaleFactor;

    const ensureHex = (rgb) =>
        !Array.isArray(rgb)
            ? rgb
            : `#${(0x1000000 + (rgb[2] | (rgb[1] << 8) | (rgb[0] << 16))) // eslint-disable-line no-bitwise
                  .toString(16)
                  .slice(1)}`;

    const opacity = (rgb) => {
        if (Array.isArray(rgb)) {
            if (rgb[3] === undefined) {
                return layerOpacity / 255;
            }
            return (rgb[3] * layerOpacity) / 255;
        }
        return layerOpacity / 255;
    };

    const stroke =
        // eslint-disable-next-line no-useless-concat
        `${'<se:Stroke>' + '<se:SvgParameter name="stroke">'}${ensureHex(
            opts.strokeColor
        )}</se:SvgParameter>` +
        `<se:SvgParameter name="stroke-opacity">${opacity(
            opts.strokeColor
        )}</se:SvgParameter>` +
        `<se:SvgParameter name="stroke-width">${
            opts.strokeWidth * dpiScale
        }</se:SvgParameter>` +
        `<se:SvgParameter name="stroke-linejoin">bevel</se:SvgParameter>${
            !isEmpty(opts.strokeDash)
                ? `<CssParameter name="stroke-dasharray">${opts.strokeDash.join(
                      ' '
                  )}</CssParameter>`
                : ''
        }</se:Stroke>`;
    const fill =
        // eslint-disable-next-line no-useless-concat
        `${'<se:Fill>' + '<se:SvgParameter name="fill">'}${ensureHex(
            opts.fillColor
        )}</se:SvgParameter>` +
        `<se:SvgParameter name="fill-opacity">${opacity(
            opts.fillColor
        )}</se:SvgParameter>` +
        `</se:Fill>`;

    let rule = null;
    if (geometrytype === 'Point') {
        rule =
            `${
                '<se:PointSymbolizer>' +
                '<se:Graphic>' +
                '<se:Mark>' +
                '<se:WellKnownName>circle</se:WellKnownName>' +
                '<se:Stroke>' +
                '<se:SvgParameter name="stroke">'
            }${ensureHex(opts.strokeColor)}</se:SvgParameter>` +
            `<se:SvgParameter name="stroke-opacity">${opacity(
                opts.strokeColor
            )}</se:SvgParameter>` +
            `<se:SvgParameter name="stroke-width">${
                opts.strokeWidth * dpiScale
            }</se:SvgParameter>` +
            `</se:Stroke>${fill}</se:Mark>` +
            `<se:Size>${2 * opts.circleRadius * dpiScale}</se:Size>` +
            `</se:Graphic>` +
            `</se:PointSymbolizer>`;
    } else if (geometrytype === 'LineString') {
        rule = `<se:LineSymbolizer>${stroke}</se:LineSymbolizer>`;
    } else if (geometrytype === 'Polygon') {
        rule = `<se:PolygonSymbolizer>${stroke}${fill}</se:PolygonSymbolizer>`;
    }
    if (rule) {
        return (
            `${
                '<?xml version="1.0" encoding="UTF-8"?>' +
                '<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd" xmlns:se="http://www.opengis.net/se">' +
                '<UserStyle>' +
                '<se:FeatureTypeStyle>' +
                '<se:Rule>'
            }${rule}</se:Rule>` +
            `</se:FeatureTypeStyle>` +
            `</UserStyle>` +
            `</StyledLayerDescriptor>`
        );
    }
    return null;
};

export const reprojectGeometry = (geometry, srccrs, dstcrs) => {
    if (srccrs === dstcrs) {
        return geometry;
    }
    if (geometry.type === 'Point') {
        const wgscoo = reproject(geometry.coordinates, srccrs, dstcrs);
        return {
            type: geometry.type,
            coordinates: wgscoo,
        };
    }
    if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
        return {
            type: geometry.type,
            coordinates: geometry.coordinates.map((tuple) => {
                return reproject(tuple, srccrs, dstcrs);
            }),
        };
    }
    if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
        return {
            type: geometry.type,
            coordinates: geometry.coordinates.map((ring) => {
                return ring.map((tuple) => {
                    return reproject(tuple, srccrs, dstcrs);
                });
            }),
        };
    }
    if (geometry.type === 'MultiPolygon') {
        return {
            type: geometry.type,
            coordinates: geometry.coordinates.map((part) => {
                return part.map((ring) => {
                    return ring.map((tuple) => {
                        return reproject(tuple, srccrs, dstcrs);
                    });
                });
            }),
        };
    }
    return geometry;
};

export const geoJSONToWkt = (geometry) => {
    return stringify(geometry);
};

export const wktToGeoJSON = (wkt, srccrs, dstcrs, id = uuid.v1()) => {
    const localWkt = wkt
        .replace(/Point(\w+)/i, 'Point $1')
        .replace(/LineString(\w+)/i, 'LineString $1')
        .replace(/Polygon(\w+)/i, 'Polygon $1')
        .replace(/MultiSurface(\w*)/i, 'GeometryCollection $1');
    try {
        const feature = new WKT().readFeature(localWkt, {
            dataProjection: srccrs,
            featureProjection: dstcrs,
        });
        const featureObj = new GeoJSON().writeFeatureObject(feature);
        featureObj.id = id;
        return featureObj;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to parse geometry: ${localWkt}`);
        return null;
    }
};

export const kmlToGeoJSON = (kml) => {
    const kmlFormat = new KML({ defaultStyle: [new Style()] });
    const geojsonFormat = new GeoJSON();
    const features = [];
    let fid = 0;
    kmlFormat.readFeatures(kml).forEach((olFeature) => {
        let style = olFeature.getStyleFunction()(olFeature);
        style = style[0] || style;

        const styleOptions = {
            strokeColor: style.getStroke()
                ? style.getStroke().getColor()
                : '#000000',
            strokeWidth: style.getStroke() ? style.getStroke().getWidth() : 1,
            strokeDash: style.getStroke()
                ? style.getStroke().getLineDash()
                : [],
            fillColor: style.getFill() ? style.getFill().getColor() : '#FFFFFF',
            textFill:
                style.getText() && style.getText().getFill()
                    ? style.getText().getFill().getColor()
                    : 'rgba(0, 0, 0 ,0)',
            textStroke:
                style.getText() && style.getText().getStroke()
                    ? style.getText().getStroke().getColor()
                    : 'rgba(0, 0, 0, 0)',
        };
        if (
            style.getImage() &&
            style.getImage() !== getDefaultImageStyle() &&
            style.getImage().getSrc()
        ) {
            // FIXME: Uses private members of ol.style.Icon, style.getImage().getAnchor() returns null because style.getImage.getSize() is null because the the image is not yet loaded
            const anchor = style.getImage().anchor_ || [0.5, 0.5]; // eslint-disable-line no-underscore-dangle
            // eslint-disable-next-line no-underscore-dangle
            const anchorOrigin = (style.getImage().anchorOrigin_ || '').split(
                '-'
            );
            if (anchorOrigin.includes('right')) {
                anchor[0] = 1 - anchor[0];
            }
            if (anchorOrigin.includes('bottom')) {
                anchor[1] = 1 - anchor[1];
            }
            styleOptions.iconSrc = style.getImage().getSrc();
            styleOptions.iconAnchor = anchor;
        }
        let feature = geojsonFormat.writeFeatureObject(olFeature);
        feature = assign(feature, {
            styleName: styleOptions.iconSrc ? 'marker' : 'default',
            styleOptions,
            id: fid++, // eslint-disable-line no-plusplus
            crs: 'EPSG:4326',
            properties: {},
        });
        const properties = olFeature.getProperties();
        const excludedProperties = ['visibility', olFeature.getGeometryName()];
        Object.keys(properties).forEach((key) => {
            if (!excludedProperties.includes(key)) {
                feature.properties[key] = properties[key];
            }
        });
        if (properties.name && feature.styleName === 'marker') {
            feature.properties.label = properties.name;
        }
        features.push(feature);
    });
    return features;
};

export const createPrintHighlighParams = (
    layers,
    printCrs,
    dpi = 96,
    scaleFactor = 1.0
) => {
    const params = {
        geoms: [],
        styles: [],
        labels: [],
        labelFillColors: [],
        labelOultineColors: [],
        labelOutlineSizes: [],
        labelSizes: [],
    };
    const defaultFeatureStyle = getConfigProp('defaultFeatureStyle');

    const ensureHex = (rgb) =>
        !Array.isArray(rgb)
            ? rgb
            : `#${(0x1000000 + (rgb[2] | (rgb[1] << 8) | (rgb[0] << 16))) // eslint-disable-line no-bitwise
                  .toString(16)
                  .slice(1)}`;
    layers
        .slice(0)
        .reverse()
        .forEach((layer) => {
            if (
                layer.type !== 'vector' ||
                (layer.features || []).length === 0 ||
                layer.visibility === false
            ) {
                return;
            }
            layer.features.forEach((feature) => {
                if (!feature.geometry) {
                    return;
                }
                let geometry = reprojectGeometry(
                    feature.geometry,
                    feature.crs || printCrs,
                    printCrs
                );
                params.styles.push(
                    createSld(
                        geometry.type,
                        feature.styleName,
                        feature.styleOptions,
                        layer.opacity,
                        dpi,
                        scaleFactor
                    )
                );
                params.labels.push(
                    (feature.properties && feature.properties.label) || ' '
                );
                if (feature.styleName === 'text') {
                    // Make point a tiny square, so that QGIS server centers the text inside the polygon when labelling
                    const x = geometry.coordinates[0];
                    const y = geometry.coordinates[1];
                    geometry = {
                        type: 'Polygon',
                        coordinates: [
                            [
                                [x - 0.00001, y - 0.00001],
                                [x + 0.00001, y - 0.00001],
                                [x + 0.00001, y + 0.00001],
                                [x - 0.00001, y + 0.00001],
                                [x - 0.00001, y - 0.00001],
                            ],
                        ],
                    };
                    params.geoms.push(geoJSONToWkt(geometry));
                    params.labelFillColors.push(
                        ensureHex(feature.styleOptions.fillColor)
                    );
                    params.labelOultineColors.push(
                        ensureHex(feature.styleOptions.strokeColor)
                    );
                    params.labelOutlineSizes.push(scaleFactor);
                    params.labelSizes.push(
                        10 * feature.styleOptions.strokeWidth * scaleFactor
                    );
                } else {
                    params.geoms.push(geoJSONToWkt(geometry));
                    params.labelFillColors.push(defaultFeatureStyle.textFill);
                    params.labelOultineColors.push(
                        defaultFeatureStyle.textStroke
                    );
                    params.labelOutlineSizes.push(scaleFactor);
                    params.labelSizes.push(10 * scaleFactor);
                }
            });
        });
    return params;
};
