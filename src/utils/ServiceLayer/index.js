/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import WMSCapabilities from 'ol/format/WMSCapabilities';
import assign from 'object-assign';
import axios from 'axios';
import deepmerge from 'deepmerge';
import { isEmpty } from 'lodash';
import fastXmlParser from 'fast-xml-parser';
import randomColor from 'randomcolor';
import { searchSubLayer } from '../Layer';
import { LayerRole } from '../../actions/layers';

// const owsNS = 'http://www.opengis.net/ows';
// const xlinkNS = 'http://www.w3.org/1999/xlink';

function strcmp(a, b) {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    if (al < bl) {
        return -1;
    }
    if (al > bl) {
        return 1;
    }
    return 0;
}

function array(obj) {
    return Array.isArray(obj) ? obj : [obj];
}

const ServiceLayerUtils = {
    getDCPTypes(dcpTypes) {
        let result = {};
        dcpTypes.forEach((dcpType) => {
            result = deepmerge(result, dcpType);
        });
        return result;
    },
    getWMSLayers(capabilitiesXml, asGroup = false) {
        const wmsFormat = new WMSCapabilities();
        const capabilities = wmsFormat.read(capabilitiesXml);
        let infoFormats = null;
        try {
            infoFormats = capabilities.Capability.Request.GetFeatureInfo.Format;
        } catch (e) {
            infoFormats = ['text/plain'];
        }
        let topLayer = null;
        let serviceUrl = null;
        try {
            topLayer = capabilities.Capability.Layer;
            serviceUrl = ServiceLayerUtils.getDCPTypes(
                capabilities.Capability.Request.GetMap.DCPType
            ).HTTP.Get.OnlineResource;
        } catch (e) {
            return [];
        }
        let featureInfoUrl = null;
        try {
            featureInfoUrl = ServiceLayerUtils.getDCPTypes(
                capabilities.Capability.Request.GetFeatureInfo.DCPType
            ).HTTP.Get.OnlineResource;
        } catch (e) {
            featureInfoUrl = serviceUrl;
        }
        const { version } = capabilities;
        if (!topLayer.Layer || asGroup) {
            return [
                this.getWMSLayerParams(
                    topLayer,
                    topLayer.CRS,
                    serviceUrl,
                    version,
                    featureInfoUrl,
                    infoFormats
                ),
            ].filter((entry) => entry);
        }
        const entries = topLayer.Layer.map((layer) =>
            this.getWMSLayerParams(
                layer,
                topLayer.CRS,
                serviceUrl,
                version,
                featureInfoUrl,
                infoFormats
            )
        ).filter((entry) => entry);
        return entries.sort((a, b) => strcmp(a.title, b.title));
    },
    getWMSLayerParams(
        layer,
        parentCrs,
        serviceUrl,
        version,
        featureInfoUrl,
        infoFormats
    ) {
        let supportedCrs = layer.CRS;
        if (isEmpty(supportedCrs)) {
            supportedCrs = [...parentCrs];
        } else {
            supportedCrs = [...parentCrs, ...supportedCrs];
        }
        let sublayers = [];
        if (!isEmpty(layer.Layer)) {
            sublayers = layer.Layer.map((sublayer) =>
                this.getWMSLayerParams(
                    sublayer,
                    supportedCrs,
                    serviceUrl,
                    version,
                    featureInfoUrl,
                    infoFormats
                )
            ).filter((entry) => entry);
        }
        if (isEmpty(layer.BoundingBox)) {
            return null;
        }
        const bbox = {
            crs: layer.BoundingBox[0].crs,
            bounds: layer.BoundingBox[0].extent,
        };
        let legendUrl = null;
        try {
            legendUrl = layer.Style[0].LegendURL[0].OnlineResource;
        } catch (e) {
            // pass
        }
        return {
            type: 'wms',
            name: layer.Name,
            title: layer.Title,
            abstract: layer.Abstract,
            attribution: layer.Attribution,
            legendUrl,
            url: serviceUrl,
            version,
            infoFormats,
            featureInfoUrl,
            queryable: layer.queryable,
            sublayers: isEmpty(sublayers) ? null : sublayers,
            expanded: false,
            boundingBox: bbox,
            visibility: true,
            opacity: 255,
            external: true,
            minScale: layer.MinScaleDenominator,
            maxScale: layer.MaxScaleDenominator,
        };
    },
    getWFSLayers(capabilitiesXml) {
        const options = {
            attrPrefix: '',
            ignoreNonTextNodeAttr: false,
            ignoreTextNodeAttr: false,
            textNodeConversion: true,
            textAttrConversion: true,
            ignoreNameSpace: true,
        };
        const capabilities = fastXmlParser.convertToJson(
            fastXmlParser.getTraversalObj(capabilitiesXml, options)
        );
        if (
            !capabilities ||
            !capabilities.WFS_Capabilities ||
            !capabilities.WFS_Capabilities.version
        ) {
            return [];
        }
        if (capabilities.WFS_Capabilities.version < '1.1.0') {
            return ServiceLayerUtils.getWFS10Layers(
                capabilities.WFS_Capabilities
            );
        }
        return ServiceLayerUtils.getWFS11_20Layers(
            capabilities.WFS_Capabilities
        );
    },
    getWFS10Layers(capabilities) {
        let serviceUrl = null;
        const { version } = capabilities;
        let formats = null;
        try {
            serviceUrl = ServiceLayerUtils.getDCPTypes(
                array(capabilities.Capability.Request.GetFeature.DCPType)
            ).HTTP.Get.onlineResource;
            formats = Object.keys(
                capabilities.Capability.Request.GetFeature.ResultFormat
            );
        } catch (e) {
            return [];
        }

        const layers = [];
        array(capabilities.FeatureTypeList.FeatureType).forEach(
            (featureType) => {
                let name;
                let bbox;
                try {
                    name = featureType.Name;
                    const llbbox = featureType.LatLongBoundingBox;
                    bbox = {
                        crs: featureType.SRS,
                        bounds: [
                            llbbox.minx,
                            llbbox.miny,
                            llbbox.maxx,
                            llbbox.maxy,
                        ],
                    };
                } catch (e) {
                    return; // Name and bbox are required
                }
                const title = featureType.Title || name;
                const abstract = featureType.Abstract || '';

                layers.push({
                    type: 'wfs',
                    name,
                    title,
                    abstract,
                    boundingBox: bbox,
                    url: serviceUrl,
                    version,
                    formats,
                    color: randomColor(),
                    visibility: true,
                });
            }
        );

        return layers;
    },
    getWFS11_20Layers(capabilities) {
        let serviceUrl = null;
        const { version } = capabilities;
        let formats = null;
        try {
            const getFeatureOp = array(
                capabilities.OperationsMetadata.Operation
            ).find((el) => el.name === 'GetFeature');
            serviceUrl = ServiceLayerUtils.getDCPTypes(array(getFeatureOp.DCP))
                .HTTP.Get.href;
            const outputFormat = array(getFeatureOp.Parameter).find(
                (el) => el.name === 'outputFormat'
            );
            formats = outputFormat.AllowedValues
                ? outputFormat.AllowedValues.Value
                : outputFormat.Value;
        } catch (e) {
            return [];
        }

        const layers = [];
        array(capabilities.FeatureTypeList.FeatureType).forEach(
            (featureType) => {
                let name;
                let bbox;
                try {
                    name = featureType.Name;
                    const lc = featureType.WGS84BoundingBox.LowerCorner.split(
                        /\s+/
                    );
                    const uc = featureType.WGS84BoundingBox.UpperCorner.split(
                        /\s+/
                    );
                    bbox = {
                        crs: 'EPSG:4326',
                        bounds: [lc[0], lc[1], uc[0], uc[1]],
                    };
                } catch (e) {
                    return; // Name and bbox are required
                }
                const title = featureType.Title || name;
                const abstract = featureType.Abstract || '';

                layers.push({
                    type: 'wfs',
                    name,
                    title,
                    abstract,
                    bbox,
                    url: serviceUrl,
                    version,
                    formats,
                    color: randomColor(),
                    visibility: true,
                });
            }
        );
        return layers;
    },
    findLayers(type, serviceUrl, layerConfigs, callback) {
        // Scan the capabilities of the specified service for the specified layers
        let url = serviceUrl.replace(/\?$/, '');
        if (url.includes('?')) {
            url += `&service=${type.toUpperCase()}&request=GetCapabilities`;
        } else {
            url += `?service=${type.toUpperCase()}&request=GetCapabilities`;
        }
        axios
            .get(url)
            .then((response) => {
                layerConfigs.forEach((layerConfig) => {
                    let result = null;
                    if (type === 'wms') {
                        result = ServiceLayerUtils.getWMSLayers(response.data);
                    } else if (type === 'wfs') {
                        result = ServiceLayerUtils.getWFSLayers(response.data);
                    }
                    let layer = searchSubLayer(
                        { sublayers: result },
                        'name',
                        layerConfig.name
                    );
                    // const source = `${type}:${serviceUrl}#${layerConfig.name}`;
                    if (layer) {
                        layer = assign({}, layer, {
                            id: layerConfig.id,
                            opacity: layerConfig.opacity,
                            visibility: layerConfig.visibility,
                            role: LayerRole.USERLAYER,
                            sublayers: null,
                        });
                        callback(layerConfig.id, layer);
                    } else {
                        // eslint-disable-next-line no-console
                        console.warn(
                            `Could not find layer ${layerConfig.name}`
                        );
                        callback(layerConfig.id, null);
                    }
                });
            })
            .catch(() => {
                // eslint-disable-next-line no-console
                console.warn(`Failed to read ${serviceUrl}`);
                layerConfigs.forEach((layerConfig) => {
                    const source = `${type}:${serviceUrl}#${layerConfig.name}`;
                    callback(source, null);
                });
            });
    },
};

module.exports = ServiceLayerUtils;
