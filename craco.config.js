module.exports = {
    webpack: {
        configure: (config) => {
            config.optimization.minimize = false;
            config.devtool = 'source-map';
            return config;
        },
    },
};
