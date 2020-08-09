import assign from 'object-assign';
import * as ConfigProvider from '../ConfigProvider';
import { getBrowserProperties } from '../Config';

// eslint-disable-next-line import/prefer-default-export
export const getLayerConfig = (layer, options) => {
    const providers = ConfigProvider;
    const parts = layer.split('.');
    const providerName = parts[0];
    const variantName = parts[1];
    if (!providers[providerName]) {
        throw Error(`No such provider (${providerName})`);
    }
    let provider = {
        url: providers[providerName].url,
        options: providers[providerName].options,
    };
    // overwrite values in provider from variant.
    if (variantName && 'variants' in providers[providerName]) {
        if (!(variantName in providers[providerName].variants)) {
            throw Error(`No such variant of ${providerName} (${variantName})`);
        }
        const variant = providers[providerName].variants[variantName];
        let variantOptions;
        if (typeof variant === 'string') {
            variantOptions = {
                variant,
            };
        } else {
            variantOptions = variant.options;
        }
        provider = {
            url: variant.url || provider.url,
            options: assign({}, provider.options, variantOptions),
        };
    } else if (typeof provider.url === 'function') {
        provider.url = provider.url(
            parts.splice(1, parts.length - 1).join('.')
        );
    }

    const forceHTTP =
        window.location.protocol === 'file:' || provider.options.forceHTTP;
    if (provider.url.indexOf('//') === 0 && forceHTTP) {
        provider.url = `http:${provider.url}`;
    }
    // If retina option is set
    if (provider.options.retina) {
        // Check retina screen
        if (options.detectRetina && getBrowserProperties().retina) {
            // The retina option will be active now
            // But we need to prevent Leaflet retina mode
            options.detectRetina = false; // eslint-disable-line no-param-reassign
        } else {
            // No retina, remove option
            provider.options.retina = '';
        }
    }

    // replace attribution placeholders with their values from toplevel provider attribution,
    // recursively
    const attributionReplacer = (attr) => {
        if (attr.indexOf('{attribution.') === -1) {
            return attr;
        }
        return attr.replace(
            /\{attribution.(\w*)\}/,
            (match, attributionName) => {
                return attributionReplacer(
                    providers[attributionName].options.attribution
                );
            }
        );
    };
    provider.options.attribution = attributionReplacer(
        provider.options.attribution
    );

    // Compute final options combining provider options with any user overrides
    const layerOpts = assign({}, provider.options, options);
    return [provider.url, layerOpts];
};
